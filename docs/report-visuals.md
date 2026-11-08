# Report visuals

How the council and desk reports are illustrated on screen and in their PDFs. This work went in with commit `e8063ec`; this note is its description.

## What it covers

THE KING (`/king`), the Ministry council (`/mofa`), the Embassy tabs (`/ambassador`: intel and plan), the Strategic Council and Architect (`/case`), Falcon, Machiavellian, Deep Intelligence, the Archive PDFs and the generic PDF path.

Each product has a visual header (bottom line, confidence, quality grade where the quality gate exists, auditor verdict chips), tiles and bars for its parsed data, collapsible sections, filters and sort, and an equivalent inline-SVG/CSS PDF. Arabic and RTL are supported throughout. Nothing is invented: a visual draws only what the stored product holds, and a product that predates a key simply shows none of it.

## Standard parts (spec sections B, C, F of `state-of-the-art-reporting-spec.md`)

On every product that carries the keys: as-of date and freshness, the so-what for the UAE, the 14-angle coverage matrix (covered / thin / not found, click to jump), scenarios with tripwires, the implementation timeline, coalition and friends, the influence ledger, and a what-changed panel against the previous run.

- Keys are read tolerantly, under several names, in `src/lib/report/standard.ts`. The 14 angles are in `angles.ts`.
- Only the kinds `king-council`, `emb-intel`, `emb-plan` and `mofa-council` have a quality gate, so only they show a grade.
- What-changed keeps just the previous structured JSON blocks, as `<storeKey>:prev` (`diff.ts`), to avoid filling localStorage. It covers runs that go through `useRun`.

## Layout of the code

- `src/lib/report/model.ts`: `headOf` (verdicts, flags, grade), likelihood and impact ranks, `groupBy`, `cutText`.
- `src/lib/report/html.ts`: PDF building blocks. Each returns one top-level block, because `src/lib/pdf.ts` paginates by the children of `<body>`.
- `src/lib/report/registry.ts`: `ILLUSTRATORS[kind]`, with one illustrator per product in `products/`. `pdfHtml()` in `src/lib/reportpdf.ts` assembles cover, standard parts, the illustrator's front and annex, the consolidated brief and the sources.
- `src/components/report/kit.tsx` and `standard.tsx`: the on-screen twins (hero, folds, list view, matrix, Gantt, `ConfirmButton`).
- Per-product helpers and fixtures: `kit-case.tsx`, `kit-fm.tsx`, `html-case.ts`, `html-fm.ts`, `mission-model.ts`, `deepmd.ts`, `fixtures*.ts`. Tests are `src/lib/report/*.test.ts`, all in `npm test`.

## Known gaps

- Some extended tables still repeat the Embassy plan and Ministry cards in their PDFs.
- Not reviewed: Falcon Desks, Opportunity, Radar, Monitor, Graph and Lab, and Machiavellian Delivery, Instruments, Hostility and Indicators.
- Phone width is checked on THE KING and the Embassy/Ministry pages, not on `/case`, `/falcon`, `/machiavelli`, `/deep`.
- The PDF builder can leave a heading at the bottom of a page.
- The what-changed panel was verified on THE KING only.
- Real stored COD and JOR products are cut off at the model's output limit and predate the standard keys, so they show only part of it.

## Verifying

Fixtures use the synthetic country NOR (and FIN for Deep). A PDF is checked by reading its page images back out of the `gd-archive` IndexedDB. Do not start AI runs for testing: they are click-started and capped at US$1.00.
