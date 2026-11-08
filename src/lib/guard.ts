/** Checks for the routes that spend money on the model. A cross-site page can post a simple form to a local or intranet instance, so require a JSON body and a same-origin request. Returns an error response, or null when the request is fine. */
export function rejectCrossSite(req: Request): Response | null {
  const ct = req.headers.get("content-type") ?? ""; if (!/^application\/json\b/i.test(ct)) return Response.json({ error: "bad_request", message: "Content-Type must be application/json." }, { status: 415 });
  const site = req.headers.get("sec-fetch-site"); if (site && site !== "same-origin" && site !== "none") return Response.json({ error: "forbidden", message: "Cross-site requests are not allowed." }, { status: 403 });
  const origin = req.headers.get("origin"); const host = req.headers.get("host");
  if (origin && host) { try { if (new URL(origin).host !== host) return Response.json({ error: "forbidden", message: "Cross-origin requests are not allowed." }, { status: 403 }); } catch { return Response.json({ error: "forbidden" }, { status: 403 }); } }
  return null;
}
/** A one-line, bracket-free version of untrusted text, so it cannot forge lines, fact ids or closing tags inside a prompt. */
export const oneLine = (s: string, max = 600) => s.replace(/[\r\n\u2028\u2029]+/g, " ").replace(/[<>]/g, "").replace(/\[\s*F\d+\s*\]/gi, "").replace(/\s+/g, " ").trim().slice(0, max);
/** Free-text notes from the user: keep paragraphs, drop anything that could close or fake a container tag. */
export const noteText = (s: string) => s.replace(/<\/?[a-zA-Z_][^>]*>/g, "").replace(/[<>]/g, "");
/** Error text that is safe to show: known upstream failures keep their message, anything else becomes a generic line. */
export const safeMessage = (e: unknown) => { const m = e instanceof Error ? e.message : ""; return /credit balance|rate limit|overloaded|timed? ?out|aborted/i.test(m) ? m.slice(0, 200) : "The request to the model failed. Try again in a minute."; };
