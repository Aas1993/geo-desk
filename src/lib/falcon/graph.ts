import { readFile } from "node:fs/promises";
import path from "node:path";
import { indexGraph, type Graph, type GraphFile } from "./graph-core";

let memo: { at: number; mtime: number; g: Graph } | null = null;
/** The graph file, indexed and kept in memory; reloaded when the file changes. Null if the file has not been built. */
export async function loadGraph(): Promise<Graph | null> {
  try {
    const f = path.join(process.cwd(), "public/data/graph.json"); const { stat } = await import("node:fs/promises"); const mt = (await stat(f)).mtimeMs;
    if (memo && memo.mtime === mt) return memo.g; const g = indexGraph(JSON.parse(await readFile(f, "utf8")) as GraphFile); memo = { at: Date.now(), mtime: mt, g }; return g;
  } catch { return null; }
}
