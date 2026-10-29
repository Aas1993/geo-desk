import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { AgentApp } from "@/components/agent/AgentApp";
export const metadata = { title: "Desk agent: Geo Desk" };
export default function AgentPage() { return <Shell><MarketsFrame><AgentApp /></MarketsFrame></Shell>; }
