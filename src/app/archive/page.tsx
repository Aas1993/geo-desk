import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { ArchiveApp } from "@/components/archive/ArchiveApp";
export const metadata = { title: "The Archive: Geo Desk" };
export default function ArchivePage() { return <Shell><MarketsFrame><ArchiveApp /></MarketsFrame></Shell>; }
