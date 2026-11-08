"use client";
import type { Mofa } from "@/lib/desk/mofa";
import { Pill, type Lang } from "../falcon/bits";
import { useTr } from "../case/bits";
import { Drill, Row, Bullets } from "../desk/shared";
import { ListBar, NoMatch, SegBar, useListView, type Facet } from "../report/kit";
import { useMemo } from "react";
import { LEGAL_ORDER, LEGAL_W } from "@/lib/report/mission-model";

const STATUS_C: Record<string, string> = { "in force": "var(--ok)", pending: "var(--warn)", missing: "var(--risk)", "not held": "var(--t2)" };
const STATUS_AR: Record<string, string> = { "in force": "نافذ", pending: "قيد الإنجاز", missing: "ناقص", "not held": "غير محفوظ" };
type Ask = (text: string) => void;
/** The Ministry's negotiation tracks: the aim, what the UAE asks and offers, its leverage, its fallback and its red line, each with a proposed lead and a date. */
export function NegotiationView({ L, items, onAsk }: { L: Lang; items: Mofa["negotiation"]; onAsk: Ask }) {
  const t = useTr(L);
  return <div className="grid gap-2 lg:grid-cols-2">{items.map((x, i) => <Drill key={x.track + i} L={L} head={x.track} sub={x.aim} tags={x.when ? <Pill c="var(--accent)">{x.when}</Pill> : undefined} onAsk={onAsk} askText={t(`Prepare the negotiation track "${x.track.slice(0, 100)}": the opening position, the concessions in order and the walk-away.`, `جهّز مسار التفاوض «${x.track.slice(0, 100)}»: الموقف الافتتاحي والتنازلات بالترتيب وحد الانسحاب.`)}><Row label={t("The UAE asks", "ما تطلبه الإمارات")}>{x.ask}</Row><Row label={t("The UAE offers", "ما تعرضه الإمارات")} tone="ok">{x.offer}</Row><Row label={t("Leverage", "النفوذ")}>{x.leverage}</Row><Row label={t("Fallback", "البديل")}>{x.fallback}</Row><Row label={t("Red line", "الخط الأحمر")} tone="risk">{x.redLine}</Row><Row label={t("Lead (proposed)", "المسؤول (مقترح)")}>{x.lead}</Row></Drill>)}</div>;
}
/** The visit plan in sequence: the level, the lead, what each visit must deliver and what must be ready before it. */
export function VisitsView({ L, items, onAsk }: { L: Lang; items: Mofa["visits"]; onAsk: Ask }) {
  const t = useTr(L);
  return <ol className="space-y-2">{items.map((x, i) => <li key={i}><Drill L={L} head={<><b className="num me-1.5 text-t2">{i + 1}</b>{x.what}</>} sub={`${x.when}${x.level ? ` · ${x.level}` : ""}`} onAsk={onAsk} askText={t(`Prepare the visit "${x.what.slice(0, 100)}": the agenda, the deliverables and the order of the meetings.`, `جهّز الزيارة «${x.what.slice(0, 100)}»: الأجندة والمخرجات وترتيب اللقاءات.`)}><Row label={t("Lead (proposed)", "المسؤول (مقترح)")}>{x.lead}</Row><Bullets label={t("Deliverables", "المخرجات")} items={x.deliverables} tone="ok" /><Bullets label={t("Ready first", "الجاهزية أولًا")} items={x.prep} tone="warn" /></Drill></li>)}</ol>;
}
/** Talking points: the UAE's stated public positions, cited as official, or proposed lines labelled as proposals; with what to avoid. */
export function TalkingView({ L, items }: { L: Lang; items: Mofa["talking"] }) {
  const t = useTr(L); const view = useListView(items, { text: (x) => `${x.topic} ${x.point} ${x.evidence} ${x.avoid}` });
  return <div>{items.length > 5 && <ListBar L={L} view={view} placeholder={t("Search the talking points", "ابحث في نقاط الحوار")} />}<ul className="grid gap-2 md:grid-cols-2">{view.shown.map((x, i) => <li key={i} className="rounded-[12px] border border-line bg-bg1 p-3 text-[12.5px] leading-snug"><b className="text-t0" dir="auto">{x.topic}</b>{x.evidence && <span className="ms-1.5 text-[10.5px] text-t2">{x.evidence}</span>}<p className="mt-0.5 text-t1" dir="auto">{x.point}</p>{x.avoid && <p className="mt-1 text-warn" dir="auto">{t("Avoid", "تجنب")}: {x.avoid}</p>}</li>)}</ul>{!view.shown.length && <NoMatch L={L} />}</div>;
}
/** The legal and treaty agenda: what is in force, pending or missing, the steps, the owner and the date. */
export function LegalView({ L, items }: { L: Lang; items: Mofa["legal"] }) {
  const t = useTr(L); const facets = useMemo<Facet<Mofa["legal"][number]>[]>(() => [{ id: "status", label: t("Status", "الحالة"), get: (x) => x.status, options: LEGAL_ORDER.filter((k) => items.some((x) => x.status === k)).map((v) => ({ v, label: LEGAL_W[v][L], color: STATUS_C[v] })) }], [L, items]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useListView(items, { text: (x) => `${x.instrument} ${x.status} ${x.aim} ${x.steps.join(" ")} ${x.owner} ${x.by} ${x.risk}`, facets });
  return <div><div className="mb-3 rounded-[12px] bg-bg2 p-3"><SegBar segs={LEGAL_ORDER.map((k) => ({ label: LEGAL_W[k][L], n: items.filter((x) => x.status === k).length, color: STATUS_C[k] }))} /></div><ListBar L={L} view={view} placeholder={t("Search the legal agenda", "ابحث في الأجندة القانونية")} /><div className="grid gap-2 lg:grid-cols-2">{view.shown.map((x, i) => <Drill key={x.instrument + i} L={L} head={x.instrument} sub={x.aim} tags={<Pill c={STATUS_C[x.status]}>{L === "ar" ? STATUS_AR[x.status] : x.status}</Pill>}><Bullets label={t("Steps", "الخطوات")} items={x.steps} /><Row label={t("Owner (proposed)", "المسؤول (مقترح)")}>{x.owner}</Row><Row label={t("By", "بحلول")}>{x.by}</Row><Row label={t("Risk", "الخطر")} tone="risk">{x.risk}</Row></Drill>)}</div>{!view.shown.length && <NoMatch L={L} />}</div>;
}
