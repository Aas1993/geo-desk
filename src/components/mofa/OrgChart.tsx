"use client";
import Link from "next/link";
import { ORG, ORG_BY, TIER_LABEL, childrenOf, type OrgNode } from "@/lib/mofa/org";
import { MOFA_BY } from "@/lib/desk/mofa";
import { STATE_COLOR, STATE_LABEL, type SeatState } from "@/lib/room/seats";
import type { Lang } from "../falcon/bits";
import { useTr } from "../case/bits";

// The Ministry as an infographic: the Minister at the head, the Ministers of State and the Minister's Office, the Under-Secretary, the sectors with their departments, and the missions abroad. Every role that a council agent thinks from carries a ring that shows what that agent is doing for the chosen country (not run, working, done) and a progress bar of the goals set under it in the tracker.
export type NodeLive = { state: SeatState; progress: number | null; goals: number };
const line = "mx-auto h-4 w-px bg-line2";
function Card({ n, L, live, selected, onSelect, small }: { n: OrgNode; L: Lang; live?: NodeLive; selected: boolean; onSelect: (id: string) => void; small?: boolean }) {
  const t = useTr(L); const st = live?.state ?? "idle"; const c = n.agent ? STATE_COLOR[st] : "var(--line2)"; const a = n.agent ? MOFA_BY.get(n.agent) : null; const code = a ? `M${a.n}` : n.agent === "chief" ? "US" : null;
  return (
    <button type="button" onClick={() => onSelect(n.id)} aria-pressed={selected} className={`relative w-full rounded-[12px] border bg-bg1 text-start transition-colors hover:bg-bg2 ${small ? "p-2" : "p-2.5"} ${selected ? "border-t0" : "border-line"}`} style={{ borderTopWidth: 3, borderTopColor: c }}>
      <span className="flex items-start gap-1.5"><b className={`min-w-0 flex-1 leading-snug text-t0 ${small ? "text-[11.5px]" : "text-[12.5px]"}`} dir="auto">{L === "ar" ? n.ar : n.en}</b>{n.key && <span title={t("A key role", "دور رئيسي")} aria-label={t("key role", "دور رئيسي")} className="shrink-0 text-[11px] text-warn">★</span>}</span>
      {code && <span className="mt-1 flex items-center gap-1.5 text-[10.5px] text-t2"><span aria-hidden className={`inline-block size-2.5 shrink-0 rounded-full border-2 ${st === "run" ? "motion-safe:animate-pulse" : ""}`} style={{ borderColor: c, background: st === "done" ? c : "transparent" }} /><span className="truncate">{code} · {L === "ar" ? STATE_LABEL[st].ar : STATE_LABEL[st].en}</span></span>}
      {live && live.progress != null && live.goals > 0 && <span className="mt-1.5 block" aria-label={`${Math.round(live.progress * 100)}%`}><span className="block h-1.5 overflow-hidden rounded-full bg-bg3"><span className="block h-full rounded-full bg-ok" style={{ width: `${Math.round(live.progress * 100)}%` }} /></span><span className="numt text-[10px] text-t2">{live.goals} {t("goals", "هدفًا")} · {Math.round(live.progress * 100)}%</span></span>}
    </button>
  );
}
export function OrgChart({ L, live, selected, onSelect }: { L: Lang; live: (n: OrgNode) => NodeLive; selected: string | null; onSelect: (id: string | null) => void }) {
  const t = useTr(L); const min = ORG_BY.get("min")!; const top = childrenOf("min").filter((x) => x.tier === 1); const usec = ORG_BY.get("usec")!; const sectors = ORG.filter((x) => x.tier === 3); const mission = ORG_BY.get("amb")!;
  const pick = (id: string) => onSelect(selected === id ? null : id);
  const row = (label: string, body: React.ReactNode) => <div><p className="label mb-1.5 text-center">{label}</p>{body}</div>;
  return (
    <div className="rounded-[14px] border border-line bg-bg1 p-3 sm:p-4" role="group" aria-label={t("Ministry of Foreign Affairs organisation chart", "الهيكل التنظيمي لوزارة الخارجية")}>
      <div className="mx-auto max-w-xs">{row(L === "ar" ? TIER_LABEL[0].ar : TIER_LABEL[0].en, <Card n={min} L={L} live={live(min)} selected={selected === min.id} onSelect={pick} />)}</div>
      <div className={line} />
      <div className="mx-auto h-px w-[72%] bg-line2" />
      <div className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-3">{top.map((n) => <div key={n.id}><div className={line} /><Card n={n} L={L} live={live(n)} selected={selected === n.id} onSelect={pick} /></div>)}</div>
      <div className={line} />
      <div className="mx-auto max-w-xs">{row(L === "ar" ? TIER_LABEL[2].ar : TIER_LABEL[2].en, <Card n={usec} L={L} live={live(usec)} selected={selected === usec.id} onSelect={pick} />)}</div>
      <div className={line} />
      <div className="mx-auto h-px w-[92%] bg-line2" />
      <p className="label mb-1.5 mt-3 text-center">{L === "ar" ? TIER_LABEL[3].ar : TIER_LABEL[3].en}</p>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {sectors.map((n) => { const kids = childrenOf(n.id); return (
          <div key={n.id} className="space-y-1.5"><div className={line} /><Card n={n} L={L} live={live(n)} selected={selected === n.id} onSelect={pick} />{kids.length > 0 && <div className="space-y-1 border-s-2 border-line2 ps-2">{kids.map((k) => <Card key={k.id} n={k} L={L} live={live(k)} selected={selected === k.id} onSelect={pick} small />)}</div>}</div>
        ); })}
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2"><div className="space-y-1.5"><p className="label text-center">{t("Under the Minister's Office", "تحت مكتب الوزير")}</p>{childrenOf("office").map((k) => <Card key={k.id} n={k} L={L} live={live(k)} selected={selected === k.id} onSelect={pick} small />)}</div>
        <div className="space-y-1.5"><p className="label text-center">{L === "ar" ? TIER_LABEL[5].ar : TIER_LABEL[5].en}</p><Card n={mission} L={L} live={live(mission)} selected={selected === mission.id} onSelect={pick} /><Link href="/ambassador" className="block text-center text-[11.5px] text-accent hover:underline">{t("Open the Ambassador's desks", "افتح مكاتب السفير")}</Link></div></div>
    </div>
  );
}
