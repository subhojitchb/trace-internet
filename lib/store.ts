export type MType = "link" | "note" | "quote" | "code" | "reference";
export interface Memory { id: string; type: MType; title: string; url?: string; host?: string; body: string; description: string; tags: string[]; collectionIds: string[]; fav: boolean; created: number; updated: number; deleted?: number; lang?: string }
export interface Collection { id: string; name: string; description: string; color: string; created: number; updated: number }
export interface Prefs { theme: "dark" | "light"; view: "grid" | "list"; onboarded: boolean }
export interface Data { v: 1; memories: Memory[]; collections: Collection[]; prefs: Prefs }
const KEY = "trace:v1";
export const empty = (): Data => ({ v: 1, memories: [], collections: [], prefs: { theme: "dark", view: "grid", onboarded: false } });
export const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const TYPES = ["link", "note", "quote", "code", "reference"];
export function validate(raw: any): Data | null {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.memories) || !Array.isArray(raw.collections)) return null;
  const d = empty();
  d.memories = raw.memories.filter((m: any) => m && typeof m.id === "string" && TYPES.includes(m.type) && typeof m.title === "string").map((m: any) => ({
    id: m.id, type: m.type, title: m.title, url: typeof m.url === "string" ? m.url : undefined, host: typeof m.host === "string" ? m.host : undefined,
    body: String(m.body ?? ""), description: String(m.description ?? ""), tags: Array.isArray(m.tags) ? m.tags.map(String) : [],
    collectionIds: Array.isArray(m.collectionIds) ? m.collectionIds.map(String) : [], fav: !!m.fav, created: Number(m.created) || Date.now(),
    updated: Number(m.updated) || Date.now(), deleted: m.deleted ? Number(m.deleted) : undefined, lang: m.lang ? String(m.lang) : undefined }));
  d.collections = raw.collections.filter((c: any) => c && typeof c.id === "string" && typeof c.name === "string").map((c: any) => ({
    id: c.id, name: c.name, description: String(c.description ?? ""), color: String(c.color || "#8fa8ff"), created: Number(c.created) || Date.now(), updated: Number(c.updated) || Date.now() }));
  if (raw.prefs && typeof raw.prefs === "object") d.prefs = { ...d.prefs, ...raw.prefs };
  return d;
}
export function load(): Data { try { const s = localStorage.getItem(KEY); return s ? validate(JSON.parse(s)) ?? empty() : empty(); } catch { return empty(); } }
export function save(d: Data): string | null {
  try { localStorage.setItem(KEY, JSON.stringify(d)); return null; } catch (e: any) { return e?.name === "QuotaExceededError" ? "Browser storage is full. Export your data and delete some items." : "Could not save to browser storage."; }
}
export function clearAll() { try { localStorage.removeItem(KEY); } catch {} }
export const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
export const normUrl = (u: string) => { const t = u.trim(); if (!t) return ""; try { return new URL(/^https?:\/\//i.test(t) ? t : "https://" + t).toString(); } catch { return ""; } };
const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3));
export const haystack = (m: Memory, cols: Collection[]) => [m.title, m.description, m.body, m.host, m.tags.join(" "), cols.filter((c) => m.collectionIds.includes(c.id)).map((c) => c.name).join(" ")].join(" ").toLowerCase();
export function related(a: Memory, all: Memory[]) {
  const out: { m: Memory; why: string[]; score: number }[] = [];
  const wa = words(a.title);
  for (const b of all) {
    if (b.id === a.id || b.deleted) continue;
    const why: string[] = []; let score = 0;
    const t = a.tags.filter((x) => b.tags.includes(x)).length; if (t) { why.push(`Shares ${t} tag${t > 1 ? "s" : ""}.`); score += t * 3; }
    if (a.collectionIds.some((c) => b.collectionIds.includes(c))) { why.push("Saved in the same collection."); score += 2; }
    if (a.host && a.host === b.host) { why.push("Same website."); score += 2; }
    const k = [...words(b.title)].filter((w) => wa.has(w)).length; if (k) { why.push("Similar title keywords."); score += k; }
    if (score) out.push({ m: b, why, score });
  }
  return out.sort((x, y) => y.score - x.score);
}
