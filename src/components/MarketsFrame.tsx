import type { ReactNode } from "react";
/** Scroll container for the markets pages: full width under the floating HUD, above the ticker. */
export function MarketsFrame({ children }: { children: ReactNode }) {
  return <main className="scroll-thin absolute inset-x-0 bottom-14 top-0 overflow-y-auto pt-[76px] sm:bottom-10"><div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 sm:pe-20">{children}</div></main>;
}
