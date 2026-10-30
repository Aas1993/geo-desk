"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Users, X } from "lucide-react";
import { useT } from "@/lib/store";
import { useFollowCountry } from "@/lib/country";
import { parseReviews } from "@/lib/desk/core";
import { EMB_AGENTS, embDesk } from "@/lib/desk/embassy";
import { KING_AGENTS, kingAnnex } from "@/lib/desk/king";
import { MOFA_AGENTS, mofaRole } from "@/lib/desk/mofa";
import { AUDITORS } from "@/lib/review/pair";
import { COUNCILS, seatCounts, seatsOf, type CouncilSpec } from "@/lib/room/seats";
import { regionLabel } from "@/lib/regions";
import { Block, CountryPicker, Pill, type Lang } from "../falcon/bits";
import { useCountryList } from "../falcon/hooks";
import { useStored } from "../deep/hooks";
import { useTr } from "../case/bits";
import { useFiled, type Filed } from "../desk/filed";
import { RoundTable } from "./RoundTable";

const report = (f: Filed, c: CouncilSpec): string | null => (c.saved === "king-council" ? f.king?.report : c.saved === "mofa-council" ? f.mofa?.report : c.saved === "emb-intel" ? f.intel?.report : c.saved === "emb-plan" ? f.plan?.report : c.saved === "council" ? f.council?.report : c.saved === "architect" ? f.architect?.report : null) ?? null;
const ROLES: Record<string, { en: string; ar: string }> = { statecraft: { en: "reads as a senior statecraft strategist whose only client is the UAE's long-term interest, and red-flags anything that would not serve it", ar: "يقرأ كاستراتيجي كبير في فن الحكم عميله الوحيد مصلحة الإمارات بعيدة المدى، ويرفع علمًا أحمر على ما لا يخدمها" }, reality: { en: "reads as a forensic evidence auditor, checks every consequential fact, figure and name against the evidence on file and red-flags what is invented, stale or unsourced", ar: "يقرأ كمدقق أدلة جنائي، يفحص كل حقيقة ورقم واسم مؤثر مقابل الأدلة المحفوظة ويرفع علمًا أحمر على المختلق أو القديم أو غير المسند" } };
/** THE ROOM: every council on the platform as a round table, with the two independent auditors at the foot of each. For a chosen country, a seat is filled in when its work is in a saved product in this browser. A council's own page shows the same table live while it sits. This page never starts a paid run. */
export function RoomApp() {
  const { lang } = useT(); const L = lang as Lang; const t = useTr(L); const { list, by } = useCountryList(); const [pref, setPref, ready] = useStored<{ iso: string | null }>("gd-room", { iso: null });
  const iso = pref.iso && pref.iso !== "ARE" ? pref.iso : null; const f = useFiled(iso); const pick = useCallback((i: string | null) => setPref({ iso: i }), [setPref]); const [open, setOpen] = useState<string | null>(null);
  useFollowCountry(iso, (i) => setPref((p) => ({ ...p, iso: i })), ready); // the country is shared by every page (src/lib/country.ts)
  const cards = useMemo(() => COUNCILS.map((c) => {
    const rep = report(f, c); const done = (id: string): boolean => { if (!rep) return false; if (c.saved === "king-council") { const a = KING_AGENTS.find((x) => x.id === id); return !!a && !!kingAnnex(rep, a); } if (c.saved === "mofa-council") { const a = MOFA_AGENTS.find((x) => x.id === id); return !!a && !!mofaRole(rep, a); } if (c.saved === "emb-intel" || c.saved === "emb-plan") { const a = EMB_AGENTS.find((x) => x.id === id); return !!a && !!embDesk(rep, a); } return false; };
    const reviews = rep ? parseReviews(rep).length : 0; const perSeat = c.saved === "king-council" || c.saved === "mofa-council" || c.saved === "emb-intel" || c.saved === "emb-plan";
    const seats = seatsOf(c, { done: perSeat ? done : undefined, chairDone: !!rep && perSeat, auditorsDone: reviews >= 2 }); return { c, rep, seats, reviews, perSeat };
  }), [f]);
  const sel = by.get(iso ?? ""); const total = cards.reduce((a, x) => a + x.seats.length, 0);
  return (
    <div className="space-y-4">
      <header className="space-y-2"><h1 className="display flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-t0"><span className="grid size-10 place-items-center rounded-[12px] bg-accent text-[var(--accent-ink)] shadow-[var(--glow)]"><Users size={20} /></span>{t("The Room", "غرفة الاجتماعات")}</h1>
        <p className="text-[13px] font-medium text-t0">{t("Every council on the platform at its own table: who sits at it, what each seat is for, and which seats have already worked on the chosen country. Two independent auditors sit at the foot of every table and neither writes a word of the product they check.", "كل مجلس في المنصة على طاولته: من يجلس إليها وما مهمة كل مقعد وأي المقاعد عملت فعلًا على الدولة المختارة. ويجلس مدققان مستقلان عند طرف كل طاولة ولا يكتب أي منهما حرفًا من المنتج الذي يفحصه.")}</p></header>
      <section className="rounded-[14px] border border-line bg-bg1 p-3" aria-label={t("Country", "الدولة")}><div className="flex items-end gap-3"><div className="min-w-60 flex-1"><span className="label mb-1 block">{t("Country (optional)", "الدولة (اختياري)")}</span><div className="flex items-center gap-1.5"><div className="min-w-0 flex-1"><CountryPicker list={list} value={iso} onPick={(i) => pick(i)} L={L} /></div>{iso && <button type="button" onClick={() => pick(null)} aria-label={t("Clear", "مسح")} className="grid size-9 place-items-center rounded-[8px] bg-bg3 text-t1 hover:text-t0"><X size={14} /></button>}</div></div></div>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-t1">{sel && <b className="text-[14px] text-t0">{sel.flag} {L === "ar" && sel.nameAr ? sel.nameAr : sel.name} <span className="font-normal text-t2">{regionLabel(sel.region, L)}</span></b>}<Pill c="var(--c2)">{cards.length} {t("councils", "مجالس")}</Pill><Pill c="var(--accent)">{total} {t("seats", "مقعدًا")}</Pill><Pill c="var(--warn)">{AUDITORS.length} {t("auditors at every table", "مدققان عند كل طاولة")}</Pill></p></section>
      <Block title={t("The two auditors", "المدققان المستقلان")} hint={t("Every multi-agent product is read by both before it is compiled. They can raise a red flag, which is shown first and caps the quality grade at D when it is critical.", "يقرأ كلاهما كل منتج متعدد الوكلاء قبل تجميعه. ويمكنهما رفع علم أحمر يُعرض أولًا ويُنزل تقدير الجودة إلى D إن كان حرجًا.")}>
        <ul className="grid gap-2.5 md:grid-cols-2">{AUDITORS.map((a) => <li key={a.id} className="rounded-[12px] border border-line bg-bg2 p-3 text-[12.5px] leading-snug"><b className="text-t0">{L === "ar" ? a.ar : a.en}</b><p className="mt-1 text-t1">{L === "ar" ? ROLES[a.lens].ar : ROLES[a.lens].en}.</p></li>)}</ul></Block>
      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map(({ c, rep, seats, reviews, perSeat }) => { const n = seatCounts(seats); const o = open === c.id; return (
          <section key={c.id} className="rounded-[14px] border border-line bg-bg1 p-3.5"><div className="flex flex-wrap items-start gap-2"><div className="min-w-0 flex-1"><h2 className="display text-[16px] font-semibold text-t0">{L === "ar" ? c.ar : c.en}</h2><p className="mt-0.5 text-[12px] leading-snug text-t1">{L === "ar" ? c.about.ar : c.about.en}</p></div><Link href={c.href} className="h-8 shrink-0 rounded-[8px] bg-bg3 px-3 text-[12px] leading-8 text-accent hover:text-t0">{t("Open", "افتح")}</Link></div>
            <RoundTable L={L} title={L === "ar" ? c.ar : c.en} seats={seats} compact />
            <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] text-t2">{iso ? (rep ? <Pill c="var(--ok)">{perSeat ? `${n.done}/${n.total} ${t("seats worked", "مقاعد عملت")}` : t("report on file", "تقرير محفوظ")}</Pill> : <Pill c="var(--t2)">{t("not run for this country", "لم يُشغَّل لهذه الدولة")}</Pill>) : <Pill c="var(--t2)">{t("pick a country to see its work", "اختر دولة لترى عملها")}</Pill>}{rep && <Pill c={reviews >= 2 ? "var(--ok)" : "var(--warn)"}>{reviews >= 2 ? t("both auditors reviewed", "راجعه المدققان") : t("older than the auditor pair", "أقدم من المدققَين")}</Pill>}</p>
            <button type="button" onClick={() => setOpen(o ? null : c.id)} aria-expanded={o} className="mt-1 text-[11.5px] text-accent hover:underline">{o ? t("Hide the seats", "أخفِ المقاعد") : t("Show the seats", "اعرض المقاعد")}</button>
            {o && <ul className="mt-2 grid gap-1 sm:grid-cols-2">{seats.map((s) => <li key={s.id} className="flex items-baseline gap-1.5 text-[11.5px] leading-snug"><span className="numt w-7 shrink-0 text-t2">{s.code}</span><span className="text-t0" dir="auto">{L === "ar" ? s.ar : s.en}</span></li>)}</ul>}
          </section>); })}
      </div>
      <p className="text-[11px] text-t2">{t("A council's seats are drawn from the same rosters it runs on. Falcon, Machiavellian, Deep and the Case File councils keep their work in their own pages; here they show their rosters. Seats fill in for the four desk councils from this browser's saved products; nothing here starts a paid run.", "تُرسم مقاعد كل مجلس من القوائم نفسها التي يعمل بها. وتحتفظ مجالس الصقر والميكيافيلي والاستخبارات المعمّقة وملف الحالة بعملها في صفحاتها؛ وهنا تظهر قوائمها. وتمتلئ المقاعد في مجالس المكاتب الأربعة من المنتجات المحفوظة في هذا المتصفح؛ ولا شيء هنا يبدأ تشغيلًا مدفوعًا.")}</p>
    </div>
  );
}
