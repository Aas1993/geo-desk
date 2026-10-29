// THE ARCHIVE: every PDF report the platform makes is kept in this browser (IndexedDB: a metadata store for the list and a file store for the PDF itself), so it can be found, opened, downloaded or deleted later.
// It lives on this device only: nothing is uploaded, the browser may clear it with site data, and the Archive page says so and offers a zip of everything.
export type ArchiveMeta = { id: string; iso: string; country: string; kind: string; title: string; lang: "en" | "ar"; at: string; savedAt: string; usd: number | null; size: number; pages: number | null; note?: string };
const DB = "gd-archive"; const META = "meta"; const FILES = "files"; export const ARCHIVE_EVENT = "gd-archive";
const open = (): Promise<IDBDatabase> => new Promise((res, rej) => {
  if (typeof indexedDB === "undefined") { rej(new Error("This browser cannot keep an archive.")); return; }
  const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "id" }); if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error ?? new Error("Could not open the archive."));
});
const done = <T,>(rq: IDBRequest<T>): Promise<T> => new Promise((res, rej) => { rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
const tx = async <T,>(stores: string[], mode: IDBTransactionMode, f: (t: IDBTransaction) => Promise<T>): Promise<T> => { const db = await open(); try { const t = db.transaction(stores, mode); const out = await f(t); await new Promise<void>((res, rej) => { t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); return out; } finally { db.close(); } };
const ping = () => { try { window.dispatchEvent(new Event(ARCHIVE_EVENT)); } catch { /* not in a browser */ } };
export async function putReport(meta: Omit<ArchiveMeta, "size" | "savedAt">, blob: Blob): Promise<ArchiveMeta> {
  const full: ArchiveMeta = { ...meta, size: blob.size, savedAt: new Date().toISOString() };
  await tx([META, FILES], "readwrite", async (t) => { t.objectStore(META).put(full); t.objectStore(FILES).put(blob, full.id); }); ping(); return full;
}
export async function listReports(): Promise<ArchiveMeta[]> { try { const all = await tx([META], "readonly", (t) => done(t.objectStore(META).getAll() as IDBRequest<ArchiveMeta[]>)); return all.sort((a, z) => z.savedAt.localeCompare(a.savedAt)); } catch { return []; } }
export async function getMeta(id: string): Promise<ArchiveMeta | null> { try { return ((await tx([META], "readonly", (t) => done(t.objectStore(META).get(id) as IDBRequest<ArchiveMeta | undefined>))) ?? null); } catch { return null; } }
export async function getFile(id: string): Promise<Blob | null> { try { return (await tx([FILES], "readonly", (t) => done(t.objectStore(FILES).get(id) as IDBRequest<Blob | undefined>))) ?? null; } catch { return null; } }
export async function deleteReport(id: string): Promise<void> { await tx([META, FILES], "readwrite", async (t) => { t.objectStore(META).delete(id); t.objectStore(FILES).delete(id); }); ping(); }
export async function clearArchive(): Promise<void> { await tx([META, FILES], "readwrite", async (t) => { t.objectStore(META).clear(); t.objectStore(FILES).clear(); }); ping(); }
export const totalSize = (xs: ArchiveMeta[]) => xs.reduce((a, x) => a + x.size, 0);
export const fmtSize = (n: number) => (n <= 0 ? "0 KB" : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
/** Asks the browser to keep the archive when it is short of space (it may decline). */
export async function keepArchive(): Promise<boolean> { try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; } }
