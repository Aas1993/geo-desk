import Anthropic from "@anthropic-ai/sdk";
import { isAuthError, isNoCredit, resolveModel, upstreamMessage } from "@/lib/llm";
import { renderFacts } from "@/lib/ask/facts";
import { rejectCrossSite, safeMessage } from "@/lib/guard";
import { maxRunUsd } from "@/lib/dossier/cost";
import { EFFORTS, type Effort, type Source, type Usage } from "@/lib/dossier/run";
import { caseFacts } from "@/lib/case/facts";
import { loadCase } from "@/lib/case/load";
import { loadResearch } from "@/lib/deep/research";
import { loadSnapshot } from "@/lib/deep/snapshot";
import { deskExtraFacts } from "@/lib/desk/context";
import { BIRD_SYSTEM, briefHash } from "@/lib/bird/audit";
import { BIRD_AUDITORS, SUBJECTS } from "@/lib/review/pair";
import { runAuditors } from "@/lib/review/run";

export const maxDuration = 300;
const MODEL = resolveModel(process.env.DOSSIER_MODEL || "claude-sonnet-5-5");
const ENV_EFFORT = (EFFORTS as readonly string[]).includes(process.env.DOSSIER_EFFORT ?? "") ? (process.env.DOSSIER_EFFORT as Effort) : null;
const CAP = maxRunUsd(process.env.DOSSIER_MAX_RUN_USD); const MAX_PER_HOUR = Math.max(1, +(process.env.BIRD_AUDIT_MAX_PER_HOUR ?? 12) || 12); const TTL = 6 * 3600_000;
const g = globalThis as unknown as { __gdBird?: { runs: number[]; running: Set<string>; cache: Map<string, unknown> } }; const st = (g.__gdBird ??= { runs: [], running: new Set<string>(), cache: new Map() });
/** The independent audit of the Bird's Eye brief: three auditors (statecraft, reality, consistency) read the brief, a digest of the products it consolidates and the evidence on file, and may red-flag it. Click-started, under the US$1.00 ceiling (about US$0.25), served from cache for six hours. */
export async function POST(req: Request) {
  if (process.env.DOSSIER_ENABLED === "0") return Response.json({ error: "disabled" }, { status: 403 });
  const bad = rejectCrossSite(req); if (bad) return bad;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>; const iso3 = String(b.iso3 ?? "").toUpperCase(); const lang: "en" | "ar" = b.lang === "ar" ? "ar" : "en"; const brief = typeof b.brief === "string" ? b.brief.slice(0, 14_000) : ""; const digest = typeof b.digest === "string" ? b.digest.slice(0, 14_000) : "";
  if (!/^[A-Z]{3}$/.test(iso3) || iso3 === "ARE" || brief.length < 300) return Response.json({ error: "bad_request", message: "A country and a brief are needed." }, { status: 400 });
  const key = `bird:${iso3}:${lang}:${briefHash(brief + digest)}`; const enc = new TextEncoder(); const refresh = b.refresh === true;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Record<string, unknown>) => { try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); } catch {} }; const finish = () => { try { controller.close(); } catch {} };
      let owned = false;
      try {
        const hit = st.cache.get(key) as { at: string } | undefined; if (hit && !refresh && Date.now() - Date.parse(hit.at) < TTL) { send({ type: "done", cached: true, ...hit }); return finish(); }
        if (st.running.has(key)) { send({ type: "error", error: "busy", message: "This brief is already being audited." }); return finish(); }
        st.runs = st.runs.filter((t) => Date.now() - t < 3600_000); if (st.runs.length >= MAX_PER_HOUR) { send({ type: "error", error: "limit", message: `Limit of ${MAX_PER_HOUR} audits per hour reached (BIRD_AUDIT_MAX_PER_HOUR). Cached audits are still free.` }); return finish(); }
        st.running.add(key); st.runs.push(Date.now()); owned = true; const ac = new AbortController(); req.signal.addEventListener("abort", () => ac.abort()); if (req.signal.aborted) ac.abort();
        send({ type: "status", text: "Collecting the evidence on file…" });
        const [c, snap, res] = await Promise.all([loadCase(iso3), loadSnapshot(iso3).catch(() => null), loadResearch(iso3).catch(() => null)]); if (!c) { send({ type: "error", error: "not_found", message: "Unknown country." }); return finish(); }
        const gathered = await caseFacts(iso3, c, snap, res?.pubs ?? []); if (!gathered) { send({ type: "error", error: "thin", message: "Not enough data on this yet." }); return finish(); } for (const x of deskExtraFacts(c)) gathered.facts.push({ id: `F${gathered.facts.length + 1}`, kind: x.kind, text: x.text, src: x.src });
        const base = `<facts country="${gathered.name}" as_of="${new Date().toISOString()}">\n${renderFacts(gathered.facts, gathered.gaps)}\n</facts>\n\n<request>\nProduct: audit of the Bird's Eye brief for ${gathered.name}.\nWrite the review in ${lang === "ar" ? "Arabic (keep figures, fact ids, names of institutions and JSON keys exact; keep the heading, the tag names and the verdict, standing and severity words in English as instructed, because software reads them)" : "English"}.\n</request>`;
        send({ type: "roster", agents: BIRD_AUDITORS.map((a) => ({ id: a.id, name: lang === "ar" ? a.ar : a.en, stage: 0, searches: a.searches })) });
        const sources: Source[] = []; const total: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, searches: 0, fetches: 0, usd: 0 };
        const { outs, spent } = await runAuditors({ auditors: BIRD_AUDITORS, limit: 34_000, client: new Anthropic(), model: MODEL, system: BIRD_SYSTEM, firstText: base, subject: SUBJECTS.bird, product: `${brief}\n\n---\n# SOURCE DIGEST (the products the brief was built from; analysis, not evidence)\n${digest || "(none supplied)"}`, lang, cap: CAP, spent: 0, signal: ac.signal, send, label: "bird-audit", effort: ENV_EFFORT ?? "low", sources, total });
        const report = outs.map((x) => x.text).filter(Boolean).join("\n\n"); const done = { report, agents: outs.map((x) => ({ ...x, text: "" })), sources, usage: total, at: new Date().toISOString(), model: MODEL, name: gathered.name, usd: spent };
        if (outs.some((x) => x.status === "done")) { st.cache.set(key, done); while (st.cache.size > 30) st.cache.delete(st.cache.keys().next().value as string); } else { const i = st.runs.pop(); void i; }
        send({ type: "done", cached: false, ...done });
      } catch (e) { if (req.signal.aborted) return finish(); console.error("[bird-audit] failed:", e instanceof Error ? e.message : e); const nocredit = isNoCredit(e); send({ type: "error", error: nocredit ? "no_credits" : e instanceof Anthropic.AuthenticationError || isAuthError(e) ? "no_credentials" : e instanceof Anthropic.RateLimitError ? "rate" : "upstream", message: upstreamMessage(e, safeMessage) }); }
      finally { if (owned) st.running.delete(key); finish(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" } });
}
