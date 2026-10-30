import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { AmbassadorApp } from "@/components/desk/AmbassadorApp";
export const metadata = { title: "The Ambassador: Geo Desk" };
export default function AmbassadorPage() { return <Shell><MarketsFrame><AmbassadorApp /></MarketsFrame></Shell>; }
