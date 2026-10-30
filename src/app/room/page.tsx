import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { RoomApp } from "@/components/room/RoomApp";
export const metadata = { title: "The Room: Geo Desk" };
export default function RoomPage() { return <Shell><MarketsFrame><RoomApp /></MarketsFrame></Shell>; }
