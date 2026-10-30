"use client";
import { useMemo } from "react";
import { kingBrief, type KingBrief } from "@/lib/case/king";
import { defaultWeights, type Edits } from "@/lib/case/score";
import type { EmbDigest } from "@/lib/desk/embassy";
import type { SavedProduct } from "@/lib/case/saved";
import type { CaseData } from "@/lib/case/load";
import { useStored } from "../deep/hooks";
import { useDecisionLog } from "./work";

/** The decision brief for one country, built from everything on file and the scorecard edits and weights kept in this browser. */
export function useKingBrief(d: CaseData | null, iso: string | null, council: SavedProduct | null, arch: SavedProduct | null, amb: SavedProduct | null, today: number, emb: EmbDigest | null = null): KingBrief | null {
  const [edit] = useStored<Edits>(`gd-case-score:${iso ?? "none"}`, {}); const [w] = useStored<Record<string, number>>("gd-case-weights", defaultWeights()); const [ds] = useDecisionLog();
  return useMemo(() => (d && today ? kingBrief({ d, council: council?.report ?? null, arch: arch?.report ?? null, ambassador: amb?.report ?? null, emb, edit, weights: w, decisions: ds, today, councilAt: council?.at ?? null, archAt: arch?.at ?? null }) : null), [d, council, arch, amb, emb, edit, w, ds, today]);
}
