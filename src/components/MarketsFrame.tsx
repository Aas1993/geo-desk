import type { ReactNode } from "react";
/** Scroll container that sits inside the Shell (right of the dock, below the top bar, above the ticker). */
export function MarketsFrame({ children }: { children: ReactNode }) {
  return <main className="scroll-thin absolute inset-x-0 bottom-14 top-14 overflow-y-auto sm:bottom-9 sm:start-14"><div className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6">{children}</div></main>;
}
