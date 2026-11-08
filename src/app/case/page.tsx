import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { CaseApp } from "@/components/case/CaseApp";
export const metadata = { title: "Case File: Geo Desk" };
export default function CasePage() { return <Shell><MarketsFrame><CaseApp /></MarketsFrame></Shell>; }
