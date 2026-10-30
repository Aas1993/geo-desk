// SNAPSHOTS OF THE LAB'S VIEWS: each strategy tool can keep what it shows (as PDF-ready blocks and as text) so the briefing-pack builder can include it and the Archive can hold it. Kept per tool and country in this browser (`gd-lab-snap:<tool>:<ISO>`).
export type LabTool = "scenario" | "coalition" | "ledger" | "decisions";
export const LAB_TOOLS: LabTool[] = ["scenario", "coalition", "ledger", "decisions"];
export type LabSnap = { tool: LabTool; iso: string; country: string; at: string; title: string; lang: "en" | "ar"; blocks: string[]; text: string };
export const snapKey = (tool: LabTool, iso: string) => `gd-lab-snap:${tool}:${iso}`;
export const SNAP_EVENT = "gd-lab-snap";
export const TOOL_NAME: Record<LabTool, { en: string; ar: string }> = { scenario: { en: "Scenario sandbox", ar: "مختبر السيناريوهات" }, coalition: { en: "Coalition and vote map", ar: "خريطة التحالفات والتصويت" }, ledger: { en: "Influence ledger", ar: "سجل النفوذ" }, decisions: { en: "Decision log", ar: "سجل القرارات" } };
export function parseSnap(raw: unknown, tool: LabTool, iso: string): LabSnap | null {
  const o = (raw ?? {}) as Record<string, unknown>; if (!o || typeof o.at !== "string" || !Array.isArray(o.blocks) || !o.blocks.every((b) => typeof b === "string")) return null;
  return { tool, iso, country: String(o.country ?? iso).slice(0, 80), at: o.at.slice(0, 30), title: String(o.title ?? TOOL_NAME[tool].en).slice(0, 160), lang: o.lang === "ar" ? "ar" : "en", blocks: (o.blocks as string[]).slice(0, 80), text: String(o.text ?? "").slice(0, 12_000) };
}
export function readSnap(tool: LabTool, iso: string): LabSnap | null { try { return typeof localStorage === "undefined" ? null : parseSnap(JSON.parse(localStorage.getItem(snapKey(tool, iso)) ?? "null"), tool, iso); } catch { return null; } }
export function writeSnap(s: LabSnap): boolean {
  try { localStorage.setItem(snapKey(s.tool, s.iso), JSON.stringify(s)); } catch { return false; }
  try { window.dispatchEvent(new CustomEvent(SNAP_EVENT, { detail: s.iso })); } catch { /* no window */ }
  return true;
}
export const listSnaps = (iso: string): LabSnap[] => LAB_TOOLS.map((t) => readSnap(t, iso)).filter((x): x is LabSnap => !!x);
/** The Archive record kind for a Lab PDF (the Archive lists any kind; these are labelled in `reportpdf.ts`). */
export const LAB_KIND: Record<LabTool, string> = { scenario: "lab-scenario", coalition: "lab-coalition", ledger: "lab-ledger", decisions: "lab-decisions" };
