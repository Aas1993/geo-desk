import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { MofaApp } from "@/components/mofa/MofaApp";
export const metadata = { title: "The Ministry: Geo Desk" };
export default function MofaPage() { return <Shell><MarketsFrame><MofaApp /></MarketsFrame></Shell>; }
