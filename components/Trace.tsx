"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Home, Library, FolderKanban, Network, Trash2, Settings, Plus, Search, Star, Link2, StickyNote, Quote, Code2, BookOpen, Sun, Moon, X, Copy, Download, Upload, RotateCcw, LayoutGrid, List, Check, Menu } from "lucide-react";
import { Data, Memory, Collection, MType, load, save, empty, uid, validate, clearAll, hostOf, normUrl, haystack, related } from "@/lib/store";

type View = "overview" | "library" | "collections" | "graph" | "trash" | "settings";
const NAV: { id: View; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: Home }, { id: "library", label: "All memories", icon: Library }, { id: "collections", label: "Collections", icon: FolderKanban },
  { id: "graph", label: "Knowledge graph", icon: Network }, { id: "trash", label: "Trash", icon: Trash2 }, { id: "settings", label: "Settings", icon: Settings }];
const TYPES: { id: MType; label: string; icon: any }[] = [{ id: "link", label: "Link", icon: Link2 }, { id: "note", label: "Note", icon: StickyNote }, { id: "quote", label: "Quote", icon: Quote }, { id: "code", label: "Snippet", icon: Code2 }, { id: "reference", label: "Reference", icon: BookOpen }];
const icon = (t: MType) => TYPES.find((x) => x.id === t)!.icon;
const COLORS = ["#8fa8ff", "#7dd3c0", "#f0b27a", "#d98fb5", "#b4a0ff"];
const ago = (t: number) => { const s = (Date.now() - t) / 1000; return s < 60 ? "just now" : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`; };
const tap = { whileTap: { scale: 0.96 }, transition: { duration: 0.12 } };

export default function Trace() {
  const [d, setD] = useState<Data>(empty());
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("overview");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Memory | "new" | null>(null);
  const [colOpen, setColOpen] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [nav, setNav] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const x = load(); setD(x); setReady(true); document.documentElement.dataset.theme = x.prefs.theme; }, []);
  const commit = useCallback((fn: (x: Data) => Data) => setD((p) => { const n = fn(p); const err = save(n); if (err) setToast({ msg: err }); return n; }), []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), toast.undo ? 5000 : 2200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setView("library"); searchRef.current?.focus(); }
      else if (!typing && e.key === "n") { e.preventDefault(); setOpen("new"); }
      else if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  const live = useMemo(() => d.memories.filter((m) => !m.deleted), [d.memories]);
  const trash = useMemo(() => d.memories.filter((m) => m.deleted), [d.memories]);
  const go = (v: View) => { setView(v); setColOpen(null); setNav(false); };

  const upsert = (m: Memory) => { commit((x) => ({ ...x, memories: x.memories.some((y) => y.id === m.id) ? x.memories.map((y) => (y.id === m.id ? m : y)) : [m, ...x.memories] })); setToast({ msg: "Saved" }); };
  const patch = (id: string, p: Partial<Memory>) => commit((x) => ({ ...x, memories: x.memories.map((m) => (m.id === id ? { ...m, ...p, updated: Date.now() } : m)) }));
  const remove = (m: Memory) => { patch(m.id, { deleted: Date.now() }); setToast({ msg: "Moved to Trash", undo: () => patch(m.id, { deleted: undefined }) }); };
  const dup = (m: Memory) => { upsert({ ...m, id: uid(), title: m.title + " (copy)", created: Date.now(), updated: Date.now() }); };
  const copy = async (m: Memory) => { try { await navigator.clipboard.writeText(m.url || m.body || m.title); setToast({ msg: "Copied" }); } catch { setToast({ msg: "Copy blocked by the browser" }); } };
  const setTheme = (t: "dark" | "light") => { document.documentElement.dataset.theme = t; commit((x) => ({ ...x, prefs: { ...x.prefs, theme: t } })); };
  const colName = (id: string) => d.collections.find((c) => c.id === id)?.name;

  const actions = { open: setOpen, fav: (m: Memory) => patch(m.id, { fav: !m.fav }), remove, dup, copy };

  if (!ready) return <div className="min-h-screen" />;
  const Side = (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="Main">
      <div className="flex items-center gap-2 px-2 py-3"><Logo /><span className="font-display text-xl tracking-wide">TRACE</span></div>
      <motion.button {...tap} onClick={() => { setOpen("new"); setNav(false); }} className="mb-3 flex items-center gap-2 rounded-xl bg-acc px-3 py-2 font-medium text-ink"><Plus size={16} />Quick capture<kbd className="ml-auto text-xs opacity-60">N</kbd></motion.button>
      {NAV.map((n) => (
        <button key={n.id} onClick={() => go(n.id)} className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${view === n.id ? "text-fg" : "text-mute hover:text-fg"}`}>
          {view === n.id && <motion.span layoutId="ind" className="absolute inset-0 rounded-lg border border-line bg-raised" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          <n.icon size={16} className="relative transition-transform group-hover:translate-x-0.5" /><span className="relative">{n.label}</span>
          {n.id === "trash" && trash.length > 0 && <span className="relative ml-auto text-xs text-mute">{trash.length}</span>}
        </button>))}
    </nav>);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-line bg-panel md:block">{Side}</aside>
        <AnimatePresence>{nav && (<><motion.div className="fixed inset-0 z-40 bg-black/50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNav(false)} />
          <motion.aside className="fixed inset-y-0 left-0 z-50 w-64 bg-panel md:hidden" initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ duration: 0.2 }}>{Side}</motion.aside></>)}</AnimatePresence>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-ink/80 px-3 py-3 backdrop-blur md:px-6">
            <button className="rounded-lg p-2 text-mute hover:bg-raised md:hidden" aria-label="Open menu" onClick={() => setNav(true)}><Menu size={18} /></button>
            <div className="relative max-w-xl flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
              <input ref={searchRef} value={q} onChange={(e) => { setQ(e.target.value); if (view !== "library") setView("library"); }} placeholder="Search memories" aria-label="Search memories" className="field pl-9 pr-14" />
              <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs text-mute sm:block">Ctrl K</kbd></div>
            <motion.button {...tap} aria-label="Toggle theme" onClick={() => setTheme(d.prefs.theme === "dark" ? "light" : "dark")} className="rounded-lg p-2 text-mute hover:bg-raised hover:text-fg">{d.prefs.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</motion.button>
          </header>
          <main className="p-4 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div key={view + colOpen} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
                {view === "overview" && <Overview live={live} d={d} a={actions} go={go} capture={(t) => setOpen("new")} quick={(txt) => { const u = normUrl(txt); const isU = /^(https?:\/\/|www\.)\S+$/i.test(txt.trim()) && u; upsert({ id: uid(), type: isU ? "link" : "note", title: isU ? hostOf(u) : txt.slice(0, 60), url: isU ? u : undefined, host: isU ? hostOf(u) : undefined, body: isU ? "" : txt, description: "", tags: [], collectionIds: [], fav: false, created: Date.now(), updated: Date.now() }); }} />}
                {view === "library" && <Lib live={live} d={d} q={q} setQ={setQ} a={actions} />}
                {view === "collections" && <Cols d={d} live={live} commit={commit} open={colOpen} setOpen={setColOpen} a={actions} patch={patch} />}
                {view === "graph" && <Graph live={live} a={actions} />}
                {view === "trash" && <TrashView trash={trash} commit={commit} />}
                {view === "settings" && <SettingsView d={d} commit={commit} setTheme={setTheme} toast={(m: string) => setToast({ msg: m })} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <AnimatePresence>{open && <Capture key="cap" item={open === "new" ? null : open} d={d} live={live} onClose={() => setOpen(null)} onSave={(m) => { upsert(m); setOpen(null); }} a={actions} />}</AnimatePresence>
        <AnimatePresence>{toast && (<motion.div role="status" className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-raised px-4 py-2 text-sm shadow-xl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
          <Check size={14} className="text-acc" />{toast.msg}{toast.undo && <button className="font-medium text-acc" onClick={() => { toast.undo!(); setToast(null); }}>Undo</button>}</motion.div>)}</AnimatePresence>
        {!d.prefs.onboarded && <Onboarding done={() => commit((x) => ({ ...x, prefs: { ...x.prefs, onboarded: true } }))} />}
      </div>
    </MotionConfig>);
}

function Logo() { return (<svg width="26" height="26" viewBox="0 0 32 32" aria-hidden><path d="M5 22 L13 12 L19 18 L27 7" fill="none" stroke="var(--acc)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="5" cy="22" r="2.6" fill="var(--acc)" /><circle cx="13" cy="12" r="2.2" fill="var(--ink)" stroke="var(--acc)" strokeWidth="1.6" /><circle cx="27" cy="7" r="2.6" fill="var(--acc)" /></svg>); }
const Empty = ({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) => (<div className="rounded-2xl border border-dashed border-line p-10 text-center"><p className="font-display text-lg">{title}</p><p className="mx-auto mt-1 max-w-sm text-sm text-mute">{hint}</p>{action && <div className="mt-4">{action}</div>}</div>);
const H = ({ children, sub }: any) => (<div className="mb-6"><h1 className="font-display text-3xl">{children}</h1>{sub && <p className="mt-1 text-sm text-mute">{sub}</p>}</div>);

function Card({ m, a, d, list, hl }: { m: Memory; a: any; d: Data; list?: boolean; hl?: string }) {
  const I = icon(m.type);
  const mark = (s: string) => { if (!hl) return s; const i = s.toLowerCase().indexOf(hl.toLowerCase()); return i < 0 ? s : <>{s.slice(0, i)}<mark className="rounded bg-acc/30 text-fg">{s.slice(i, i + hl.length)}</mark>{s.slice(i + hl.length)}</>; };
  return (
    <motion.article layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} whileHover={{ y: -2 }}
      className={`group relative rounded-2xl border border-line bg-panel p-4 transition-colors hover:border-acc/50 ${list ? "flex items-center gap-4" : ""}`}>
      <button className="absolute inset-0 rounded-2xl" aria-label={`Open ${m.title}`} onClick={() => a.open(m)} />
      <div className={`relative flex items-center gap-2 text-xs text-mute ${list ? "w-28 shrink-0" : "mb-2"}`}><I size={14} className="text-acc" />{m.type === "link" ? m.host : m.type === "code" ? m.lang || "code" : m.type}</div>
      <div className="relative min-w-0 flex-1">
        <h3 className={`truncate font-medium ${m.type === "quote" ? "font-display italic" : ""}`}>{mark(m.title)}</h3>
        {(m.body || m.description) && (m.type === "code" ? <pre className="mt-2 max-h-20 overflow-hidden rounded-lg bg-ink p-2 font-mono text-xs text-mute">{m.body}</pre> : <p className={`mt-1 text-sm text-mute ${list ? "truncate" : "line-clamp-3"} ${m.type === "quote" ? "border-l-2 border-acc pl-3" : ""}`}>{mark(m.description || m.body)}</p>)}
        {!list && <div className="mt-3 flex flex-wrap gap-1">{m.tags.map((t) => <span key={t} className="rounded-full bg-raised px-2 py-0.5 text-xs text-mute">#{t}</span>)}</div>}
      </div>
      <div className={`relative flex items-center gap-0.5 ${list ? "" : "mt-3 justify-between"}`}>
        {!list && <span className="text-xs text-mute">{ago(m.created)}</span>}
        <div className="flex">
          <Ib label={m.fav ? "Remove favourite" : "Favourite"} onClick={() => a.fav(m)}><Star size={15} className={m.fav ? "fill-acc text-acc" : ""} /></Ib>
          <Ib label="Copy" onClick={() => a.copy(m)}><Copy size={15} /></Ib><Ib label="Duplicate" onClick={() => a.dup(m)}><LayoutGrid size={15} /></Ib>
          <Ib label="Move to Trash" onClick={() => a.remove(m)}><Trash2 size={15} /></Ib></div></div>
    </motion.article>);
}
const Ib = ({ label, onClick, children }: any) => (<motion.button {...tap} whileHover={{ scale: 1.1 }} aria-label={label} title={label} onClick={onClick} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-raised hover:text-fg">{children}</motion.button>);
const Grid = ({ items, a, d, list, hl }: any) => (<motion.div layout className={list ? "grid gap-2" : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"}><AnimatePresence>{items.map((m: Memory) => <Card key={m.id} m={m} a={a} d={d} list={list} hl={hl} />)}</AnimatePresence></motion.div>);

function Overview({ live, d, a, go, quick }: any) {
  const [t, setT] = useState("");
  const week = Date.now() - 7 * 864e5;
  const days = Array.from({ length: 14 }, (_, i) => { const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - (13 - i)); const st = s.getTime(); return live.filter((m: Memory) => m.created >= st && m.created < st + 864e5).length; });
  const max = Math.max(1, ...days);
  const stats = [["Memories", live.length], ["Collections", d.collections.length], ["Favourites", live.filter((m: Memory) => m.fav).length], ["Added this week", live.filter((m: Memory) => m.created > week).length]];
  const recent = [...live].sort((x: Memory, y: Memory) => y.created - x.created).slice(0, 6);
  return (<div className="mx-auto max-w-5xl">
    <H sub="Never lose an idea again.">Your ideas, all connected.</H>
    <form onSubmit={(e) => { e.preventDefault(); if (t.trim()) { quick(t.trim()); setT(""); } }} className="mb-6 flex gap-2"><input value={t} onChange={(e) => setT(e.target.value)} aria-label="Quick capture" placeholder="Paste a link, or write a thought" className="field" /><motion.button {...tap} whileHover={{ y: -1 }} className="rounded-xl bg-acc px-4 font-medium text-ink">Save</motion.button></form>
    <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">{stats.map(([l, n]) => <div key={l as string} className="rounded-2xl border border-line bg-panel p-4"><div className="font-display text-3xl">{n}</div><div className="text-sm text-mute">{l}</div></div>)}</div>
    <section className="mb-8 rounded-2xl border border-line bg-panel p-4"><h2 className="mb-3 text-sm text-mute">Captured in the last 14 days</h2>
      {live.length === 0 ? <p className="text-sm text-mute">Activity will appear here as you save memories.</p> : <div className="flex h-24 items-end gap-1.5">{days.map((n, i) => <motion.div key={i} title={`${n} saved`} className="flex-1 rounded-t bg-acc/70" initial={{ height: 0 }} animate={{ height: `${(n / max) * 100 || 3}%` }} />)}</div>}</section>
    <h2 className="mb-3 font-display text-xl">Recently captured</h2>
    {recent.length ? <Grid items={recent} a={a} d={d} /> : <Empty title="Nothing saved yet" hint="Press N or use the box above to capture your first link, note, quote, or snippet." action={<button onClick={() => a.open("new")} className="rounded-xl bg-acc px-4 py-2 font-medium text-ink">Capture something</button>} />}
    {live.length > 1 && <p className="mt-6 text-sm text-mute">Explore connections in the <button className="text-acc underline" onClick={() => go("graph")}>knowledge graph</button>.</p>}
  </div>);
}

function Lib({ live, d, q, setQ, a }: any) {
  const [type, setType] = useState<string>("all"); const [col, setCol] = useState("all"); const [fav, setFav] = useState(false); const [sort, setSort] = useState("new");
  const [list, setList] = useState(d.prefs.view === "list"); const [dq, setDq] = useState(q);
  useEffect(() => { const t = setTimeout(() => setDq(q), 120); return () => clearTimeout(t); }, [q]);
  const items = useMemo(() => { let r = live.filter((m: Memory) => (type === "all" || m.type === type) && (col === "all" || m.collectionIds.includes(col)) && (!fav || m.fav) && (!dq || haystack(m, d.collections).includes(dq.toLowerCase())));
    return r.sort((x: Memory, y: Memory) => sort === "old" ? x.created - y.created : sort === "az" ? x.title.localeCompare(y.title) : y.created - x.created); }, [live, type, col, fav, sort, dq, d.collections]);
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-sm transition-colors ${on ? "border-acc bg-acc/15 text-fg" : "border-line text-mute hover:text-fg"}`;
  return (<div className="mx-auto max-w-5xl"><H sub={`${items.length} of ${live.length} shown`}>All memories</H>
    <div className="mb-4 flex flex-wrap items-center gap-2">{["all", ...TYPES.map((t) => t.id)].map((t) => <motion.button {...tap} key={t} onClick={() => setType(t)} className={chip(type === t)}>{t === "all" ? "All" : t}</motion.button>)}
      <button onClick={() => setFav(!fav)} className={chip(fav)}>Favourites</button>
      <select aria-label="Collection" value={col} onChange={(e) => setCol(e.target.value)} className="field !w-auto"><option value="all">Any collection</option>{d.collections.map((c: Collection) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="field !w-auto"><option value="new">Newest</option><option value="old">Oldest</option><option value="az">A–Z</option></select>
      <div className="ml-auto flex"><Ib label="Grid view" onClick={() => setList(false)}><LayoutGrid size={16} /></Ib><Ib label="List view" onClick={() => setList(true)}><List size={16} /></Ib></div></div>
    {items.length ? <Grid items={items} a={a} d={d} list={list} hl={dq} /> : <Empty title={live.length ? "No matches" : "Your library is empty"} hint={live.length ? "Try different words or clear the filters." : "Capture your first memory to start building your archive."} action={live.length ? <button className="text-acc underline" onClick={() => { setQ(""); setType("all"); setCol("all"); setFav(false); }}>Clear filters</button> : <button onClick={() => a.open("new")} className="rounded-xl bg-acc px-4 py-2 font-medium text-ink">Capture</button>} />}</div>);
}

function Cols({ d, live, commit, open, setOpen, a, patch }: any) {
  const [edit, setEdit] = useState<Collection | "new" | null>(null); const [name, setName] = useState(""); const [desc, setDesc] = useState(""); const [color, setColor] = useState(COLORS[0]);
  const begin = (c: Collection | "new") => { setEdit(c); setName(c === "new" ? "" : c.name); setDesc(c === "new" ? "" : c.description); setColor(c === "new" ? COLORS[d.collections.length % 5] : c.color); };
  const saveC = () => { if (!name.trim()) return; const now = Date.now(); commit((x: Data) => ({ ...x, collections: edit === "new" ? [...x.collections, { id: uid(), name: name.trim(), description: desc, color, created: now, updated: now }] : x.collections.map((c) => c.id === (edit as Collection).id ? { ...c, name: name.trim(), description: desc, color, updated: now } : c) })); setEdit(null); };
  const del = (c: Collection) => { if (!confirm(`Delete "${c.name}"? Its memories are kept.`)) return; commit((x: Data) => ({ ...x, collections: x.collections.filter((y) => y.id !== c.id), memories: x.memories.map((m) => ({ ...m, collectionIds: m.collectionIds.filter((i) => i !== c.id) })) })); setOpen(null); };
  const cnt = (c: Collection) => live.filter((m: Memory) => m.collectionIds.includes(c.id));
  const cur = d.collections.find((c: Collection) => c.id === open);
  if (cur) { const items = cnt(cur); const others = live.filter((m: Memory) => !m.collectionIds.includes(cur.id));
    return (<div className="mx-auto max-w-5xl"><button onClick={() => setOpen(null)} className="mb-2 text-sm text-acc">Back to collections</button><H sub={cur.description}>{cur.name}</H>
      {others.length > 0 && <select aria-label="Add memory" className="field mb-4 !w-auto" value="" onChange={(e) => { const m = live.find((x: Memory) => x.id === e.target.value); if (m) patch(m.id, { collectionIds: [...m.collectionIds, cur.id] }); }}><option value="">Add a memory…</option>{others.map((m: Memory) => <option key={m.id} value={m.id}>{m.title}</option>)}</select>}
      {items.length ? <Grid items={items} a={a} d={d} /> : <Empty title="This collection is empty" hint="Add existing memories above, or assign a collection while capturing." />}
      {items.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{items.map((m: Memory) => <button key={m.id} className="rounded-full border border-line px-3 py-1 text-xs text-mute hover:text-fg" onClick={() => patch(m.id, { collectionIds: m.collectionIds.filter((i) => i !== cur.id) })}>Remove {m.title.slice(0, 24)}</button>)}</div>}</div>); }
  return (<div className="mx-auto max-w-5xl"><div className="flex items-start justify-between"><H sub="Group memories by project, topic, or mood.">Collections</H><motion.button {...tap} onClick={() => begin("new")} className="rounded-xl bg-acc px-4 py-2 font-medium text-ink">New collection</motion.button></div>
    <AnimatePresence>{edit && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden"><div className="grid gap-2 rounded-2xl border border-line bg-panel p-4"><input autoFocus className="field" placeholder="Name" aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} /><input className="field" placeholder="Description" aria-label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div className="flex items-center gap-2">{COLORS.map((c) => <button key={c} aria-label={`Colour ${c}`} onClick={() => setColor(c)} style={{ background: c }} className={`h-6 w-6 rounded-full ${color === c ? "ring-2 ring-fg ring-offset-2 ring-offset-panel" : ""}`} />)}<span className="flex-1" /><button onClick={() => setEdit(null)} className="text-sm text-mute">Cancel</button><button onClick={saveC} className="rounded-lg bg-acc px-3 py-1.5 text-sm font-medium text-ink">Save</button></div></div></motion.div>}</AnimatePresence>
    {d.collections.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{d.collections.map((c: Collection) => { const it = cnt(c); const last = it.sort((x: Memory, y: Memory) => y.updated - x.updated)[0];
      return (<motion.div layout key={c.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -2 }} className="rounded-2xl border border-line bg-panel p-4 transition-colors hover:border-acc/50" style={{ borderTop: `3px solid ${c.color}` }}>
        <button className="block w-full text-left" onClick={() => setOpen(c.id)}><h3 className="font-display text-lg">{c.name}</h3><p className="text-sm text-mute">{c.description || "No description"}</p><p className="mt-3 text-xs text-mute">{it.length} {it.length === 1 ? "memory" : "memories"}{last ? ` · active ${ago(last.updated)}` : ""}</p></button>
        <div className="mt-2 flex"><button className="mr-3 text-xs text-mute hover:text-fg" onClick={() => begin(c)}>Edit</button><button className="mr-3 text-xs text-mute hover:text-fg" onClick={() => { const now = Date.now(); commit((x: Data) => ({ ...x, collections: [...x.collections, { ...c, id: uid(), name: c.name + " (copy)", created: now, updated: now }] })); }}>Duplicate</button><button className="text-xs text-mute hover:text-fg" onClick={() => del(c)}>Delete</button></div></motion.div>); })}</div>
      : <Empty title="No collections yet" hint="Create one to group related memories." />}</div>);
}

function Graph({ live, a }: any) {
  const [sel, setSel] = useState<Memory | null>(null); const [hov, setHov] = useState<string | null>(null); const [zoom, setZoom] = useState(1); const [showList, setShowList] = useState(false);
  const { nodes, edges } = useMemo(() => { const n = live.map((m: Memory, i: number) => { const ang = (i / Math.max(1, live.length)) * Math.PI * 2; const r = live.length > 1 ? 34 : 0; return { m, x: 50 + r * Math.cos(ang), y: 50 + r * Math.sin(ang) }; });
    const e: { a: any; b: any; why: string }[] = []; for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) { const r = related(n[i].m, [n[j].m]); if (r.length) e.push({ a: n[i], b: n[j], why: r[0].why.join(" ") }); } return { nodes: n, edges: e }; }, [live]);
  const rel = sel ? related(sel, live).slice(0, 5) : [];
  if (!live.length) return <div className="mx-auto max-w-5xl"><H>Knowledge graph</H><Empty title="Nothing to connect yet" hint="Save a few memories and give them shared tags or collections. Connections appear automatically." /></div>;
  return (<div className="mx-auto max-w-5xl"><H sub={edges.length ? `${nodes.length} nodes, ${edges.length} connections from tags, collections, sites, and title keywords.` : "No connections yet. Add shared tags to related items to link them."}>Knowledge graph</H>
    <div className="mb-3 flex gap-2"><button className="rounded-lg border border-line px-3 py-1 text-sm" onClick={() => setZoom((z) => Math.min(2.2, z + 0.3))}>Zoom in</button><button className="rounded-lg border border-line px-3 py-1 text-sm" onClick={() => setZoom((z) => Math.max(0.6, z - 0.3))}>Zoom out</button><button className="rounded-lg border border-line px-3 py-1 text-sm" onClick={() => { setZoom(1); setSel(null); }}>Reset</button><button className="ml-auto rounded-lg border border-line px-3 py-1 text-sm" onClick={() => setShowList(!showList)}>{showList ? "Show graph" : "Show as list"}</button></div>
    {showList ? <Grid items={live} a={a} d={{ collections: [], prefs: {} }} list /> :
    <div className="grid gap-3 md:grid-cols-[1fr_16rem]"><div className="overflow-auto rounded-2xl border border-line" style={{ background: "radial-gradient(circle at 50% 40%, var(--raised), var(--ink))" }}>
      <svg viewBox="0 0 100 100" className="mx-auto aspect-square w-full" style={{ transform: `scale(${zoom})`, transition: "transform .2s" }} role="img" aria-label="Knowledge graph">
        {edges.map((e, i) => <line key={i} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke="var(--acc)" strokeWidth={0.25} opacity={hov && ![e.a.m.id, e.b.m.id].includes(hov) ? 0.08 : 0.5} />)}
        {nodes.map((n: any) => <g key={n.m.id} tabIndex={0} role="button" aria-label={n.m.title} style={{ cursor: "pointer" }} onClick={() => setSel(n.m)} onKeyDown={(e) => e.key === "Enter" && setSel(n.m)} onMouseEnter={() => setHov(n.m.id)} onMouseLeave={() => setHov(null)}>
          <motion.circle cx={n.x} cy={n.y} animate={{ r: sel?.id === n.m.id ? 3.2 : hov === n.m.id ? 2.6 : 2 }} fill={n.m.type === "link" ? "var(--acc)" : "var(--panel)"} stroke="var(--acc)" strokeWidth={0.5} />
          <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="2.2" fill="var(--fg)">{n.m.title.slice(0, 18)}</text></g>)}</svg></div>
      <aside className="rounded-2xl border border-line bg-panel p-4 text-sm">{sel ? <><h3 className="font-display text-lg">{sel.title}</h3><p className="text-mute">{sel.type}{sel.host ? ` · ${sel.host}` : ""}</p><button className="mt-3 rounded-lg bg-acc px-3 py-1.5 font-medium text-ink" onClick={() => a.open(sel)}>Open memory</button>
        <h4 className="mt-4 text-mute">Connected to</h4>{rel.length ? rel.map((r) => <p key={r.m.id} className="mt-1"><button className="text-acc" onClick={() => setSel(r.m)}>{r.m.title}</button><span className="block text-xs text-mute">{r.why.join(" ")}</span></p>) : <p className="text-mute">No connections yet. Try adding tags.</p>}</> : <p className="text-mute">Select a node to see its details.</p>}</aside></div>}</div>);
}

function TrashView({ trash, commit }: any) {
  const restore = (id: string) => commit((x: Data) => ({ ...x, memories: x.memories.map((m) => m.id === id ? { ...m, deleted: undefined } : m) }));
  const purge = (id: string) => commit((x: Data) => ({ ...x, memories: x.memories.filter((m) => m.id !== id) }));
  return (<div className="mx-auto max-w-3xl"><div className="flex items-start justify-between"><H sub="Deleted items stay here until you remove them.">Trash</H>{trash.length > 0 && <button className="text-sm text-mute hover:text-fg" onClick={() => confirm("Permanently delete everything in Trash?") && commit((x: Data) => ({ ...x, memories: x.memories.filter((m) => !m.deleted) }))}>Empty Trash</button>}</div>
    {trash.length ? <div className="grid gap-2"><AnimatePresence>{trash.map((m: Memory) => <motion.div layout key={m.id} exit={{ opacity: 0, x: 20 }} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3"><div className="min-w-0 flex-1"><p className="truncate">{m.title}</p><p className="text-xs text-mute">Deleted {new Date(m.deleted!).toLocaleDateString()}</p></div><Ib label="Restore" onClick={() => restore(m.id)}><RotateCcw size={16} /></Ib><Ib label="Delete permanently" onClick={() => confirm("Delete this permanently?") && purge(m.id)}><X size={16} /></Ib></motion.div>)}</AnimatePresence></div> : <Empty title="Trash is empty" hint="Items you delete show up here so you can restore them." />}</div>);
}

function SettingsView({ d, commit, setTheme, toast }: any) {
  const file = useRef<HTMLInputElement>(null);
  const exp = () => { const b = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(b); const l = document.createElement("a"); l.href = u; l.download = `trace-backup-${new Date().toISOString().slice(0, 10)}.json`; l.click(); URL.revokeObjectURL(u); };
  const imp = async (f?: File) => { if (!f) return; try { const v = validate(JSON.parse(await f.text())); if (!v) throw 0; commit(() => v); toast(`Imported ${v.memories.length} memories`); } catch { toast("That file isn't a valid TRACE backup"); } if (file.current) file.current.value = ""; };
  const row = "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel p-4";
  return (<div className="mx-auto grid max-w-2xl gap-3"><H>Settings</H>
    <div className={row}><span>Theme</span><div className="flex gap-2">{(["dark", "light"] as const).map((t) => <button key={t} onClick={() => setTheme(t)} className={`rounded-lg border px-3 py-1 text-sm ${d.prefs.theme === t ? "border-acc text-fg" : "border-line text-mute"}`}>{t}</button>)}</div></div>
    <div className={row}><span>Default library view</span><div className="flex gap-2">{(["grid", "list"] as const).map((t) => <button key={t} onClick={() => commit((x: Data) => ({ ...x, prefs: { ...x.prefs, view: t } }))} className={`rounded-lg border px-3 py-1 text-sm ${d.prefs.view === t ? "border-acc text-fg" : "border-line text-mute"}`}>{t}</button>)}</div></div>
    <div className={row}><span>Backup</span><div className="flex gap-2"><button onClick={exp} className="flex items-center gap-1 rounded-lg border border-line px-3 py-1 text-sm"><Download size={14} />Export JSON</button><button onClick={() => file.current?.click()} className="flex items-center gap-1 rounded-lg border border-line px-3 py-1 text-sm"><Upload size={14} />Import JSON</button><input ref={file} type="file" accept="application/json" hidden onChange={(e) => imp(e.target.files?.[0])} /></div></div>
    <div className={row}><span>Shortcuts</span><span className="text-sm text-mute">N capture · Ctrl/Cmd K search · Esc close</span></div>
    <div className={row}><span>Clear all local data</span><button onClick={() => { if (confirm("This permanently deletes all memories and collections in this browser. Export first if you need a backup.")) { clearAll(); commit(() => empty()); toast("All local data cleared"); } }} className="rounded-lg border border-red-400/50 px-3 py-1 text-sm text-red-400">Clear data</button></div>
    <p className="text-sm text-mute">Your saved memories are stored locally in this browser. They are not automatically synced to other devices. Clearing site data in your browser will remove them, so export backups regularly.</p></div>);
}

function Capture({ item, d, live, onClose, onSave, a }: any) {
  const [type, setType] = useState<MType>(item?.type ?? "link"); const [title, setTitle] = useState(item?.title ?? ""); const [url, setUrl] = useState(item?.url ?? ""); const [body, setBody] = useState(item?.body ?? "");
  const [desc, setDesc] = useState(item?.description ?? ""); const [tags, setTags] = useState((item?.tags ?? []).join(", ")); const [cid, setCid] = useState(item?.collectionIds?.[0] ?? ""); const [fav, setFav] = useState(item?.fav ?? false); const [lang, setLang] = useState(item?.lang ?? ""); const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = () => {
    let u = ""; if (type === "link") { u = normUrl(url); if (!u) return setErr("Enter a valid link, like example.com/article."); }
    const t = title.trim() || (u ? hostOf(u) : body.trim().slice(0, 60)); if (!t) return setErr("Add a title or some content.");
    setBusy(true); const now = Date.now();
    setTimeout(() => onSave({ id: item?.id ?? uid(), type, title: t, url: u || undefined, host: u ? hostOf(u) : undefined, body, description: desc, tags: tags.split(",").map((s: string) => s.trim().replace(/^#/, "")).filter(Boolean), collectionIds: cid ? [cid] : [], fav, created: item?.created ?? now, updated: now, lang: lang || undefined }), 180);
  };
  const rel = item ? related(item, live).slice(0, 4) : [];
  return (<motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <motion.div role="dialog" aria-modal="true" aria-label={item ? "Edit memory" : "Quick capture"} className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-3xl border border-line bg-panel p-5 sm:rounded-2xl" initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.18 }}>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl">{item ? "Edit memory" : "Capture"}</h2><Ib label="Close" onClick={onClose}><X size={18} /></Ib></div>
      <div className="mb-3 flex flex-wrap gap-1" role="tablist">{TYPES.map((t) => <button key={t.id} role="tab" aria-selected={type === t.id} onClick={() => setType(t.id)} className={`relative flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm ${type === t.id ? "text-fg" : "text-mute"}`}>{type === t.id && <motion.span layoutId="tab" className="absolute inset-0 rounded-lg bg-raised" />}<t.icon size={14} className="relative" /><span className="relative">{t.label}</span></button>)}</div>
      <div className="grid gap-2">
        {(type === "link" || type === "reference") && <input autoFocus className="field" aria-label="Link" placeholder={type === "link" ? "Paste a link" : "Source link (optional)"} value={url} onChange={(e) => { setUrl(e.target.value); setErr(""); if (!title && normUrl(e.target.value)) setTitle(hostOf(normUrl(e.target.value))); }} />}
        <input className="field" aria-label="Title" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        {type === "code" && <input className="field" aria-label="Language" placeholder="Language (e.g. TypeScript)" value={lang} onChange={(e) => setLang(e.target.value)} />}
        <textarea className={`field min-h-24 ${type === "code" ? "font-mono text-sm" : ""}`} aria-label="Content" placeholder={type === "quote" ? "The quotation" : type === "code" ? "Paste code" : "Notes"} value={body} onChange={(e) => setBody(e.target.value)} />
        <input className="field" aria-label="Description" placeholder="Short description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <input className="field" aria-label="Tags" placeholder="Tags, separated by commas" value={tags} onChange={(e) => setTags(e.target.value)} />
        <div className="flex items-center gap-2"><select aria-label="Collection" className="field" value={cid} onChange={(e) => setCid(e.target.value)}><option value="">No collection</option>{d.collections.map((c: Collection) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button aria-pressed={fav} aria-label="Favourite" onClick={() => setFav(!fav)} className="rounded-lg border border-line p-2.5"><Star size={16} className={fav ? "fill-acc text-acc" : "text-mute"} /></button></div>
        {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
        <motion.button {...tap} whileHover={{ y: -1 }} disabled={busy} onClick={submit} className="mt-1 rounded-xl bg-acc py-2.5 font-medium text-ink disabled:opacity-50">{busy ? "Saving…" : item ? "Save changes" : "Save memory"}</motion.button></div>
      {item && <div className="mt-5 border-t border-line pt-3"><h3 className="mb-2 text-sm text-mute">Related memories</h3>{rel.length ? rel.map((r) => <button key={r.m.id} onClick={() => a.open(r.m)} className="mb-1 block w-full rounded-lg p-2 text-left hover:bg-raised"><span className="text-sm">{r.m.title}</span><span className="block text-xs text-mute">{r.why.join(" ")}</span></button>) : <p className="text-sm text-mute">Nothing related yet. Shared tags, collections, or title words will link items.</p>}
        <p className="mt-2 text-xs text-mute">Created {new Date(item.created).toLocaleString()} · Edited {new Date(item.updated).toLocaleString()}{item.url && <> · <a className="text-acc underline" href={item.url} target="_blank" rel="noopener noreferrer">Open link</a></>}</p></div>}
    </motion.div></motion.div>);
}

function Onboarding({ done }: { done: () => void }) {
  const [i, setI] = useState(0);
  const S = [["A memory layer for the internet", "Save links, notes, quotes, and code. Find them later. Connect the dots."], ["Capture in seconds", "Press N anywhere, or paste a link into the overview box."], ["Organize with collections and tags", "Shared tags and collections are what draw the lines in your graph."], ["Search and explore", "Press Ctrl/Cmd K to search. Open the knowledge graph to see how ideas connect."]];
  return (<motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div role="dialog" aria-label="Welcome to TRACE" className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 text-center"><div className="mb-3 flex justify-center"><Logo /></div>
    <AnimatePresence mode="wait"><motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.15 }}><h2 className="font-display text-2xl">{S[i][0]}</h2><p className="mt-2 text-mute">{S[i][1]}</p></motion.div></AnimatePresence>
    <div className="mt-6 flex items-center justify-between"><button onClick={done} className="text-sm text-mute">Skip</button><motion.button {...tap} onClick={() => (i < 3 ? setI(i + 1) : done())} className="rounded-xl bg-acc px-5 py-2 font-medium text-ink">{i < 3 ? "Next" : "Start using TRACE"}</motion.button></div></div></motion.div>);
}
