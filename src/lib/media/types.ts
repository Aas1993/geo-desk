export type Item = { id: string; title: string; url: string; outlet: string; ts: number; lang?: string; kind: "media" | "thinktank" };
export type Dir = "in" | "out"; // in: this country's media about the UAE. out: UAE media about this country.
export const STANCES = ["hostile", "critical", "neutral", "friendly", "supportive"] as const;
export type Stance = (typeof STANCES)[number];
export type Verdict = Stance | "mixed";
export type StanceRead = {
  toUae: { verdict: Verdict; summary: string }; toCountry: { verdict: Verdict; summary: string };
  confidence: "low" | "medium" | "high"; items: { id: string; target: "uae" | "country"; stance: Stance; reason: string }[];
  narratives: { label: string; tone: "critical" | "friendly" | "neutral"; ids: string[] }[]; watch: string;
};
export type StanceResult = { read: StanceRead; items: Item[]; at: string; model: string; usage: { input: number; output: number; usd: number | null }; cached?: boolean };
