import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { HubPicker } from "@/components/hub/HubPicker";
export const metadata = { title: "Country Updates Hub: Geo Desk" };
export default function HubIndex() { return <Shell><MarketsFrame><HubPicker /></MarketsFrame></Shell>; }
