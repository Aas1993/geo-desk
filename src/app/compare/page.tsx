import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { CompareApp } from "@/components/compare/CompareApp";
export const metadata = { title: "Compare: Geo Desk" };
export default function ComparePage() { return <Shell><MarketsFrame><CompareApp /></MarketsFrame></Shell>; }
