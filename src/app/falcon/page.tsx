import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { FalconApp } from "@/components/falcon/FalconApp";
export const metadata = { title: "Falcon Eye: Geo Desk" };
export default function FalconPage() { return <Shell><MarketsFrame><FalconApp /></MarketsFrame></Shell>; }
