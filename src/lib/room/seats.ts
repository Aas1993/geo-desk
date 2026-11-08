import type { B } from "../case/core";
import { ARCH_AGENTS } from "../case/architect";
import { SEATS as CASE_SEATS } from "../case/seats";
import { DAGENTS } from "../deep/council";
import { AGENTS as FALCON } from "../falcon/council";
import { SAGENTS } from "../machiavelli/council";
import { EMB_AGENTS, EMB_CHIEF } from "../desk/embassy";
import { KING_AGENTS, KING_CHAIR } from "../desk/king";
import { MOFA_AGENTS, MOFA_CHIEF } from "../desk/mofa";
import { AUDITORS } from "../review/pair";

// THE ROOM: every multi-agent council on the platform as one table: who sits at it, what each seat does, and what state each seat is in. The seats come from the same rosters the councils run on, so the picture cannot drift from the platform.
// State is live on a council's own page during a run (its agents report as they work) and, everywhere else, read from what this browser holds: a seat whose work is in a saved product is "done", the rest are "idle". Nothing here starts a paid run.
export type SeatState = "idle" | "wait" | "run" | "done" | "error" | "skipped";
export type SeatKind = "agent" | "chair" | "auditor";
export type Seat = { id: string; code: string; en: string; ar: string; kind: SeatKind; state: SeatState; note?: string };
export type CouncilSpec = { id: string; en: string; ar: string; href: string; about: B; chair: { id: string; en: string; ar: string } | null; agents: { id: string; code: string; en: string; ar: string }[]; auditors: boolean; saved: "king-council" | "emb-intel" | "emb-plan" | "mofa-council" | "council" | "architect" | null };
const b = (en: string, ar: string): B => ({ en, ar });
const ids = (r: { id: string; en: string; ar: string }[], pre: string) => r.map((a, i) => ({ id: a.id, code: `${pre}${i + 1}`, en: a.en, ar: a.ar }));
export const COUNCILS: CouncilSpec[] = [
  { id: "king", en: "THE KING's Council", ar: "مجلس القرار النهائي", href: "/king", about: b("Decides the course for the head of state, with a Decision Chair and both auditors.", "يحدد المسار لرئيس الدولة، برئيس للقرار ومدققَين."), chair: KING_CHAIR, agents: KING_AGENTS.map((a) => ({ id: a.id, code: `K${a.n}`, en: a.en, ar: a.ar })), auditors: true, saved: "king-council" },
  { id: "mofa", en: "The Ministry's Council", ar: "مجلس الوزارة", href: "/mofa", about: b("Thinks as the Ministry of Foreign Affairs: priorities, goals, mission tasks and plans for each country.", "يفكر كوزارة الخارجية: الأولويات والأهداف ومهام البعثة وخططها لكل دولة."), chair: MOFA_CHIEF, agents: MOFA_AGENTS.map((a) => ({ id: a.id, code: `M${a.n}`, en: a.en, ar: a.ar })), auditors: true, saved: "mofa-council" },
  { id: "emb-intel", en: "Embassy intelligence", ar: "استخبارات السفارة", href: "/ambassador", about: b("The ambassador's country team reads the country: power, partners, investment plays, scenarios.", "فريق السفير يقرأ الدولة: القوة والشركاء وفرص الاستثمار والسيناريوهات."), chair: EMB_CHIEF, agents: EMB_AGENTS.map((a) => ({ id: a.id, code: `E${a.n}`, en: a.en, ar: a.ar })), auditors: true, saved: "emb-intel" },
  { id: "emb-plan", en: "Mission strategy and plans", ar: "استراتيجية البعثة وخططها", href: "/ambassador", about: b("The same desks turn the Ministry's priorities into the mission's strategy and plans.", "المكاتب نفسها تحوّل أولويات الوزارة إلى استراتيجية البعثة وخططها."), chair: EMB_CHIEF, agents: EMB_AGENTS.map((a) => ({ id: a.id, code: `E${a.n}`, en: a.en, ar: a.ar })), auditors: true, saved: "emb-plan" },
  { id: "case", en: "Strategic Council", ar: "المجلس الاستراتيجي", href: "/case", about: b("The Case File's council: seats from every field, a debate, an adversarial review and the Chair's decision.", "مجلس ملف الحالة: مقاعد من كل ميدان ومناظرة ومراجعة خصومية وقرار الرئيس."), chair: null, agents: ids(CASE_SEATS as never, "C"), auditors: true, saved: "council" },
  { id: "architect", en: "Statecraft Architect", ar: "مهندس فن الحكم", href: "/case", about: b("Writes the country strategy in parts, then the deliverables and dashboard.", "يكتب استراتيجية الدولة على أجزاء ثم المخرجات واللوحة."), chair: null, agents: ARCH_AGENTS.filter((a) => a.stage < 3).map((a, i) => ({ id: a.id, code: `A${i + 1}`, en: a.en, ar: a.ar })), auditors: true, saved: "architect" },
  { id: "falcon", en: "Falcon Council", ar: "مجلس الصقر", href: "/falcon", about: b("Security and hard power at policy level: analysts, a verifier and a red team.", "الأمن والقوة الصلبة على مستوى السياسات: محللون ومدقق وفريق أحمر."), chair: null, agents: ids(FALCON as never, "F"), auditors: true, saved: null },
  { id: "machiavelli", en: "Machiavellian council", ar: "المجلس الميكيافيلي", href: "/machiavelli", about: b("Influence and leverage, lawful and open: seats, a challenger and a verifier.", "التأثير والنفوذ المشروعان والمعلنان: مقاعد ومعارِض ومدقق."), chair: null, agents: ids(SAGENTS as never, "S"), auditors: true, saved: null },
  { id: "deep", en: "Deep Intelligence team", ar: "فريق الاستخبارات المعمّقة", href: "/deep", about: b("Specialist analysts chosen by routing, a challenger, a verifier and a chair.", "محللون مختصون يختارهم التوجيه ومعارِض ومدقق ورئيس."), chair: null, agents: ids(DAGENTS as never, "D"), auditors: true, saved: null },
];
export const COUNCIL_BY = new Map(COUNCILS.map((c) => [c.id, c]));
/** The seats of a council as a table: the chair first, then the agents, then the two auditors. `done` says which seats already have work in a saved product; `live` is the run in progress (call id to status), with `groupOf` mapping an agent to the sitting that carries it. */
export function seatsOf(c: CouncilSpec, o: { done?: (agentId: string) => boolean; live?: { id: string; status: "wait" | "run" | "done" | "skipped" | "error" }[]; groupOf?: (agentId: string) => string | null; chairDone?: boolean; auditorsDone?: boolean }): Seat[] {
  const live = new Map((o.live ?? []).map((x) => [x.id, x.status])); const running = live.size > 0; const out: Seat[] = [];
  const st = (callId: string | null, saved: boolean): SeatState => { const s = callId ? live.get(callId) : undefined; if (s) return s; return running ? "wait" : saved ? "done" : "idle"; };
  if (c.chair) out.push({ id: c.chair.id, code: "★", en: c.chair.en, ar: c.chair.ar, kind: "chair", state: st(c.chair.id, !!o.chairDone) });
  for (const a of c.agents) { const g = o.groupOf?.(a.id) ?? a.id; out.push({ id: a.id, code: a.code, en: a.en, ar: a.ar, kind: "agent", state: st(g, !!o.done?.(a.id)) }); }
  if (c.auditors) for (const a of AUDITORS) out.push({ id: a.id, code: a.lens === "statecraft" ? "S✓" : "R✓", en: a.en, ar: a.ar, kind: "auditor", state: st(a.id, !!o.auditorsDone) });
  return out;
}
export const STATE_COLOR: Record<SeatState, string> = { idle: "var(--line2)", wait: "var(--t2)", run: "var(--accent)", done: "var(--ok)", error: "var(--risk)", skipped: "var(--warn)" };
export const STATE_LABEL: Record<SeatState, B> = { idle: b("not run", "لم يُشغَّل"), wait: b("waiting", "في الانتظار"), run: b("working", "يعمل"), done: b("done", "أنجز"), error: b("failed", "تعذّر"), skipped: b("skipped", "تُخطِّي") };
export const seatCounts = (seats: Seat[]) => ({ total: seats.length, done: seats.filter((s) => s.state === "done").length, run: seats.filter((s) => s.state === "run").length, error: seats.filter((s) => s.state === "error").length });
