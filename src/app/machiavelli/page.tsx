import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { MachiavelliApp } from "@/components/machiavelli/MachiavelliApp";
export const metadata = { title: "Machiavellian: Geo Desk" };
export default function MachiavelliPage() { return <Shell><MarketsFrame><MachiavelliApp /></MarketsFrame></Shell>; }
