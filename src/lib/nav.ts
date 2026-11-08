import { Award, Archive, Binoculars, Bot, Brain, Briefcase, CandlestickChart, Compass, Crown, Eye, FlaskConical, Globe2, Handshake, Landmark, Newspaper, Scale, Users, type LucideIcon } from "lucide-react";

// THE ONE LIST OF THE PLATFORM'S PAGES. The top bar and the phone bar are both drawn from it, so a page added here appears in both and the two can never drift apart. The Desk agent is second, next to the World, so it is in reach from every page. `key` is the label's key in src/lib/i18n.ts.
export type NavItem = { href: string; key: string; icon: LucideIcon; exact?: boolean };
export const NAV: NavItem[] = [
  { href: "/", key: "nav_world", icon: Globe2, exact: true }, { href: "/agent", key: "nav_agent", icon: Bot }, { href: "/case", key: "nav_case", icon: Briefcase }, { href: "/king", key: "nav_king", icon: Crown }, { href: "/mofa", key: "nav_mofa", icon: Landmark }, { href: "/ambassador", key: "nav_amb", icon: Handshake },
  { href: "/markets", key: "nav_markets", icon: CandlestickChart }, { href: "/falcon", key: "nav_falcon", icon: Eye }, { href: "/deep", key: "nav_deep", icon: Brain }, { href: "/machiavelli", key: "nav_mach", icon: Compass }, { href: "/influence", key: "nav_influence", icon: Award }, { href: "/room", key: "nav_room", icon: Users },
  { href: "/archive", key: "nav_archive", icon: Archive }, { href: "/bird", key: "nav_bird", icon: Binoculars }, { href: "/compare", key: "nav_compare", icon: Scale }, { href: "/hub", key: "nav_hub", icon: Newspaper }, { href: "/lab", key: "nav_lab", icon: FlaskConical },
];
export const navOn = (item: NavItem, path: string) => (item.exact ? path === item.href : path.startsWith(item.href));

/** The tabs of the map's country panel, in order. The panel and the address bar's `?tab=` both read this list, so a tab added here opens from a link too. */
export const PANEL_TABS = ["overview", "hub", "councils", "brief", "intel", "investments", "foresight", "minister", "counterpart", "desk", "economy", "trade", "agreements", "diplomacy", "media", "military", "un", "society", "news"] as const;
