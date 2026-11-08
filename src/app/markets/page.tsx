import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { MarketsBoard } from "@/components/MarketsBoard";
export const metadata = { title: "Gulf equities — Geo Desk" };
export default function MarketsPage() { return <Shell><MarketsFrame><MarketsBoard /></MarketsFrame></Shell>; }
