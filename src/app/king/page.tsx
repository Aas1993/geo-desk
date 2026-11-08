import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { KingApp } from "@/components/desk/KingApp";
export const metadata = { title: "THE KING: Geo Desk" };
export default function KingPage() { return <Shell><MarketsFrame><KingApp /></MarketsFrame></Shell>; }
