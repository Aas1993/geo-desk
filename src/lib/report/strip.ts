// The machine-readable JSON blocks a product carries after its markdown (<directive>, <deep>, <standard> ...): the page and the PDF read them as data and never print them as text.
const TAGS = ["standard", "king", "mission1", "mission2", "mofa", "architect", "case", "falcon", "deep", "strategy", "directive", "dashboard"];
const RE = new RegExp(`<(${TAGS.join("|")})>[\\s\\S]*?(?:</\\1>|$)`, "g");
export const stripMachine = (md: string): string => md.replace(RE, "").replace(/\n{3,}/g, "\n\n");
