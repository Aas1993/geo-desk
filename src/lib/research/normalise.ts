/**
 * Puts a finished research note's numbered H2 sections back in order.
 * The analyst researches and writes in the same turn, and on the first live run it emitted §6 before §5.
 * Sorting is deterministic and idempotent; "Sources" always goes last and unnumbered content before §1 stays on top.
 */
export function normaliseNote(report: string): string {
  const re = /^##\s+(.*)$/gm; const marks: { at: number; title: string }[] = [];
  for (let m = re.exec(report); m; m = re.exec(report)) marks.push({ at: m.index, title: m[1].trim() });
  if (marks.length < 2) return report;
  const pre = report.slice(0, marks[0].at);
  const secs = marks.map((m, i) => ({ title: m.title, body: report.slice(m.at, i + 1 < marks.length ? marks[i + 1].at : undefined), n: /^(\d+)[.)]\s/.exec(m.title)?.[1], src: /^sources?\b/i.test(m.title) }));
  const numbered = secs.filter((s) => s.n && !s.src).map((s, i) => ({ ...s, i }));
  const inOrder = numbered.every((s, k) => k === 0 || Number(numbered[k - 1].n) <= Number(s.n));
  const srcLast = secs.findIndex((s) => s.src) === -1 || secs.findIndex((s) => s.src) === secs.length - 1;
  if (inOrder && srcLast) return report;
  const sorted = [...numbered].sort((a, b) => Number(a.n) - Number(b.n) || a.i - b.i);
  const others = secs.filter((s) => !s.n && !s.src); // unnumbered, non-source sections keep their relative place before Sources
  const sources = secs.filter((s) => s.src);
  const tidy = (s: string) => (s.endsWith("\n") ? s : s + "\n\n");
  return pre + [...sorted, ...others, ...sources].map((s) => tidy(s.body)).join("").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
