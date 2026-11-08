import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { LabApp } from "@/components/lab/LabApp";
export const metadata = { title: "Strategy Lab: Geo Desk" };
export default function LabPage() { return <Shell><MarketsFrame><LabApp /></MarketsFrame></Shell>; }
