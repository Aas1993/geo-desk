import { parseChallenge } from "../desk/challenge";
import { cutText } from "../report/model";
import type { Illustrator } from "../report/registry";
import { COURSE_C, COURSE_W } from "./model";

// The cover of the challenge's own PDF (the registry of illustrated PDFs, src/lib/report/registry.ts): the arbiter's course in big type, its recommendation as the bottom line and its confidence. The debate itself is drawn by the Round Table blocks that follow the brief (src/lib/roundtable/html.ts).
export const illustrateChallenge: Illustrator = (c) => {
  const ch = parseChallenge(c.report); if (!ch) return null; const A = ch.arbiter; const ar = c.L === "ar";
  return { kicker: ar ? "تحدّي المجالس: توصية الحَكَم للإمارات" : "Council challenge: the arbiter's recommendation for the UAE", title: A?.course ? COURSE_W[A.course][c.L] : ch.headline || undefined, titleColor: A?.course ? COURSE_C[A.course] : undefined, bottomLine: cutText(A?.recommendation || ch.bottomLine || ch.headline, 380) || undefined, confidence: A?.confidence ?? null };
};
