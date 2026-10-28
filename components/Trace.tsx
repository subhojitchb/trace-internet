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
    <nav className="flex h-full flex-col gap-1 p-2 md:items-center" aria-label="Main">
      <div className="flex items-center gap-2 px-2 py-3"><Logo /><span className="font-display text-lg md:hidden">TRACE</span></div>
      <motion.button {...tap} title="Quick capture (N)" aria-label="Quick capture" onClick={() => { setOpen("new"); setNav(false); }} className="mb-3 flex items-center gap-2 rounded-sm border border-acc px-3 py-2 text-acc transition-colors hover:bg-acc hover:text-ink md:h-10 md:w-10 md:justify-center md:p-0"><Plus size={16} /><span className="md:hidden">Capture</span></motion.button>
      {NAV.map((n) => (
        <button key={n.id} title={n.label} aria-label={n.label} onClick={() => go(n.id)} className={`group relative flex items-center gap-3 rounded-sm px-3 py-2 text-left text-sm transition-colors md:h-10 md:w-10 md:justify-center md:p-0 ${view === n.id ? "text-fg" : "text-mute hover:text-fg"}`}>
          {view === n.id && <motion.span layoutId="ind" className="absolute inset-y-1 -left-0.5 w-0.5 bg-acc" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          <n.icon size={17} /><span className="md:hidden">{n.label}</span>
          {n.id === "trash" && trash.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-acc md:absolute md:right-1.5 md:top-1.5" />}
        </button>))}
    </nav>);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-14 shrink-0 border-r border-line bg-ink md:block">{Side}</aside>
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
        <AnimatePresence>{toast && (<motion.div role="status" className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-sm border border-line bg-raised px-4 py-2 text-sm shadow-xl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
          <Check size={14} className="text-acc" />{toast.msg}{toast.undo && <button className="font-medium text-acc" onClick={() => { toast.undo!(); setToast(null); }}>Undo</button>}</motion.div>)}</AnimatePresence>
        {!d.prefs.onboarded && <Onboarding done={() => commit((x) => ({ ...x, prefs: { ...x.prefs, onboarded: true } }))} />}
      </div>
    </MotionConfig>);
}

function Logo() { return (<svg width="26" height="26" viewBox="0 0 32 32" aria-hidden><path d="M5 22 L13 12 L19 18 L27 7" fill="none" stroke="var(--acc)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="5" cy="22" r="2.6" fill="var(--acc)" /><circle cx="13" cy="12" r="2.2" fill="var(--ink)" stroke="var(--acc)" strokeWidth="1.6" /><circle cx="27" cy="7" r="2.6" fill="var(--acc)" /></svg>); }
const Empty = ({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) => (<div className="rounded-sm border border-dashed border-line p-10 text-center"><p className="font-display text-lg">{title}</p><p className="mx-auto mt-1 max-w-sm text-sm text-mute">{hint}</p>{action && <div className="mt-4">{action}</div>}</div>);
const H = ({ children, sub }: any) => (<div className="mb-6"><h1 className="font-display text-2xl tracking-tight">{children}</h1>{sub && <p className="mt-1 text-sm text-mute">{sub}</p>}</div>);

function Card({ m, a, list, hl }: any) {
  const I = icon(m.type);
  const mark = (x: string) => { if (!hl) return x; const i = x.toLowerCase().indexOf(hl.toLowerCase()); return i < 0 ? x : <>{x.slice(0, i)}<mark className="bg-acc/30 text-fg">{x.slice(i, i + hl.length)}</mark>{x.slice(i + hl.length)}</>; };
  const meta = <span className="flex items-center gap-2 font-mono text-xs text-mute"><I size={12} className="text-acc" />{m.type === "link" ? <span className="text-acc underline decoration-acc/40 underline-offset-2">{m.host}</span> : m.type === "code" ? m.lang || "code" : m.type}<span>·</span>{ago(m.created)}{m.tags.map((t: string) => <span key={t}>#{t}</span>)}</span>;
  return (
    <motion.article initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className="group relative break-inside-avoid border-b border-line py-4 pl-3 transition-colors hover:bg-raised/40">
      <button className="absolute inset-0" aria-label={`Open ${m.title}`} onClick={() => a.open(m)} />
      <div className={`relative ${list ? "flex items-center gap-4" : ""}`}>
        <div className="min-w-0 flex-1">
          {m.type === "quote" ? <><blockquote className="border-l border-acc pl-4 font-display text-xl italic leading-snug">“{mark(m.body || m.title)}”</blockquote><p className="mt-2 pl-4 text-sm text-mute">{m.body ? mark(m.title) : ""}</p></>
            : <><h3 className="truncate font-display text-lg leading-tight">{mark(m.title)}</h3>
              {m.type === "code" ? <pre className="mt-2 max-h-24 overflow-hidden border-l border-acc bg-raised/60 p-2 font-mono text-xs text-mute">{m.body}</pre> : (m.description || m.body) && <p className={`mt-1 text-sm text-mute ${list ? "truncate" : "line-clamp-2"}`}>{mark(m.description || m.body)}</p>}</>}
          <div className="mt-2">{meta}</div>
        </div>
        <div className="flex items-center md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          <Ib label={m.fav ? "Remove favourite" : "Favourite"} onClick={() => a.fav(m)}><Star size={15} className={m.fav ? "fill-acc text-acc" : ""} /></Ib>
          <Ib label="Copy" onClick={() => a.copy(m)}><Copy size={15} /></Ib><Ib label="Duplicate" onClick={() => a.dup(m)}><LayoutGrid size={15} /></Ib>
          <Ib label="Move to Trash" onClick={() => a.remove(m)}><Trash2 size={15} /></Ib></div>
      </div>
    </motion.article>);
}
const Ib = ({ label, onClick, children }: any) => (<motion.button {...tap} whileHover={{ scale: 1.1 }} aria-label={label} title={label} onClick={onClick} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-raised hover:text-fg">{children}</motion.button>);
const Grid = ({ items, a, d, list, hl }: any) => (<div className={list ? "" : "md:columns-2 md:gap-10"}><AnimatePresence initial={false}>{items.map((m: Memory) => <Card key={m.id} m={m} a={a} list={list} hl={hl} />)}</AnimatePresence></div>);

function Overview({ live, d, a, go, quick }: any) {
  const [t, setT] = useState("");
  const week = Date.now() - 7 * 864e5;
  const recent = useMemo(() => [...live].sort((x: Memory, y: Memory) => y.created - x.created).slice(0, 6), [live]);
  const edges = useMemo(() => { const e: number[][] = []; for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (related(live[i], [live[j]]).length) e.push([i, j]); return e; }, [live]);
  const pos = (i: number) => { const g = (i / live.length) * Math.PI * 2; return [50 + 38 * Math.cos(g), 50 + 38 * Math.sin(g)]; };
  const counts = TYPES.map((x) => ({ ...x, n: live.filter((m: Memory) => m.type === x.id).length }));
  const top = Math.max(1, ...counts.map((c) => c.n));
  return (<div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_15rem]">
    <div>
      <p className="font-mono text-xs text-mute">{live.length} kept · {d.collections.length} collections · {live.filter((m: Memory) => m.fav).length} starred · {live.filter((m: Memory) => m.created > week).length} this week</p>
      <form onSubmit={(e) => { e.preventDefault(); if (t.trim()) { quick(t.trim()); setT(""); } }} className="mt-3 flex items-end gap-3"><input value={t} onChange={(e) => setT(e.target.value)} aria-label="Quick capture" placeholder="Paste a link or write a thought…" className="field font-display text-2xl" /><motion.button {...tap} className="pb-2 text-sm text-acc">Keep</motion.button></form>
      <h2 className="mb-1 mt-8 text-sm text-mute">Latest</h2>
      {recent.length ? <Grid items={recent} a={a} d={d} /> : <Empty title="The archive is empty" hint="Press N, or type above. Links, notes, quotes and snippets all belong here." />}
    </div>
    <aside className="space-y-8 lg:pt-6">
      <section><h2 className="mb-2 text-sm text-mute">Kinds of memory</h2>{counts.map((c) => <div key={c.id} className="flex items-center gap-2 py-1 text-sm"><c.icon size={13} className="text-acc" /><span className="w-16 text-mute">{c.label}</span><div className="h-px flex-1 bg-line"><motion.div className="h-px bg-acc" initial={false} animate={{ width: `${(c.n / top) * 100}%` }} /></div><span className="font-mono text-xs">{c.n}</span></div>)}</section>
      <section><h2 className="mb-2 text-sm text-mute">Threads</h2>
        {live.length > 1 ? <button onClick={() => go("graph")} className="block w-full text-left" aria-label="Open knowledge graph"><svg viewBox="0 0 100 100" className="w-full">{edges.map(([i, j], k) => { const [x1, y1] = pos(i), [x2, y2] = pos(j); return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--acc)" strokeWidth={0.4} opacity={0.6} />; })}{live.map((m: Memory, i: number) => { const [x, y] = pos(i); return <circle key={m.id} cx={x} cy={y} r={1.8} fill="var(--ink)" stroke="var(--acc)" strokeWidth={0.6} />; })}</svg><p className="font-mono text-xs text-mute">{edges.length} {edges.length === 1 ? "connection" : "connections"}. Open graph</p></button> : <p className="text-sm text-mute">Connections appear once you keep two or more memories.</p>}</section>
    </aside></div>);
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
    {items.length ? <Grid items={items} a={a} d={d} list={list} hl={dq} /> : <Empty title={live.length ? "No matches" : "Your library is empty"} hint={live.length ? "Try different words or clear the filters." : "Capture your first memory to start building your archive."} action={live.length ? <button className="text-acc underline" onClick={() => { setQ(""); setType("all"); setCol("all"); setFav(false); }}>Clear filters</button> : <button onClick={() => a.open("new")} className="rounded-sm bg-acc px-4 py-2 font-medium text-ink">Capture</button>} />}</div>);
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
  return (<div className="mx-auto max-w-5xl"><div className="flex items-start justify-between"><H sub="Group memories by project, topic, or mood.">Collections</H><motion.button {...tap} onClick={() => begin("new")} className="rounded-sm bg-acc px-4 py-2 font-medium text-ink">New collection</motion.button></div>
    <AnimatePresence>{edit && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden"><div className="grid gap-2 rounded-sm border border-line bg-panel p-4"><input autoFocus className="field" placeholder="Name" aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} /><input className="field" placeholder="Description" aria-label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div className="flex items-center gap-2">{COLORS.map((c) => <button key={c} aria-label={`Colour ${c}`} onClick={() => setColor(c)} style={{ background: c }} className={`h-6 w-6 rounded-full ${color === c ? "ring-2 ring-fg ring-offset-2 ring-offset-panel" : ""}`} />)}<span className="flex-1" /><button onClick={() => setEdit(null)} className="text-sm text-mute">Cancel</button><button onClick={saveC} className="rounded-lg bg-acc px-3 py-1.5 text-sm font-medium text-ink">Save</button></div></div></motion.div>}</AnimatePresence>
    {d.collections.length ? <div className="divide-y divide-line border-y border-line">{d.collections.map((c: Collection) => { const it = cnt(c); const last = it.sort((x: Memory, y: Memory) => y.updated - x.updated)[0];
      return (<motion.div layout key={c.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -2 }} className="py-4 pl-4 transition-colors hover:bg-raised/40" style={{ borderLeft: `2px solid ${c.color}` }}>
        <button className="block w-full text-left" onClick={() => setOpen(c.id)}><h3 className="font-display text-lg">{c.name}</h3><p className="text-sm text-mute">{c.description || "No description"}</p><p className="mt-3 text-xs text-mute">{it.length} {it.length === 1 ? "memory" : "memories"}{last ? ` · active ${ago(last.updated)}` : ""}</p></button>
        <div className="mt-2 flex"><button className="mr-3 text-xs text-mute hover:text-fg" onClick={() => begin(c)}>Edit</button><button className="mr-3 text-xs text-mute hover:text-fg" onClick={() => { const now = Date.now(); commit((x: Data) => ({ ...x, collections: [...x.collections, { ...c, id: uid(), name: c.name + " (copy)", created: now, updated: now }] })); }}>Duplicate</button><button className="text-xs text-mute hover:text-fg" onClick={() => del(c)}>Delete</button></div></motion.div>); })}</div>
      : <Empty title="No collections yet" hint="Create one to group related memories." />}</div>);
}

const Shape = ({ t, x, y, r, on }: any) => { const p = { fill: on ? "var(--acc)" : "var(--ink)", stroke: "var(--acc)", strokeWidth: 0.35, style: { transition: "all .15s" } };
  if (t === "note") return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} {...p} />;
  if (t === "quote") return <polygon points={`${x},${y - r * 1.3} ${x + r * 1.3},${y} ${x},${y + r * 1.3} ${x - r * 1.3},${y}`} {...p} />;
  if (t === "code") return <polygon points={`${x},${y - r * 1.3} ${x + r * 1.2},${y + r} ${x - r * 1.2},${y + r}`} {...p} />;
  if (t === "reference") return <><circle cx={x} cy={y} r={r + 0.9} fill="none" stroke="var(--acc)" strokeWidth={0.2} /><circle cx={x} cy={y} r={r * 0.6} {...p} /></>;
  return <circle cx={x} cy={y} r={r} {...p} />; };
function Graph({ live, a }: any) {
  const [sel, setSel] = useState<Memory | null>(null); const [hov, setHov] = useState<string | null>(null); const [zoom, setZoom] = useState(1); const [showList, setShowList] = useState(false);
  const { nodes, edges } = useMemo(() => { const n = live.map((m: Memory, i: number) => { const ang = (i / Math.max(1, live.length)) * Math.PI * 2; const r = live.length > 1 ? 34 : 0; return { m, x: 50 + r * Math.cos(ang), y: 50 + r * Math.sin(ang) }; });
    const e: { a: any; b: any; why: string }[] = []; for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) { const r = related(n[i].m, [n[j].m]); if (r.length) e.push({ a: n[i], b: n[j], why: r[0].why.join(" ") }); } return { nodes: n, edges: e }; }, [live]);
  const rel = sel ? related(sel, live).slice(0, 5) : [];
  if (live.length < 2) return <div className="mx-auto max-w-5xl"><H>Knowledge graph</H><Empty title="A constellation needs at least two stars" hint="Save a couple of memories and give them shared tags or collections. Connections appear automatically." /></div>;
  return (<div className="mx-auto max-w-5xl"><H sub={edges.length ? `${nodes.length} nodes, ${edges.length} connections from tags, collections, sites, and title keywords.` : "No connections yet. Add shared tags to related items to link them."}>Knowledge graph</H>
    <div className="mb-3 flex gap-2"><button className="rounded-lg border border-line px-3 py-1 text-sm" onClick={() => setZoom((z) => Math.min(2.2, z + 0.3))}>Zoom in</button><button className="rounded-lg border border-line px-3 py-1 text-sm" onClick={() => setZoom((z) => Math.max(0.6, z - 0.3))}>Zoom out</button><button className="rounded-lg border border-line px-3 py-1 text-sm" onClick={() => { setZoom(1); setSel(null); }}>Reset</button><button className="ml-auto rounded-lg border border-line px-3 py-1 text-sm" onClick={() => setShowList(!showList)}>{showList ? "Show graph" : "Show as list"}</button></div>
    {showList ? <Grid items={live} a={a} d={{ collections: [], prefs: {} }} list /> :
    <div className="grid gap-3 md:grid-cols-[1fr_16rem]"><div className="overflow-auto border border-line" style={{ backgroundImage: "radial-gradient(var(--line) 0.6px, transparent 0.6px)", backgroundSize: "14px 14px" }}>
      <svg viewBox="0 0 100 100" className="mx-auto aspect-square w-full" style={{ transform: `scale(${zoom})`, transition: "transform .2s" }} role="img" aria-label="Knowledge graph">
        {edges.map((e, i) => <line key={i} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke="var(--acc)" strokeWidth={0.12} opacity={hov && ![e.a.m.id, e.b.m.id].includes(hov) ? 0.08 : 0.5} />)}
        {nodes.map((n: any) => <g key={n.m.id} tabIndex={0} role="button" aria-label={n.m.title} style={{ cursor: "pointer" }} onClick={() => setSel(n.m)} onKeyDown={(e) => e.key === "Enter" && setSel(n.m)} onMouseEnter={() => setHov(n.m.id)} onMouseLeave={() => setHov(null)}>
          <Shape t={n.m.type} x={n.x} y={n.y} r={sel?.id === n.m.id ? 2.8 : hov === n.m.id ? 2.4 : 1.8} on={sel?.id === n.m.id} />
          <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="1.8" fill="var(--mute)">{n.m.title.slice(0, 18)}</text></g>)}</svg></div>
      <aside className="rounded-sm border border-line bg-panel p-4 text-sm">{sel ? <><h3 className="font-display text-lg">{sel.title}</h3><p className="text-mute">{sel.type}{sel.host ? ` · ${sel.host}` : ""}</p><button className="mt-3 rounded-lg bg-acc px-3 py-1.5 font-medium text-ink" onClick={() => a.open(sel)}>Open memory</button>
        <h4 className="mt-4 text-mute">Connected to</h4>{rel.length ? rel.map((r) => <p key={r.m.id} className="mt-1"><button className="text-acc" onClick={() => setSel(r.m)}>{r.m.title}</button><span className="block text-xs text-mute">{r.why.join(" ")}</span></p>) : <p className="text-mute">No connections yet. Try adding tags.</p>}</> : <p className="text-mute">Select a node to see its details.</p>}</aside></div>}</div>);
}

function TrashView({ trash, commit }: any) {
  const restore = (id: string) => commit((x: Data) => ({ ...x, memories: x.memories.map((m) => m.id === id ? { ...m, deleted: undefined } : m) }));
  const purge = (id: string) => commit((x: Data) => ({ ...x, memories: x.memories.filter((m) => m.id !== id) }));
  return (<div className="mx-auto max-w-3xl"><div className="flex items-start justify-between"><H sub="Deleted items stay here until you remove them.">Trash</H>{trash.length > 0 && <button className="text-sm text-mute hover:text-fg" onClick={() => confirm("Permanently delete everything in Trash?") && commit((x: Data) => ({ ...x, memories: x.memories.filter((m) => !m.deleted) }))}>Empty Trash</button>}</div>
    {trash.length ? <div className="grid gap-2"><AnimatePresence>{trash.map((m: Memory) => <motion.div layout key={m.id} exit={{ opacity: 0, x: 20 }} className="flex items-center gap-3 rounded-sm border border-line bg-panel p-3"><div className="min-w-0 flex-1"><p className="truncate">{m.title}</p><p className="text-xs text-mute">Deleted {new Date(m.deleted!).toLocaleDateString()}</p></div><Ib label="Restore" onClick={() => restore(m.id)}><RotateCcw size={16} /></Ib><Ib label="Delete permanently" onClick={() => confirm("Delete this permanently?") && purge(m.id)}><X size={16} /></Ib></motion.div>)}</AnimatePresence></div> : <Empty title="Trash is empty" hint="Items you delete show up here so you can restore them." />}</div>);
}

function SettingsView({ d, commit, setTheme, toast }: any) {
  const file = useRef<HTMLInputElement>(null);
  const exp = () => { const b = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(b); const l = document.createElement("a"); l.href = u; l.download = `trace-backup-${new Date().toISOString().slice(0, 10)}.json`; l.click(); URL.revokeObjectURL(u); };
  const imp = async (f?: File) => { if (!f) return; try { const v = validate(JSON.parse(await f.text())); if (!v) throw 0; commit(() => v); toast(`Imported ${v.memories.length} memories`); } catch { toast("That file isn't a valid TRACE backup"); } if (file.current) file.current.value = ""; };
  const row = "flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line bg-panel p-4";
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
    <motion.div role="dialog" aria-modal="true" aria-label={item ? "Edit memory" : "Quick capture"} className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-3xl border border-line bg-panel p-5 sm:rounded-sm" initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.18 }}>
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
        <motion.button {...tap} whileHover={{ y: -1 }} disabled={busy} onClick={submit} className="mt-1 rounded-sm bg-acc py-2.5 font-medium text-ink disabled:opacity-50">{busy ? "Saving…" : item ? "Save changes" : "Save memory"}</motion.button></div>
      {item && <div className="mt-5 border-t border-line pt-3"><h3 className="mb-2 text-sm text-mute">Related memories</h3>{rel.length ? rel.map((r) => <button key={r.m.id} onClick={() => a.open(r.m)} className="mb-1 block w-full rounded-lg p-2 text-left hover:bg-raised"><span className="text-sm">{r.m.title}</span><span className="block text-xs text-mute">{r.why.join(" ")}</span></button>) : <p className="text-sm text-mute">Nothing related yet. Shared tags, collections, or title words will link items.</p>}
        <p className="mt-2 text-xs text-mute">Created {new Date(item.created).toLocaleString()} · Edited {new Date(item.updated).toLocaleString()}{item.url && <> · <a className="text-acc underline" href={item.url} target="_blank" rel="noopener noreferrer">Open link</a></>}</p></div>}
    </motion.div></motion.div>);
}

function Onboarding({ done }: { done: () => void }) {
  const [i, setI] = useState(0);
  const S = [["A memory layer for the internet", "Save links, notes, quotes, and code. Find them later. Connect the dots."], ["Capture in seconds", "Press N anywhere, or paste a link into the overview box."], ["Organize with collections and tags", "Shared tags and collections are what draw the lines in your graph."], ["Search and explore", "Press Ctrl/Cmd K to search. Open the knowledge graph to see how ideas connect."]];
  return (<motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div role="dialog" aria-label="Welcome to TRACE" className="w-full max-w-md rounded-sm border border-line bg-panel p-6 text-center"><div className="mb-3 flex justify-center"><Logo /></div>
    <AnimatePresence mode="wait"><motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.15 }}><h2 className="font-display text-2xl">{S[i][0]}</h2><p className="mt-2 text-mute">{S[i][1]}</p></motion.div></AnimatePresence>
    <div className="mt-6 flex items-center justify-between"><button onClick={done} className="text-sm text-mute">Skip</button><motion.button {...tap} onClick={() => (i < 3 ? setI(i + 1) : done())} className="rounded-sm bg-acc px-5 py-2 font-medium text-ink">{i < 3 ? "Next" : "Start using TRACE"}</motion.button></div></div></motion.div>);
}
