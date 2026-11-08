// Count something in the data file a builder is about to overwrite, so a guard can refuse a result that is much thinner than what is already there.
import { existsSync, readFileSync } from "node:fs";
export const prevOf = (rel, pick) => { try { const u = new URL(`../public/data/${rel}`, import.meta.url); return existsSync(u) ? pick(JSON.parse(readFileSync(u, "utf8"))) ?? 0 : 0; } catch { return 0; } };
export const thin = (n, prev, ratio = 0.9) => prev > 0 && n < prev * ratio;
