import type { Baseline } from "./changes";
import { quickChange } from "./changes";
import { POSTURE, THRESHOLDS, type Posture } from "./core";
import type { CaseData } from "./load";
import type { LogCounts } from "./log";

// THE PRIORITY BOARD: every country on one page, grouped by the Case File's own posture rule and sorted by whichever single reading you choose. There is deliberately no combined "priority score": the platform already had seven scores that disagree, and a decision-maker needs to see why a country is on the list, not a number that hides it.
// The board combines two kinds of facts: the server's (the same buildCase every Case File uses, so a country can never rank differently here than on its own page) and this browser's (is a Council or strategy on file, is a decision due, has anything changed since the last review).
export type BoardRow = {
  iso3: string; name: string; nameAr: string | null; flag: string; region: string;
  posture: Posture | null; stable: boolean; value: number | null; ability: number | null; risk: number | null;
  partnership: number | null; rank: number | null; scorecard: number | null; quadrant: string | null; exposure: { band: string; known: number; unknown: number } | null; alerts: number; tone: number | null;
};
export function boardRow(c: CaseData): BoardRow {
  const ex = c.deep?.exposure?.priority ?? null;
  return { iso3: c.iso3, name: c.name, nameAr: c.nameAr, flag: c.flag, region: c.region, posture: c.posture.posture, stable: c.posture.stable, value: c.posture.value, ability: c.posture.ability, risk: c.posture.risk,
    partnership: c.partnership?.score ?? null, rank: c.partnership?.rank ?? null, scorecard: c.scorecard?.overall ?? null, quadrant: c.leverage?.quadrant ?? null, exposure: ex ? { band: ex.band, known: ex.known, unknown: ex.unknown } : null,
    alerts: (c.deep?.readings ?? []).filter((r) => r.state === "alert").length, tone: c.tone?.g ?? null };
}
/** What this browser knows about a country. */
export type Work = { council: boolean; arch: boolean; baseline: Baseline | null; log: LogCounts | null; king?: { verdict: string; at: string } | null };
export type SortKey = "value" | "ability" | "risk" | "partnership" | "alerts" | "name";
export const POSTURE_ORDER: (Posture | "none")[] = ["deepen", "staged", "hedge", "hold", "none"];
export const GROUP_NAME: Record<Posture | "none", { en: string; ar: string; why: { en: string; ar: string } }> = {
  deepen: { ...POSTURE.deepen.name, why: { en: "Value and ability are high and risk is low: commit, with gates.", ar: "القيمة والقدرة مرتفعتان والمخاطر منخفضة: التزام مع بوابات." } },
  staged: { ...POSTURE.staged.name, why: { en: "Value and ability are there but risk is not low: commit in stages with exit rights.", ar: "القيمة والقدرة متوفرتان لكن المخاطر ليست منخفضة: التزام على مراحل مع حقوق خروج." } },
  hedge: { ...POSTURE.hedge.name, why: { en: "Value is real but the UAE is not well placed to act, or risk is high: keep options open.", ar: "القيمة حقيقية لكن الإمارات ليست في وضع جيد للفعل أو المخاطر مرتفعة: أبقِ الخيارات مفتوحة." } },
  hold: { ...POSTURE.hold.name, why: { en: "Value, ability or risk do not justify new commitment now: watch the triggers.", ar: "القيمة أو القدرة أو المخاطر لا تبرر التزامًا جديدًا الآن: راقب المحفزات." } },
  none: { en: "Not placed", ar: "غير محدد", why: { en: "Not enough data to place the country.", ar: "لا بيانات كافية لتحديد موضع الدولة." } },
};
/** Sort by one reading. Value, ability, partnership and alerts sort high to low; risk sorts low to high; a missing reading always goes last. */
export function sortRows(rows: BoardRow[], key: SortKey, ar = false): BoardRow[] {
  const nm = (r: BoardRow) => (ar ? r.nameAr ?? r.name : r.name); const num = (r: BoardRow): number | null => (key === "alerts" ? r.alerts : key === "name" ? null : r[key]);
  return [...rows].sort((a, z) => { if (key === "name") return nm(a).localeCompare(nm(z), ar ? "ar" : "en"); const x = num(a); const y = num(z); if (x == null && y == null) return nm(a).localeCompare(nm(z)); if (x == null) return 1; if (y == null) return -1; return (key === "risk" ? x - y : y - x) || nm(a).localeCompare(nm(z)); });
}
export type Flag = { id: "overdue" | "due" | "changed" | "nofile" | "unstable"; iso3: string };
/** The three action queues: decisions overdue or due, change since the last review, and high value with no Council on file. */
export function queues(rows: BoardRow[], work: Record<string, Work>) {
  const overdue = rows.filter((r) => (work[r.iso3]?.log?.overdue ?? 0) > 0); const due = rows.filter((r) => (work[r.iso3]?.log?.due ?? 0) > 0 && !(work[r.iso3]?.log?.overdue));
  const changed = rows.map((r) => ({ r, what: quickChange(work[r.iso3]?.baseline?.state, r) })).filter((x) => x.what.length > 0);
  const nofile = rows.filter((r) => (r.value ?? 0) >= THRESHOLDS.deepenValue && !work[r.iso3]?.council).sort((a, z) => (z.value ?? 0) - (a.value ?? 0));
  return { overdue, due, changed, nofile };
}
export function flagsFor(r: BoardRow, w: Work | undefined): Flag["id"][] {
  const f: Flag["id"][] = []; if ((w?.log?.overdue ?? 0) > 0) f.push("overdue"); else if ((w?.log?.due ?? 0) > 0) f.push("due"); if (quickChange(w?.baseline?.state, r).length) f.push("changed"); if ((r.value ?? 0) >= THRESHOLDS.deepenValue && !w?.council) f.push("nofile"); if (r.posture && !r.stable) f.push("unstable"); return f;
}
