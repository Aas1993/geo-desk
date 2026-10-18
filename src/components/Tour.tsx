"use client";
import { useCallback, useEffect, useState } from "react";
import { useStore, useT } from "@/lib/store";

type Step = { sel: string | null; en: [string, string]; ar: [string, string] };
const STEPS: Step[] = [
  { sel: null, en: ["Welcome to Geo Desk", "A UAE-centric world atlas: live layers, every treaty, mission and visit, trade and economic intelligence, and media attitudes. This 30-second tour shows where things are."], ar: ["مرحبًا بك في جيو ديسك", "أطلس عالمي بمحور إماراتي: طبقات مباشرة، وكل معاهدة وبعثة وزيارة، واستخبارات التجارة والاقتصاد، وتوجهات الإعلام. هذه الجولة القصيرة تريك أين كل شيء."] },
  { sel: 'input[placeholder^="Search"]', en: ["Search anything", "Countries, capitals and stocks. Press / from anywhere to jump here."], ar: ["ابحث عن أي شيء", "الدول والعواصم والأسهم. اضغط / من أي مكان للانتقال إلى هنا."] },
  { sel: '[aria-label="Layers"]', en: ["100+ layers", "Flights, hazards, sanctions, missions, trade, the UAE Partnership Index, memberships and more. Combine them freely: the URL keeps your selection so you can share it."], ar: ["أكثر من 100 طبقة", "رحلات وكوارث وعقوبات وبعثات وتجارة ومؤشر الشراكة مع الإمارات والعضويات وغيرها. اجمعها كما تشاء؛ يحفظ الرابط اختيارك لتشاركه."] },
  { sel: null, en: ["Click any country", "Its dossier opens with tabs for the UAE Partnership Index, trade and CEPA impact, agreements, flights, missions and ambassadors, visits, media attitudes and an AI visit prep pack."], ar: ["انقر على أي دولة", "يفتح ملفها بتبويبات لمؤشر الشراكة مع الإمارات والتجارة وأثر الشراكة الشاملة والاتفاقيات والرحلات والبعثات والسفراء والزيارات واتجاهات الإعلام وحزمة تحضير الزيارة."] },
  { sel: '[aria-label="Dashboard"]', en: ["Your dashboard", "Role presets (Desk Officer, UN desk, Media), a library of widgets, a watchlist and saved layouts."], ar: ["لوحتك", "قوالب حسب الدور (مسؤول المكتب، مكتب الأمم المتحدة، الإعلام) ومكتبة أدوات وقائمة متابعة وتخطيطات محفوظة."] },
  { sel: '[aria-label="Ask"]', en: ["Ask", "Natural-language questions answered only from this app's data, with every claim cited. Each new question costs about a cent or two and only runs when you click."], ar: ["اسأل", "أسئلة بلغة طبيعية تُجاب من بيانات التطبيق فقط مع توثيق كل ادعاء. كل سؤال جديد يكلف نحو سنت أو سنتين ولا يعمل إلا بضغطتك."] },
  { sel: '[aria-label="Alerts"]', en: ["Alerts", "A merged feed with a UAE radar plus unrest, disasters, diplomacy, health and cyber tabs."], ar: ["التنبيهات", "موجز موحّد برادار الإمارات وتبويبات للاضطرابات والكوارث والدبلوماسية والصحة والأمن السيبراني."] },
];
const KEY = "gd-tour-done";
const visible = (el: Element | null): el is HTMLElement => !!el && (el as HTMLElement).getClientRects().length > 0;

/** A short first-visit walkthrough that can be replayed from the map controls. Steps whose target is not on screen (for example the rail on a phone) are skipped. */
export function Tour() {
  const { lang } = useT(); const onboarded = useStore((s) => s.onboarded); const ready = useStore((s) => s.ready); const [i, setI] = useState<number | null>(null); const [rect, setRect] = useState<DOMRect | null>(null);
  const L = lang === "ar" ? { next: "التالي", back: "السابق", done: "إنهاء", skip: "تخطّي", of: "من" } : { next: "Next", back: "Back", done: "Done", skip: "Skip", of: "of" };
  const steps = STEPS; const find = useCallback((s: Step) => (s.sel ? Array.from(document.querySelectorAll(s.sel)).find(visible) ?? null : null), []);
  const close = useCallback(() => { setI(null); try { localStorage.setItem(KEY, "1"); } catch { /* storage unavailable */ } }, []);
  const go = useCallback((from: number, dir: 1 | -1) => { let n = from + dir; while (n >= 0 && n < steps.length && steps[n].sel && !find(steps[n])) n += dir; if (n < 0) return; if (n >= steps.length) close(); else setI(n); }, [steps, find, close]);
  useEffect(() => { const start = () => setI(0); window.addEventListener("gd-tour", start); return () => window.removeEventListener("gd-tour", start); }, []);
  useEffect(() => { if (!ready || !onboarded) return; let seen = false; try { seen = localStorage.getItem(KEY) === "1"; } catch { /* treat as unseen */ } if (seen) return; const t = setTimeout(() => setI(0), 2500); return () => clearTimeout(t); }, [ready, onboarded]);
  useEffect(() => { if (i == null) return; const upd = () => setRect(steps[i].sel ? find(steps[i])?.getBoundingClientRect() ?? null : null); const t = setTimeout(upd, 0); window.addEventListener("resize", upd); const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); else if (e.key === "ArrowRight") go(i, 1); else if (e.key === "ArrowLeft") go(i, -1); }; window.addEventListener("keydown", k); return () => { clearTimeout(t); window.removeEventListener("resize", upd); window.removeEventListener("keydown", k); }; }, [i, steps, find, go, close]);
  if (i == null) return null; const s = steps[i]; const [title, body] = lang === "ar" ? s.ar : s.en; const W = 320; const vw = typeof window === "undefined" ? 1200 : window.innerWidth; const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const pos = rect ? { left: Math.min(vw - W - 12, Math.max(12, rect.left + rect.width / 2 - W / 2)), top: rect.bottom + 14 + 170 > vh ? Math.max(12, rect.top - 14 - 170) : rect.bottom + 14 } : { left: Math.max(12, vw / 2 - W / 2), top: Math.max(12, vh / 2 - 100) };
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label={L.skip} onClick={close} className="absolute inset-0 cursor-default bg-black/45" />
      {rect && <i className="pointer-events-none absolute rounded-[12px] ring-2 ring-accent" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45), 0 0 24px var(--accent)" }} />}
      <div className="glass anim-rise absolute rounded-[14px] p-4" style={{ width: W, ...pos }}>
        <div className="num text-[10.5px] text-t2">{i + 1} {L.of} {steps.length}</div><h3 className="display mt-0.5 text-[15px] font-semibold">{title}</h3><p className="mt-1.5 text-[12.5px] leading-relaxed text-t1">{body}</p>
        <div className="mt-3 flex items-center gap-2"><button onClick={close} className="text-[12px] text-t2 hover:text-t0">{L.skip}</button><span className="flex-1" />{i > 0 && <button onClick={() => go(i, -1)} className="h-8 rounded-[8px] bg-bg3 px-3 text-[12.5px] text-t1 hover:text-t0">{L.back}</button>}<button onClick={() => go(i, 1)} className="h-8 rounded-[8px] bg-accent px-3 text-[12.5px] font-semibold text-[var(--accent-ink)]">{i === steps.length - 1 ? L.done : L.next}</button></div>
      </div>
    </div>
  );
}
