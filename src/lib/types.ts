export type Stat = { v: number; y: number } | null;
export type Country = {
  iso3: string; iso2: string; qid: string | null; num: string; name: string; nameAr: string | null;
  capital: string | null; lat: number | null; lng: number | null; region: string; flag: string;
  population: Stat; areaKm2: number | null;
  currencies: string[]; languages: string[]; borders: string[];
};
export type Point = { v: number; y: number };
export type Series = Point[]; // ascending by year
export type Leader = { role: "head_of_state" | "head_of_government"; name: string; img: string | null; qid: string };
export type Weather = { temp: number | null; code: number | null; isDay: boolean; tz: string | null; aqi: number | null };
export type CountryDetail = {
  indicators: Record<string, Series>;
  leaders: Leader[] | null;
  weather: Weather | null;
};
export type Headline = { outlet: string; title: string; link: string; ts: number };
export type TabId = "overview" | "brief" | "minister" | "counterpart" | "desk" | "intel" | "investments" | "foresight" | "economy" | "trade" | "agreements" | "diplomacy" | "media" | "military" | "un" | "society" | "news";
export type BilateralData = { year: number; mirror: boolean; exports: number | null; imports: number | null; topExports: { code: string; value: number }[]; topImports: { code: string; value: number }[] };
export const HOME_ISO3 = "ARE";
