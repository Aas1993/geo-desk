"use client";
import { Fragment, createContext, useContext, type ReactNode } from "react";

/** When a page provides this, a fact id such as [F12] in the text becomes a button that opens the fact; without it the id is plain superscript text. */
export const CiteContext = createContext<((ids: string[], key: string) => ReactNode) | null>(null);

/** Small, dependency-free Markdown renderer for research notes. Builds React elements only — never injects HTML. */
const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : null);

function inline(text: string, key: string, cite: ((ids: string[], key: string) => ReactNode) | null = null): ReactNode[] {
  const out: ReactNode[] = []; let i = 0; let n = 0;
  const re = /(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(`[^`]+`)|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(\[F?\d+(?:[,\s–-]+F?\d+)*\])/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > i) out.push(text.slice(i, m.index));
    const k = `${key}-${n++}`;
    if (m[1]) out.push(<strong key={k} className="font-semibold text-t0">{inline(m[1].slice(2, -2), k, cite)}</strong>);
    else if (m[2]) out.push(<em key={k}>{inline(m[2].slice(1, -1), k, cite)}</em>);
    else if (m[3]) out.push(<code key={k} className="num rounded bg-bg3 px-1 py-0.5 text-[0.9em]">{m[3].slice(1, -1)}</code>);
    else if (m[4]) { const u = safeUrl(m[6]); out.push(u ? <a key={k} href={u} target="_blank" rel="noreferrer noopener" className="text-accent underline decoration-line2 underline-offset-2 hover:decoration-accent">{m[5]}</a> : m[5]); }
    else if (m[7]) out.push(cite ? cite(m[7].match(/\d+/g)!.map((n) => `F${n}`), k) : <sup key={k} className="num text-[0.7em] font-medium text-accent">{m[7]}</sup>);
    i = m.index + m[0].length;
  }
  if (i < text.length) out.push(text.slice(i));
  return out;
}
const cells = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isSep = (r: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(r);

export function Markdown({ source }: { source: string }) {
  const cite = useContext(CiteContext); const inl = (t: string, k: string) => inline(t, k, cite);
  const lines = source.replace(/\r/g, "").split("\n"); const blocks: ReactNode[] = []; let i = 0; let k = 0;
  const key = () => `b${k++}`;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = h[1].length; const cls = lvl <= 2 ? "display mt-9 mb-3 border-t border-line pt-5 text-[22px] font-semibold first:mt-0 first:border-0 first:pt-0" : lvl === 3 ? "mt-5 mb-2 text-[15px] font-semibold text-t0" : "mt-4 mb-1 label";
      blocks.push(lvl <= 2 ? <h2 key={key()} className={cls} dir="auto">{inl(h[2], `h${k}`)}</h2> : <h3 key={key()} className={cls} dir="auto">{inl(h[2], `h${k}`)}</h3>); i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push(<hr key={key()} className="my-6 border-line" />); i++; continue; }
    if (line.includes("|") && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = cells(line); const rows: string[][] = []; i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) { rows.push(cells(lines[i])); i++; }
      blocks.push(
        <div key={key()} className="scroll-thin my-3 overflow-x-auto rounded-[6px] border border-line">
          <table className="w-full min-w-[480px] border-collapse text-[12.5px]"><thead className="bg-bg2"><tr>{head.map((c, j) => <th key={j} className="px-3 py-2 text-start font-semibold text-t1" dir="auto">{inl(c, `th${k}-${j}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri} className="border-t border-line/60">{head.map((_, j) => <td key={j} className="px-3 py-2 align-top" dir="auto">{inl(r[j] ?? "", `td${k}-${ri}-${j}`)}</td>)}</tr>)}</tbody></table>
        </div>);
      continue;
    }
    if (/^\s*>/.test(line)) { const q: string[] = []; while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, "")); i++; } blocks.push(<blockquote key={key()} className="my-3 border-s-2 border-accent bg-bg2/50 px-4 py-2 text-[13.5px] text-t1" dir="auto">{inl(q.join(" "), `q${k}`)}</blockquote>); continue; }
    const li = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (li) {
      const ordered = /\d/.test(li[2]); const items: { indent: number; text: string }[] = [];
      while (i < lines.length) { const m = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/.exec(lines[i]); if (m) { items.push({ indent: m[1].length, text: m[3] }); i++; } else if (/^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1].text += " " + lines[i].trim(); i++; } else break; }
      const L = ordered ? "ol" : "ul"; const Tag = L as "ol";
      blocks.push(<Tag key={key()} className={`my-3 space-y-1.5 ps-5 text-[14px] leading-relaxed ${ordered ? "list-decimal" : "list-disc"} marker:text-t2`}>{items.map((it, j) => <li key={j} style={{ marginInlineStart: it.indent >= 2 ? 16 : 0 }} dir="auto">{inl(it.text, `li${k}-${j}`)}</li>)}</Tag>); continue;
    }
    const para: string[] = [line]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*>|\s*([-*•]|\d+[.)])\s)/.test(lines[i]) && !(lines[i].includes("|") && i + 1 < lines.length && isSep(lines[i + 1]))) { para.push(lines[i]); i++; }
    blocks.push(<p key={key()} className="my-3 text-[14px] leading-relaxed text-t0/90" dir="auto">{inl(para.join(" "), `p${k}`)}</p>);
  }
  return <Fragment>{blocks}</Fragment>;
}
