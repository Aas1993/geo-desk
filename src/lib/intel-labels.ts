// Pure labels shared by the server loader and the Intel tab (the tab must not import the server file for values: it reads the filesystem).
const WGI_LABEL: Record<string, string> = { pv: "Political stability", ge: "Government effectiveness", rl: "Rule of law", cc: "Control of corruption", rq: "Regulatory quality", va: "Voice and accountability" };
export const WGI_KEYS = Object.keys(WGI_LABEL); export const wgiLabel = (k: string) => WGI_LABEL[k] ?? k;
