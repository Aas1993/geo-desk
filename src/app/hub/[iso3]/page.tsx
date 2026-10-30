import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Shell } from "@/components/Shell";
import { MarketsFrame } from "@/components/MarketsFrame";
import { HubPage } from "@/components/hub/HubPicker";
export const metadata = { title: "Country Updates Hub: Geo Desk" };
// Cache Components: the country is request-time data, and the navigation bar reads the path, so the page is built inside a Suspense boundary; one country is prerendered and the rest are rendered on first visit.
export async function generateStaticParams() { return [{ iso3: "JOR" }]; }
async function HubCountry({ params }: { params: Promise<{ iso3: string }> }) {
  const { iso3 } = await params; const iso = iso3.toUpperCase(); if (!/^[A-Z]{3}$/.test(iso)) notFound();
  return <Shell><MarketsFrame><HubPage iso={iso} /></MarketsFrame></Shell>;
}
export default function HubCountryPage({ params }: { params: Promise<{ iso3: string }> }) { return <Suspense fallback={null}><HubCountry params={params} /></Suspense>; }
