"use client";
import { useKeyed } from "@/lib/useKeyed";
import type { ApiError } from "./types";

export type ApiResult<T> = { ok: true; data: T; synthetic: boolean } | { ok: false; error: ApiError["error"]; message?: string };
export async function fetchApi<T>(url: string): Promise<ApiResult<T>> {
  try {
    const r = await fetch(url); const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.error) return { ok: false, error: (j?.error as ApiError["error"]) ?? "upstream", message: j?.message };
    return { ok: true, data: j as T, synthetic: !!j.synthetic };
  } catch { return { ok: false, error: "upstream", message: "Network error" }; }
}
export function useApi<T>(url: string | null) {
  const s = useKeyed<ApiResult<T>>(url, () => fetchApi<T>(url!));
  return { result: s.value, loading: s.loading, retry: s.retry };
}
let provider: Promise<{ keyConfigured: boolean; fixtures: boolean }> | null = null;
export const loadProvider = () => (provider ??= fetch("/api/markets/status").then((r) => r.json()));
