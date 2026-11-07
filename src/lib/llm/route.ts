import { runModelTask, type RunOptions, type RunResult } from "../dossier/run";
import { routeOf, type Role } from "./models";
import { runModelTaskOA } from "./oa";
import { runModelTaskGemini } from "./gemini";

/** Runs one council call on the model its role is switched to (LLM_SITTING, LLM_CHIEF, LLM_AUDIT), and on Claude otherwise. If the other provider fails before an answer (down, rate-limited, key rejected) the call is run again on Claude, so a provider outage never loses a product; set LLM_FALLBACK=0 to see the failure instead. */
export async function runRouted(o: RunOptions, role: Role): Promise<RunResult> {
  const m = routeOf(role); if (m === "claude") return runModelTask(o);
  try {
    const r = m.engine === "gemini" ? await runModelTaskGemini(o, m) : await runModelTaskOA(o, m);
    if (!r.report.trim()) throw new Error("empty answer");
    return r;
  } catch (e) {
    if (o.signal.aborted || process.env.LLM_FALLBACK === "0") throw e;
    const why = e instanceof Error ? e.message.slice(0, 100) : "error"; console.warn(`[llm] ${o.label ?? role}: ${m.alias} failed (${why}); running on Claude`);
    o.send({ type: "status", text: `${m.label} was unavailable; this step is running on Claude.` });
    return runModelTask(o);
  }
}
