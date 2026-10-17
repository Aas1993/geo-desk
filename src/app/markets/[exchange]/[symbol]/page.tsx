import { Suspense } from "react";
import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { StockView } from "@/components/StockView";
import { universe } from "@/lib/markets/universe";

export async function generateStaticParams() { return (await universe()).map((l) => ({ exchange: l.exchange, symbol: l.symbol })); }

async function Stock({ params }: { params: Promise<{ exchange: string; symbol: string }> }) {
  const { exchange, symbol } = await params;
  return <StockView exchange={exchange.toUpperCase()} symbol={decodeURIComponent(symbol)} />;
}
export default function StockPage({ params }: { params: Promise<{ exchange: string; symbol: string }> }) {
  return <Shell><MarketsFrame><Suspense fallback={<div className="skeleton h-[420px]" />}><Stock params={params} /></Suspense></MarketsFrame></Shell>;
}
