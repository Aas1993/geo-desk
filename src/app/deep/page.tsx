import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { DeepApp } from "@/components/deep/DeepApp";
export const metadata = { title: "Deep Intelligence: Geo Desk" };
export default function DeepPage() { return <Shell><MarketsFrame><DeepApp /></MarketsFrame></Shell>; }
