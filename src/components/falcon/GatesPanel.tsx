"use client";
import { useMemo } from "react";
import { gateScore, qualityGates, type GateKind } from "@/lib/falcon/gates";
import { Panel } from "../VisualBrief";
import { Pill, type Lang } from "./bits";

const ST = { pass: { c: "var(--ok)", en: "Pass", ar: "اجتاز", i: "✓" }, warn: { c: "var(--warn)", en: "Check", ar: "راجع", i: "▲" }, fail: { c: "var(--risk)", en: "Fail", ar: "أخفق", i: "✗" } } as const;
/** The automated quality gates of a finished product: what a reader cannot see at a glance, with a plain statement that passing them is necessary but does not make a product verified. */
export function GatesPanel({ md, kind, L, iso3 }: { md: string; kind: GateKind; L: Lang; iso3: string }) {
  const gates = useMemo(() => { let rt = false; try { rt = !!localStorage.getItem(`gd-rt:${iso3}`); } catch { /* storage unavailable */ } return qualityGates(md, kind, { redTeamed: rt }); }, [md, kind, iso3]); const s = gateScore(gates);
  return (
    <Panel title={L === "ar" ? "بوابات الجودة الآلية" : "Automated quality gates"}>
      <div className="mb-2.5 flex flex-wrap gap-2"><Pill c="var(--ok)">{s.pass} {ST.pass[L]}</Pill>{s.warn > 0 && <Pill c="var(--warn)">{s.warn} {ST.warn[L]}</Pill>}{s.fail > 0 && <Pill c="var(--risk)">{s.fail} {ST.fail[L]}</Pill>}</div>
      <ul className="grid gap-1.5 md:grid-cols-2">{gates.map((g) => <li key={g.id} className="flex items-start gap-2 rounded-[10px] bg-bg2 p-2 text-[11.5px] leading-snug"><span aria-label={ST[g.status][L]} className="mt-0.5 w-4 shrink-0 text-center font-bold" style={{ color: ST[g.status].c }}>{ST[g.status].i}</span><span className="min-w-0"><b className="text-t0">{L === "ar" ? g.ar : g.en}</b><span className="block text-t1">{g.detail}</span></span></li>)}</ul>
      <p className="mt-2 text-[10.5px] leading-snug text-t2">{L === "ar" ? "تلتقط هذه الفحوص أخطاء لا يراها القارئ من النظرة الأولى. اجتيازها شرط لازم لا كافٍ: لا يصير المنتج «موثّقًا» لمجرد اجتيازها، ويبقى القرار للمراجع البشري." : "These checks catch what a reader cannot see at a glance. Passing them is necessary, not sufficient: a product is not verified because it passes, and a human reviewer decides."}</p>
    </Panel>
  );
}
