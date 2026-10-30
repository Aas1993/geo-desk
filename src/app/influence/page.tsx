import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { ScorecardApp } from "@/components/machiavelli/ScorecardApp";
export const metadata = { title: "Global Influence Scorecard: Geo Desk" };
export default function InfluencePage() { return <Shell><MarketsFrame><ScorecardApp /></MarketsFrame></Shell>; }
