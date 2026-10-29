"use client";
import Link from "next/link";
import { Bot } from "lucide-react";
import { useT } from "@/lib/store";
import { DEPTS } from "@/lib/agent/catalog";
import { Block, Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { AskPanel } from "./AskPanel";

/** THE DESK AGENT: your own agent in a tab of its own. Ask it anything about the platform, a country or a task, in your own words and in the format you need; it works out which departments should do the work (the three desks, the councils, the country brief, the free data), shows you the plan and its cost, runs it when you click, and writes the answer from the statecraft and geopolitical angle. */
export function AgentApp() {
  const { lang } = useT(); const L = lang as Lang; const t = useTr(L);
  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-4 px-1 pb-10">
      <header className="space-y-2"><h1 className="display flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-t0"><span className="grid size-10 place-items-center rounded-[12px] bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]"><Bot size={22} aria-hidden /></span>{t("Desk agent", "وكيل المكتب")}</h1>
        <p className="text-[13px] font-medium text-t0">{t("Your own agent for the whole platform. Ask a question, give it a task or a directive about any country or about the platform itself, and say what form you want the answer in. The agent decides which departments are best placed to work on it, tells you the plan and what it will cost, and runs it only when you click.", "وكيلك الخاص للمنصة كلها. اسأل أو كلّفه بمهمة أو توجيه عن أي دولة أو عن المنصة نفسها، وقل بأي صيغة تريد الإجابة. يقرر الوكيل أي الإدارات أنسب للعمل عليها ويعرض عليك الخطة وكلفتها ولا ينفذها إلا بنقرتك.")}</p></header>
      <AskPanel L={L} storageKey="gd-agent-last" />
      <Block title={t("Who the agent can send work to", "إلى من يوجّه الوكيل العمل")} hint={t("Each answer names the departments that worked on it and links to their tabs. Every one keeps its own ceiling, auditors and limits.", "تذكر كل إجابة الإدارات التي عملت عليها وتربط بتبويباتها. وتحتفظ كل إدارة بسقفها ومدققيها وحدودها.")}>
        <ul className="grid gap-2 md:grid-cols-2">{DEPTS.map((d) => <li key={d.id} className="rounded-[12px] border border-line bg-bg2 p-3"><div className="flex flex-wrap items-center gap-2"><Link href={d.href} className="text-[13px] font-semibold text-t0 hover:text-accent">{L === "ar" ? d.ar : d.en}</Link><Pill c={d.kind === "directive" ? "var(--accent)" : d.kind === "council" ? "var(--c2)" : d.kind === "country" ? "var(--ok)" : "var(--t2)"}>{d.kind === "directive" ? t("desk", "مكتب") : d.kind === "council" ? t("council", "مجلس") : d.kind === "country" ? t("country brief", "موجز الدولة") : d.kind === "data" ? t("free data", "بيانات مجانية") : t("guide", "دليل")}</Pill><span className="numt ms-auto text-[11px] text-t2">{d.est ? `~US$${d.est.toFixed(2)}` : t("free", "مجاني")}</span></div><p className="mt-1 text-[12px] leading-snug text-t1" dir="auto">{L === "ar" ? d.expertise.ar : d.expertise.en}</p></li>)}</ul></Block>
    </div>
  );
}
