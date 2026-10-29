import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { BirdApp } from "@/components/bird/BirdApp";
export const metadata = { title: "Bird's eye view: Geo Desk" };
export default function BirdPage() { return <Shell><MarketsFrame><BirdApp /></MarketsFrame></Shell>; }
