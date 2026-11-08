"use client";
import { useEffect, useRef, type RefObject } from "react";

// DRAG AND WHEEL SCROLLING FOR A ROW OF TABS. A horizontal row that is wider than its box can be scrolled by touch, but a mouse user had no way to move it: no drag, and the wheel only scrolls the page. This lets the mouse drag the row (a click after a drag is not taken as a click on a tab) and lets the wheel move it sideways while the pointer is over it, in both reading directions. It changes nothing when the row fits.
export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  const bound = useRef<{ el: HTMLElement; off: () => void } | null>(null); // a row that appears later (a tab bar shown only on some views) is picked up on the render that shows it
  useEffect(() => {
    const el = ref.current; if (bound.current?.el === el) return; bound.current?.off(); bound.current = null; if (!el) return; let down = false; let moved = false; let sx = 0; let sl = 0;
    const pd = (e: PointerEvent) => { if (e.pointerType !== "mouse" || e.button !== 0 || el.scrollWidth <= el.clientWidth) return; down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; };
    const pm = (e: PointerEvent) => { if (!down) return; const dx = e.clientX - sx; if (!moved && Math.abs(dx) > 5) { moved = true; el.style.cursor = "grabbing"; el.style.userSelect = "none"; } if (moved) el.scrollLeft = sl - dx; };
    const end = () => { if (!down) return; down = false; el.style.cursor = ""; el.style.userSelect = ""; };
    const click = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
    const drag = (e: Event) => { if (down) e.preventDefault(); }; // a link would otherwise start the browser's own drag-and-drop
    const wheel = (e: WheelEvent) => { if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; const rtl = getComputedStyle(el).direction === "rtl"; el.scrollLeft += e.deltaY * (rtl ? -1 : 1); e.preventDefault(); };
    el.addEventListener("pointerdown", pd); window.addEventListener("pointermove", pm); window.addEventListener("pointerup", end); window.addEventListener("pointercancel", end); el.addEventListener("click", click, true); el.addEventListener("dragstart", drag); el.addEventListener("wheel", wheel, { passive: false });
    const off = () => { el.removeEventListener("pointerdown", pd); window.removeEventListener("pointermove", pm); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end); el.removeEventListener("click", click, true); el.removeEventListener("dragstart", drag); el.removeEventListener("wheel", wheel); };
    bound.current = { el, off };
  });
  useEffect(() => () => { bound.current?.off(); bound.current = null; }, []);
}
