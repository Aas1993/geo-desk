"use client";
// Shown instead of a blank page when a component throws while rendering.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="grid min-h-dvh place-items-center bg-bg0 p-6 text-t0">
      <div className="max-w-md rounded-[12px] border border-line bg-bg1 p-5">
        <h1 className="display text-[18px] font-semibold">Something went wrong</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-t1">The page hit an unexpected error. Your saved briefs and settings are kept in this browser. {error.digest ? <span className="num text-t2">({error.digest})</span> : null}</p>
        <div className="mt-4 flex gap-2">
          <button onClick={reset} className="h-9 rounded-[8px] bg-accent px-4 text-[13px] font-semibold text-[var(--accent-ink)]">Try again</button>
          <button onClick={() => location.assign("/")} className="h-9 rounded-[8px] bg-bg3 px-4 text-[13px] text-t1">Start over</button>
        </div>
      </div>
    </div>
  );
}
