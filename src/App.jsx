import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";

// ─── SUPABASE DATA LAYER ─────────────────────────────────────────────────────

const fetchTasks = async () => {
  return await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
};

const addTask = async (task) => {
  return await supabase
    .from("tasks")
    .insert([task])
    .select()
    .single();
};

const updateTask = async (id, patch) => {
  return await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id);
};

const deleteTask = async (id) => {
  return await supabase
    .from("tasks")
    .delete()
    .eq("id", id);
};

// ─── AI AUTO-FILL (via Supabase Edge Function) ──────────────────────────────
async function aiAutoFill(prompt) {
  const res = await fetch(
    `${supabase.functionsUrl}/ai-autofill`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabase.supabaseKey}`,
      },
      body: JSON.stringify({ prompt }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `AI request failed (${res.status})`);
  }
  return await res.json();
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const STATUSES = [
  { key: "broke",    label: "BROKE",    next: "fixed",    emoji: "🔴", color: "#ff4444" },
  { key: "fixed",    label: "FIXED",    next: null,       emoji: "✅", color: "#00c896" },
  { key: "open",     label: "OPEN",     next: "closed",   emoji: "🟡", color: "#ffc107" },
  { key: "closed",   label: "CLOSED",   next: null,       emoji: "✅", color: "#00c896" },
  { key: "lost",     label: "LOST",     next: "found",    emoji: "🔵", color: "#4488ff" },
  { key: "found",    label: "FOUND",    next: null,       emoji: "✅", color: "#00c896" },
  { key: "dirty",    label: "DIRTY",    next: "cleaned",  emoji: "🟠", color: "#ff8c42" },
  { key: "cleaned",  label: "CLEANED",  next: null,       emoji: "✅", color: "#00c896" },
  { key: "pending",  label: "PENDING",  next: "complete", emoji: "⏳", color: "#a78bfa" },
  { key: "complete", label: "COMPLETE", next: null,       emoji: "✅", color: "#00c896" },
  { key: "draft",    label: "DRAFT",    next: "sent",     emoji: "📝", color: "#38bdf8" },
  { key: "sent",     label: "SENT",     next: null,       emoji: "✅", color: "#00c896" },
  { key: "idea",     label: "IDEA",     next: "launched", emoji: "💡", color: "#f472b6" },
  { key: "launched", label: "LAUNCHED", next: null,       emoji: "✅", color: "#00c896" },
];

const STATUS_PAIRS = [
  { from: "broke",   to: "fixed",    label: "BROKE → FIXED",      desc: "Something broken that needs repair" },
  { from: "open",    to: "closed",   label: "OPEN → CLOSED",      desc: "Active issue that needs resolution" },
  { from: "lost",    to: "found",    label: "LOST → FOUND",       desc: "Missing document, item, or info" },
  { from: "dirty",   to: "cleaned",  label: "DIRTY → CLEANED",    desc: "Cleanup or organization task" },
  { from: "pending", to: "complete", label: "PENDING → COMPLETE", desc: "Waiting on someone else to act" },
  { from: "draft",   to: "sent",     label: "DRAFT → SENT",       desc: "Letter, email, or filing to send" },
  { from: "idea",    to: "launched", label: "IDEA → LAUNCHED",    desc: "Project or build to get off the ground" },
];

const PRIORITIES = [
  { key: "high",   label: "HIGH", color: "#ff4444", icon: "🔥" },
  { key: "medium", label: "MED",  color: "#ffc107", icon: "⚡" },
  { key: "low",    label: "LOW",  color: "#5a5a7a", icon: "🌀" },
];

const CATEGORIES = ["Business", "Personal"];
const STATUS_MAP   = Object.fromEntries(STATUSES.map(s => [s.key, s]));
const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map(p => [p.key, p]));

function now() { return new Date().toISOString(); }
function logEntry(text) { return { timestamp: now(), text }; }

// ─── THEMES ─────────────────────────────────────────────────────────────────
const THEMES = {
  midnight: {
    name: "Midnight", mode: "dark",
    bg: "#0a0a0f", surface: "#111118", border: "#1e1e2e",
    text: "#e8e8f0", muted: "#5a5a7a", accent: "#7c6af7",
    accentGlow: "rgba(124,106,247,0.2)",
    font: "'DM Mono','Courier New',monospace",
    fontDisplay: "'Syne','Arial Black',sans-serif",
  },
  daylight: {
    name: "Daylight", mode: "light",
    bg: "#f4f4f8", surface: "#ffffff", border: "#e0e0ea",
    text: "#0a0a0f", muted: "#8888aa", accent: "#7c6af7",
    accentGlow: "rgba(124,106,247,0.12)",
    font: "'DM Mono','Courier New',monospace",
    fontDisplay: "'Syne','Arial Black',sans-serif",
  },
  forest: {
    name: "Forest", mode: "dark",
    bg: "#0b1210", surface: "#121f1c", border: "#1e3330",
    text: "#d4ede8", muted: "#4a7a72", accent: "#2dd4a0",
    accentGlow: "rgba(45,212,160,0.18)",
    font: "'DM Mono','Courier New',monospace",
    fontDisplay: "'Syne','Arial Black',sans-serif",
  },
  ember: {
    name: "Ember", mode: "dark",
    bg: "#110a08", surface: "#1c1210", border: "#2e1e1a",
    text: "#f0ddd8", muted: "#7a4a42", accent: "#ff6b42",
    accentGlow: "rgba(255,107,66,0.18)",
    font: "'DM Mono','Courier New',monospace",
    fontDisplay: "'Syne','Arial Black',sans-serif",
  },
  arctic: {
    name: "Arctic", mode: "light",
    bg: "#eef4f8", surface: "#ffffff", border: "#ccdde8",
    text: "#0a1520", muted: "#7a9ab0", accent: "#0077cc",
    accentGlow: "rgba(0,119,204,0.12)",
    font: "'DM Mono','Courier New',monospace",
    fontDisplay: "'Syne','Arial Black',sans-serif",
  },
  gold: {
    name: "Gold", mode: "dark",
    bg: "#0f0e08", surface: "#1a1810", border: "#2e2a18",
    text: "#f0ead0", muted: "#7a7248", accent: "#d4a820",
    accentGlow: "rgba(212,168,32,0.18)",
    font: "'DM Mono','Courier New',monospace",
    fontDisplay: "'Syne','Arial Black',sans-serif",
  },
  rose: {
    name: "Rose", mode: "light",
    bg: "#fdf4f6", surface: "#ffffff", border: "#f0d8de",
    text: "#1a080d", muted: "#b07888", accent: "#d4205a",
    accentGlow: "rgba(212,32,90,0.1)",
    font: "'DM Mono','Courier New',monospace",
    fontDisplay: "'Syne','Arial Black',sans-serif",
  },
  slate: {
    name: "Slate", mode: "dark",
    bg: "#0d1117", surface: "#161b22", border: "#21262d",
    text: "#e6edf3", muted: "#6e7681", accent: "#58a6ff",
    accentGlow: "rgba(88,166,255,0.18)",
    font: "'DM Mono','Courier New',monospace",
    fontDisplay: "'Syne','Arial Black',sans-serif",
  },
  sandstone: {
    name: "Sand & Stone", mode: "light",
    bg: "#faf6f0", surface: "#ffffff", border: "#e8ddd0",
    text: "#1a1208", muted: "#9a8878", accent: "#a07850",
    accentGlow: "rgba(160,120,80,0.12)",
    font: "'DM Mono','Courier New',monospace",
    fontDisplay: "'Syne','Arial Black',sans-serif",
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  return new Date(iso).toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
}

// ─── BLANK FORM STATE ─────────────────────────────────────────────────────────
const BLANK = { title:"", category:"Business", status:"broke", priority:"medium", due_date:"", notes:"", blocked_by:[] };

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function TaskTracker() {
  const [themeKey, setThemeKey] = useState(() => {
    return localStorage.getItem("lcc-theme") || "midnight";
  });
  const [tasks,          setTasks]          = useState([]);
  const [filter,         setFilter]         = useState("all");
  const [catFilter,      setCatFilter]      = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showResolved,   setShowResolved]   = useState(false);
  const [dueFilter,      setDueFilter]      = useState("all");  // all | week | today | overdue
  const [expandedId,     setExpandedId]     = useState(null);
  const [loading,        setLoading]        = useState(true);

  // ─── DESIGN TOKENS (reactive) ──────────────────────────────────────────────
  const G = THEMES[themeKey];

  const base = {
    root:       { minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.font, padding: "0 0 80px 0" },
    header:     { borderBottom: `1px solid ${G.border}`, padding: "24px 20px 16px", position: "sticky", top: 0, background: G.bg, zIndex: 100 },
    logo:       { fontFamily: G.fontDisplay, fontSize: "11px", letterSpacing: "4px", color: G.accent, textTransform: "uppercase", margin: 0 },
    headline:   { fontFamily: G.fontDisplay, fontSize: "22px", fontWeight: 900, margin: "4px 0 0", letterSpacing: "-0.5px", color: G.text },
    filterRow:  { display: "flex", gap: "8px", padding: "10px 20px", overflowX: "auto", borderBottom: `1px solid ${G.border}` },
    taskList:   { padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" },
    statsRow:   { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", padding: "12px 20px", borderBottom: `1px solid ${G.border}` },
    statBox:    { background: G.surface, border: `1px solid ${G.border}`, borderRadius: "8px", padding: "10px 8px", textAlign: "center" },
    modal:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "20px" },
    modalBox:   { background: G.surface, border: `1px solid ${G.border}`, borderRadius: "16px 16px 12px 12px", padding: "24px 20px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" },
    label:      { display: "block", fontSize: "9px", letterSpacing: "2px", color: G.muted, marginBottom: "6px", textTransform: "uppercase" },
    input:      { width: "100%", background: G.bg, border: `1px solid ${G.border}`, borderRadius: "6px", padding: "10px 12px", color: G.text, fontFamily: G.font, fontSize: "13px", marginBottom: "16px", boxSizing: "border-box", outline: "none" },
    select:     { width: "100%", background: G.bg, border: `1px solid ${G.border}`, borderRadius: "6px", padding: "10px 12px", color: G.text, fontFamily: G.font, fontSize: "13px", marginBottom: "16px", boxSizing: "border-box", outline: "none", appearance: "none" },
    pairsGrid:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" },
    priorityRow:{ display: "flex", gap: "8px", marginBottom: "16px" },
    modalBtns:  { display: "flex", gap: "10px", marginTop: "8px" },
    addBtn:     { position: "fixed", bottom: "24px", right: "20px", width: "56px", height: "56px", borderRadius: "50%", background: G.accent, border: "none", color: "#fff", fontSize: "28px", cursor: "pointer", boxShadow: `0 4px 24px ${G.accentGlow}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 },
    emptyState: { textAlign: "center", padding: "60px 20px", color: G.muted },
    aiBox:      { background: G.bg, border: `1px solid ${G.accent}55`, borderRadius: "8px", padding: "12px", marginBottom: "16px" },
  };

  const dyn = {
    filterBtn:   (active, color) => ({ padding: "5px 12px", borderRadius: "4px", border: `1px solid ${active ? color : G.border}`, background: active ? `${color}22` : "transparent", color: active ? color : G.muted, fontSize: "10px", letterSpacing: "1.5px", fontFamily: G.font, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", fontWeight: active ? 700 : 400 }),
    card:        (color, blocked) => ({ background: G.surface, border: `1px solid ${blocked ? "#ff444433" : G.border}`, borderLeft: `3px solid ${color}`, borderRadius: "8px", padding: "14px 16px", cursor: "default", opacity: blocked ? 0.78 : 1, transition: "opacity 0.2s" }),
    badge:       (color) => ({ fontSize: "9px", letterSpacing: "1.5px", padding: "2px 8px", borderRadius: "3px", border: `1px solid ${color}`, color, whiteSpace: "nowrap" }),
    catTag:      (cat)   => ({ fontSize: "9px", letterSpacing: "1px", color: cat === "Business" ? "#7c6af7" : "#ff8c42", textTransform: "uppercase" }),
    pairOption:  (sel)   => ({ padding: "10px 8px", borderRadius: "6px", border: `1px solid ${sel ? G.accent : G.border}`, background: sel ? G.accentGlow : "transparent", color: sel ? G.accent : G.muted, fontSize: "10px", cursor: "pointer", textAlign: "center", fontFamily: G.font, transition: "all 0.15s" }),
    priorityBtn: (sel, color) => ({ flex: 1, padding: "8px 4px", borderRadius: "6px", border: `1px solid ${sel ? color : G.border}`, background: sel ? `${color}22` : "transparent", color: sel ? color : G.muted, fontSize: "10px", letterSpacing: "1px", fontFamily: G.font, cursor: "pointer", transition: "all 0.15s" }),
    actionBtn:   (color, ghost) => ({ padding: "5px 12px", borderRadius: "4px", border: `1px solid ${ghost ? G.border : color}`, background: ghost ? "transparent" : `${color}22`, color: ghost ? G.muted : color, fontSize: "10px", fontFamily: G.font, cursor: "pointer", transition: "all 0.15s" }),
    statNum:     (color) => ({ fontFamily: G.fontDisplay, fontSize: "22px", fontWeight: 900, color, display: "block" }),
    primaryBtn:  { flex: 1, padding: "12px", borderRadius: "8px", background: G.accent, border: "none", color: "#fff", fontFamily: G.fontDisplay, fontSize: "12px", letterSpacing: "2px", fontWeight: 700, cursor: "pointer" },
    secondaryBtn:{ padding: "12px 16px", borderRadius: "8px", background: "transparent", border: `1px solid ${G.border}`, color: G.muted, fontFamily: G.font, fontSize: "12px", cursor: "pointer" },
  };

  function dueDateLabel(due_date) {
    if (!due_date) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(due_date + "T00:00:00");
    const diff  = Math.round((due - today) / 86400000);
    if (diff < 0)   return { label: `${Math.abs(diff)}d OVERDUE`, color: "#ff4444" };
    if (diff === 0) return { label: "DUE TODAY",     color: "#ff4444" };
    if (diff <= 3)  return { label: `DUE IN ${diff}D`, color: "#ffc107" };
    return { label: `DUE ${due.toLocaleDateString("en-US", { month:"short", day:"numeric" })}`, color: G.muted };
  }

  // Modal modes: null | "add" | "edit" | "log" | "theme"
  const [modalMode,  setModalMode]  = useState(null);
  const [editTarget, setEditTarget] = useState(null);  // task being edited
  const [logTarget,  setLogTarget]  = useState(null);  // task whose log is open

  // Form state
  const [form,       setForm]       = useState(BLANK);
  const [newLogNote, setNewLogNote] = useState("");

  // AI
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading,setAiLoading] = useState(false);
  const [aiError,  setAiError]   = useState("");

  useEffect(() => {
    loadTasks();

    const channel = supabase
      .channel("tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        loadTasks();
      })
      .subscribe((status, err) => {
        if (err) console.error("Realtime subscription error:", err);
      });

    return () => supabase.removeChannel(channel);
  }, []);

  async function loadTasks() {
    setLoading(true);
    const { data, error } = await fetchTasks();
    if (error) console.error("Failed to load tasks:", error);
    setTasks(data || []);
    setLoading(false);
  }

  // ── Field helpers ──
  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));
  function toggleBlockedBy(id) {
    setForm(f => ({ ...f, blocked_by: f.blocked_by.includes(id) ? f.blocked_by.filter(x => x !== id) : [...f.blocked_by, id] }));
  }

  // ── Open modals ──
  function openAdd() {
    setForm(BLANK); setAiPrompt(""); setAiError("");
    setModalMode("add");
  }
  function openEdit(task, e) {
    e.stopPropagation();
    setEditTarget(task);
    setForm({
      title:      task.title,
      category:   task.category,
      status:     STATUS_MAP[task.status]?.next ? task.status : STATUS_PAIRS.find(p => p.to === task.status)?.from || task.status,
      priority:   task.priority || "medium",
      due_date:   task.due_date || "",
      notes:      task.notes || "",
      blocked_by: task.blocked_by || [],
    });
    setModalMode("edit");
  }
  function openLog(task, e) {
    e.stopPropagation();
    setLogTarget(task);
    setNewLogNote("");
    setModalMode("log");
  }
  function closeModal() {
    setModalMode(null); setEditTarget(null); setLogTarget(null);
    setForm(BLANK); setAiPrompt(""); setAiError(""); setNewLogNote("");
  }

  // ── AI auto-fill ──
  async function handleAiFill() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiError("");
    try {
      const parsed = await aiAutoFill(aiPrompt);
      setForm(f => ({
        ...f,
        title:    parsed.title    || f.title,
        category: parsed.category || f.category,
        status:   parsed.status   || f.status,
        priority: parsed.priority || f.priority,
        due_date: parsed.due_date || f.due_date,
        notes:    parsed.notes    || f.notes,
      }));
      setAiPrompt("");
    } catch { setAiError("Couldn't parse — try being more specific."); }
    setAiLoading(false);
  }

  // ── Add task ──
  async function handleAdd() {
    if (!form.title.trim()) return;
    const payload = {
      title:       form.title.trim(),
      category:    form.category,
      status:      form.status,
      priority:    form.priority,
      due_date:    form.due_date || null,
      notes:       form.notes.trim(),
      blocked_by:  form.blocked_by,
      activity_log:[logEntry("Task created")],
    };
    const { data, error } = await addTask(payload);
    if (error) { console.error("Failed to add task:", error); return; }
    setTasks(prev => [data, ...prev]);
    closeModal();
  }

  // ── Save edit ──
  async function handleSaveEdit() {
    if (!form.title.trim() || !editTarget) return;
    const prev = editTarget;
    const changes = [];
    if (form.title    !== prev.title)    changes.push(`Title updated`);
    if (form.status   !== prev.status)   changes.push(`Status: ${prev.status.toUpperCase()} → ${form.status.toUpperCase()}`);
    if (form.priority !== prev.priority) changes.push(`Priority: ${prev.priority} → ${form.priority}`);
    if (form.due_date !== (prev.due_date||"")) changes.push(`Due date updated`);
    const newLog = changes.length ? [...(prev.activity_log||[]), logEntry(changes.join(" · "))] : (prev.activity_log||[]);
    const patch = { title: form.title.trim(), category: form.category, status: form.status, priority: form.priority, due_date: form.due_date||null, notes: form.notes.trim(), blocked_by: form.blocked_by, activity_log: newLog };
    const { error } = await updateTask(prev.id, patch);
    if (error) { console.error("Failed to update task:", error); return; }
    setTasks(ts => ts.map(t => t.id === prev.id ? { ...t, ...patch } : t));
    closeModal();
  }

  // ── Reopen task ──
  async function handleReopen(task, e) {
    e.stopPropagation();
    const pair = STATUS_PAIRS.find(p => p.to === task.status);
    if (!pair) return;
    const newLog = [...(task.activity_log||[]), logEntry(`Reopened → ${pair.from.toUpperCase()}`)];
    const patch  = { status: pair.from, activity_log: newLog };
    const { error } = await updateTask(task.id, patch);
    if (error) { console.error("Failed to reopen task:", error); return; }
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, ...patch } : t));
  }

  // ── Advance status ──
  async function handleAdvance(task) {
    const s = STATUS_MAP[task.status];
    if (!s?.next) return;
    const newLog = [...(task.activity_log||[]), logEntry(`Marked ${s.next.toUpperCase()}`)];
    const patch  = { status: s.next, activity_log: newLog };
    const { error } = await updateTask(task.id, patch);
    if (error) { console.error("Failed to advance task:", error); return; }
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, ...patch } : t));
  }

  // ── Delete ──
  async function handleDelete(id, e) {
    e.stopPropagation();
    const { error } = await deleteTask(id);
    if (error) { console.error("Failed to delete task:", error); return; }
    setTasks(ts => ts.filter(t => t.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  // ── Add activity log note ──
  async function handleAddLogNote() {
    if (!newLogNote.trim() || !logTarget) return;
    const newLog = [...(logTarget.activity_log||[]), logEntry(newLogNote.trim())];
    const { error } = await updateTask(logTarget.id, { activity_log: newLog });
    if (error) { console.error("Failed to add log note:", error); return; }
    setTasks(ts => ts.map(t => t.id === logTarget.id ? { ...t, activity_log: newLog } : t));
    setLogTarget(lt => ({ ...lt, activity_log: newLog }));
    setNewLogNote("");
  }

  // ── Stats ──
  const activeTasks   = tasks.filter(t => STATUS_MAP[t.status]?.next);
  const resolvedTasks = tasks.filter(t => !STATUS_MAP[t.status]?.next);
  const highCount     = activeTasks.filter(t => t.priority === "high").length;
  const overdueCount  = activeTasks.filter(t => t.due_date && new Date(t.due_date+"T00:00:00") < new Date()).length;

  // ── Filter + sort ──
  const todayStr = new Date().toISOString().split("T")[0];
  const weekStr  = new Date(Date.now() + 7*86400000).toISOString().split("T")[0];

  const filtered = tasks
    .filter(t => {
      if (!showResolved && !STATUS_MAP[t.status]?.next) return false;
      const pairMatch = filter === "all" || t.status === filter || STATUS_PAIRS.find(p => p.from === filter && t.status === p.to);
      const catMatch  = catFilter === "all" || t.category === catFilter;
      const priMatch  = priorityFilter === "all" || t.priority === priorityFilter;
      let dueMatch = true;
      if (dueFilter === "today")   dueMatch = t.due_date === todayStr;
      if (dueFilter === "week")    dueMatch = t.due_date && t.due_date <= weekStr;
      if (dueFilter === "overdue") dueMatch = t.due_date && t.due_date < todayStr;
      return pairMatch && catMatch && priMatch && dueMatch;
    })
    .sort((a, b) => {
      const resolved_a = !STATUS_MAP[a.status]?.next;
      const resolved_b = !STATUS_MAP[b.status]?.next;
      if (resolved_a !== resolved_b) return resolved_a ? 1 : -1;
      const po = { high:0, medium:1, low:2 };
      if (po[a.priority] !== po[b.priority]) return po[a.priority] - po[b.priority];
      if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });

  // ── Counts per pair filter (active tasks only) ──
  function pairCount(key) {
    if (key === "all") return activeTasks.length;
    return activeTasks.filter(t => t.status === key || STATUS_PAIRS.find(p => p.from === key && t.status === p.to)).length;
  }

  const pairFilters = [
    { key:"all",     label:"ALL",             color: G.accent },
    { key:"broke",   label:"BROKE→FIXED",     color:"#ff4444" },
    { key:"open",    label:"OPEN→CLOSED",      color:"#ffc107" },
    { key:"lost",    label:"LOST→FOUND",       color:"#4488ff" },
    { key:"dirty",   label:"DIRTY→CLEANED",    color:"#ff8c42" },
    { key:"pending", label:"PENDING→COMPLETE", color:"#a78bfa" },
    { key:"draft",   label:"DRAFT→SENT",       color:"#38bdf8" },
    { key:"idea",    label:"IDEA→LAUNCHED",    color:"#f472b6" },
  ];

  const selectedPair = STATUS_PAIRS.find(p => p.from === form.status);
  const otherActiveTasks = activeTasks.filter(t => modalMode === "edit" ? t.id !== editTarget?.id : true);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${G.bg}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${G.border}; border-radius: 2px; }
        input[type=date] { color-scheme: ${G.mode}; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4) sepia(1) saturate(3) hue-rotate(220deg); cursor: pointer; }
      `}</style>

      <div style={base.root}>

        {/* ── Header ── */}
        <div style={base.header}>
          <p style={base.logo}>LIFE COMMAND CENTER</p>
          <h1 style={base.headline}>STATUS TRACKER</h1>
          <button
            onClick={() => setModalMode("theme")}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "transparent",
              border: `1px solid ${G.border}`,
              borderRadius: "6px",
              padding: "6px 10px",
              fontSize: "16px",
              cursor: "pointer",
              color: G.text,
            }}>
            🎨
          </button>
        </div>

        {/* ── Stats ── */}
        <div style={base.statsRow}>
          {[
            { label:"ACTIVE",   val: activeTasks.length, color:"#ffc107" },
            { label:"DONE",     val: resolvedTasks.length, color:"#00c896" },
            { label:"🔥 HIGH",  val: highCount,          color:"#ff4444" },
            { label:"OVERDUE",  val: overdueCount,       color: overdueCount > 0 ? "#ff4444" : G.muted },
          ].map(st => (
            <div key={st.label} style={base.statBox}>
              <span style={dyn.statNum(st.color)}>{st.val}</span>
              <span style={{ fontSize:"8px", letterSpacing:"1px", color: G.muted, display:"block", marginTop:"2px" }}>{st.label}</span>
            </div>
          ))}
        </div>

        {/* ── Priority + Category + Due filters ── */}
        <div style={base.filterRow}>
          {[
            { key:"all",    label:"ALL PRI", color: G.accent },
            { key:"high",   label:"🔥 HIGH", color:"#ff4444" },
            { key:"medium", label:"⚡ MED",  color:"#ffc107" },
            { key:"low",    label:"🌀 LOW",  color: G.muted  },
          ].map(f => (
            <button key={f.key} style={dyn.filterBtn(priorityFilter===f.key, f.color)} onClick={() => setPriorityFilter(f.key)}>{f.label}</button>
          ))}
          <span style={{ width:"1px", background: G.border, flexShrink:0, margin:"0 2px" }} />
          {["all","Business","Personal"].map(c => (
            <button key={c} style={dyn.filterBtn(catFilter===c, c==="Personal" ? "#ff8c42" : G.accent)} onClick={() => setCatFilter(c)}>
              {c==="all" ? "ALL CAT" : c.toUpperCase()}
            </button>
          ))}
          <span style={{ width:"1px", background: G.border, flexShrink:0, margin:"0 2px" }} />
          {[
            { key:"all",     label:"ALL DUE"  },
            { key:"today",   label:"TODAY"    },
            { key:"week",    label:"THIS WEEK" },
            { key:"overdue", label:"OVERDUE"  },
          ].map(f => (
            <button key={f.key} style={dyn.filterBtn(dueFilter===f.key, "#38bdf8")} onClick={() => setDueFilter(f.key)}>{f.label}</button>
          ))}
        </div>

        {/* ── Status pair filters with counts ── */}
        <div style={base.filterRow}>
          {pairFilters.map(f => {
            const count = pairCount(f.key);
            return (
              <button key={f.key} style={dyn.filterBtn(filter===f.key, f.color)} onClick={() => setFilter(f.key)}>
                {f.label}{count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
          <span style={{ width:"1px", background: G.border, flexShrink:0, margin:"0 2px" }} />
          <button style={dyn.filterBtn(showResolved, "#00c896")} onClick={() => setShowResolved(v => !v)}>
            {showResolved ? "HIDE DONE" : "SHOW DONE"}
          </button>
        </div>

        {/* ── Task list ── */}
        <div style={base.taskList}>
          {loading && <p style={{ color: G.muted, fontSize:"12px", textAlign:"center" }}>Loading…</p>}
          {!loading && filtered.length === 0 && (
            <div style={base.emptyState}>
              <div style={{ fontSize:"32px", marginBottom:"12px" }}>⬜</div>
              <p style={{ fontSize:"12px", letterSpacing:"2px" }}>NO TASKS</p>
              <p style={{ fontSize:"11px", marginTop:"4px" }}>Tap + to add one</p>
            </div>
          )}

          {filtered.map(task => {
            const s         = STATUS_MAP[task.status] || STATUSES[0];
            const p         = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
            const expanded  = expandedId === task.id;
            const isResolved= !s.next;
            const dueInfo   = dueDateLabel(task.due_date);
            const blockers  = (task.blocked_by||[]).map(bid => tasks.find(t => t.id===bid)).filter(bt => bt && STATUS_MAP[bt.status]?.next);
            const isBlocked = blockers.length > 0;
            const logCount  = (task.activity_log||[]).length;

            return (
              <div key={task.id} style={dyn.card(s.color, isBlocked)}
                onClick={() => setExpandedId(expanded ? null : task.id)}>

                {/* Top row */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px" }}>
                  <span style={{ fontFamily: G.fontDisplay, fontSize:"14px", fontWeight:700, lineHeight:1.3, flex:1 }}>
                    {isBlocked && <span style={{ color:"#ff4444", marginRight:"6px" }}>🔒</span>}
                    {task.title}
                  </span>
                  <div style={{ display:"flex", flexDirection:"column", gap:"4px", alignItems:"flex-end", flexShrink:0 }}>
                    <span style={dyn.badge(s.color)}>{s.emoji} {s.label}</span>
                    <span style={dyn.badge(p.color)}>{p.icon} {p.label}</span>
                  </div>
                </div>

                {/* Meta row */}
                <div style={{ display:"flex", gap:"10px", marginTop:"8px", alignItems:"center", flexWrap:"wrap" }}>
                  <span style={dyn.catTag(task.category)}>{task.category}</span>
                  {dueInfo && <span style={{ fontSize:"9px", color: dueInfo.color, letterSpacing:"1px", fontWeight:700 }}>{dueInfo.label}</span>}
                  {isResolved && <span style={{ fontSize:"9px", color:"#00c896" }}>✓ DONE</span>}
                  {isBlocked && <span style={{ fontSize:"9px", color:"#ff4444" }}>BLOCKED BY {blockers.length}</span>}
                  {logCount > 0 && <span style={{ fontSize:"9px", color: G.muted }}>📋 {logCount} note{logCount!==1?"s":""}</span>}
                </div>

                {task.notes && <p style={{ fontSize:"11px", color: G.muted, marginTop:"6px", lineHeight:1.5 }}>{task.notes}</p>}

                {/* Expanded actions */}
                {expanded && (
                  <div onClick={e => e.stopPropagation()}>
                    {isBlocked && (
                      <div style={{ marginTop:"10px", padding:"8px 10px", background:"#ff444411", borderRadius:"6px", border:"1px solid #ff444433" }}>
                        <p style={{ fontSize:"9px", color:"#ff4444", letterSpacing:"1px", margin:"0 0 6px" }}>BLOCKED BY:</p>
                        {blockers.map(bt => <p key={bt.id} style={{ fontSize:"11px", color: G.muted, margin:"2px 0" }}>→ {bt.title}</p>)}
                      </div>
                    )}
                    <div style={{ display:"flex", gap:"8px", marginTop:"12px", flexWrap:"wrap" }}>
                      {s.next && !isBlocked && (
                        <button style={dyn.actionBtn("#00c896")} onClick={() => handleAdvance(task)}>
                          → Mark {STATUS_MAP[s.next]?.label}
                        </button>
                      )}
                      {isResolved && (
                        <button style={dyn.actionBtn("#ffc107")} onClick={e => handleReopen(task, e)}>
                          ↩ Reopen
                        </button>
                      )}
                      <button style={dyn.actionBtn(G.accent)} onClick={e => openEdit(task, e)}>✏ Edit</button>
                      <button style={dyn.actionBtn("#38bdf8")} onClick={e => openLog(task, e)}>📋 Log ({logCount})</button>
                      <button style={dyn.actionBtn("#ff4444", true)} onClick={e => handleDelete(task.id, e)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      <button style={base.addBtn} onClick={openAdd}>＋</button>

      {/* ══ ADD / EDIT MODAL ══ */}
      {(modalMode === "add" || modalMode === "edit") && (
        <div style={base.modal} onClick={closeModal}>
          <div style={base.modalBox} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: G.fontDisplay, fontSize:"16px", fontWeight:900, margin:"0 0 20px", color: G.text }}>
              {modalMode === "add" ? "NEW TASK" : "EDIT TASK"}
            </h2>

            {/* AI Auto-fill (add mode only) */}
            {modalMode === "add" && (
              <>
                <label style={base.label}>✨ AI Auto-Fill — describe it, Claude fills the form</label>
                <div style={base.aiBox}>
                  <textarea
                    style={{ width:"100%", background:"transparent", border:"none", color: G.text, fontFamily: G.font, fontSize:"12px", outline:"none", resize:"none", lineHeight:1.6, minHeight:"52px" }}
                    placeholder={`e.g. "Tenant in Unit 3 hasn't paid — send notice by Friday" or "Waiting on attorney before filing BriteBox complaint"`}
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key==="Enter" && (e.metaKey||e.ctrlKey)) handleAiFill(); }}
                  />
                  <div style={{ display:"flex", alignItems:"center", gap:"10px", marginTop:"6px" }}>
                    <button
                      style={{ padding:"6px 14px", borderRadius:"6px", background: aiLoading ? "transparent" : G.accentGlow, border:`1px solid ${aiLoading ? G.border : G.accent}`, color: aiLoading ? G.muted : G.accent, fontFamily: G.font, fontSize:"10px", letterSpacing:"1px", cursor: aiLoading ? "not-allowed" : "pointer" }}
                      onClick={handleAiFill} disabled={aiLoading}>
                      {aiLoading ? "THINKING…" : "✨ FILL FORM"}
                    </button>
                    {aiError && <span style={{ fontSize:"10px", color:"#ff4444" }}>{aiError}</span>}
                    {!aiError && <span style={{ fontSize:"9px", color: G.muted }}>⌘+Enter to run</span>}
                  </div>
                </div>
              </>
            )}

            {/* Title */}
            <label style={base.label}>Task Name</label>
            <input style={base.input} placeholder="What needs to happen?" value={form.title} onChange={e => setF("title", e.target.value)} autoFocus />

            {/* Category */}
            <label style={base.label}>Category</label>
            <select style={base.select} value={form.category} onChange={e => setF("category", e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>

            {/* Status type */}
            <label style={base.label}>Status Type</label>
            <div style={base.pairsGrid}>
              {STATUS_PAIRS.map(p => (
                <div key={p.from} style={dyn.pairOption(form.status === p.from)} onClick={() => setF("status", p.from)}>{p.label}</div>
              ))}
            </div>
            {selectedPair && (
              <p style={{ fontSize:"11px", color:"#a78bfa", margin:"-2px 0 16px", lineHeight:1.4, paddingLeft:"2px" }}>↳ {selectedPair.desc}</p>
            )}

            {/* Priority */}
            <label style={base.label}>Priority</label>
            <div style={base.priorityRow}>
              {PRIORITIES.map(p => (
                <button key={p.key} style={dyn.priorityBtn(form.priority===p.key, p.color)} onClick={() => setF("priority", p.key)}>{p.icon} {p.label}</button>
              ))}
            </div>

            {/* Due date */}
            <label style={base.label}>Due Date (optional)</label>
            <input type="date" style={base.input} value={form.due_date} onChange={e => setF("due_date", e.target.value)} />

            {/* Notes */}
            <label style={base.label}>Notes (optional)</label>
            <textarea style={{ ...base.input, minHeight:"56px", resize:"vertical" }} placeholder="Any context or details…" value={form.notes} onChange={e => setF("notes", e.target.value)} />

            {/* Blocked by */}
            {otherActiveTasks.length > 0 && (
              <>
                <label style={base.label}>Blocked By (optional)</label>
                <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"16px" }}>
                  {otherActiveTasks.map(t => {
                    const sel = form.blocked_by.includes(t.id);
                    return (
                      <div key={t.id}
                        style={{ display:"flex", alignItems:"center", gap:"8px", padding:"8px 10px", borderRadius:"6px", cursor:"pointer", border:`1px solid ${sel ? G.accent : G.border}`, background: sel ? G.accentGlow : "transparent", transition:"all 0.15s" }}
                        onClick={() => toggleBlockedBy(t.id)}>
                        <span style={{ fontSize:"11px", color: sel ? G.accent : G.muted, flex:1 }}>{t.title}</span>
                        <span style={{ fontSize:"9px", color: G.muted }}>{STATUS_MAP[t.status]?.label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div style={base.modalBtns}>
              <button style={dyn.secondaryBtn} onClick={closeModal}>Cancel</button>
              <button style={dyn.primaryBtn} onClick={modalMode==="add" ? handleAdd : handleSaveEdit}>
                {modalMode==="add" ? "ADD TASK" : "SAVE CHANGES"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ACTIVITY LOG MODAL ══ */}
      {modalMode === "log" && logTarget && (
        <div style={base.modal} onClick={closeModal}>
          <div style={base.modalBox} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: G.fontDisplay, fontSize:"14px", fontWeight:900, margin:"0 0 4px", color: G.text }}>ACTIVITY LOG</h2>
            <p style={{ fontSize:"11px", color: G.muted, margin:"0 0 20px", lineHeight:1.4 }}>{logTarget.title}</p>

            {/* Log entries */}
            <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"20px", maxHeight:"280px", overflowY:"auto" }}>
              {(logTarget.activity_log||[]).length === 0 && (
                <p style={{ fontSize:"11px", color: G.muted }}>No activity yet.</p>
              )}
              {[...(logTarget.activity_log||[])].reverse().map((entry, i) => (
                <div key={i} style={{ padding:"10px 12px", background: G.bg, borderRadius:"6px", border:`1px solid ${G.border}` }}>
                  <p style={{ fontSize:"9px", color: G.muted, margin:"0 0 4px", letterSpacing:"0.5px" }}>{fmtTime(entry.timestamp)}</p>
                  <p style={{ fontSize:"12px", color: G.text, margin:0, lineHeight:1.4 }}>{entry.text}</p>
                </div>
              ))}
            </div>

            {/* Add note */}
            <label style={base.label}>Add Note</label>
            <textarea
              style={{ ...base.input, minHeight:"52px", resize:"vertical", marginBottom:"8px" }}
              placeholder={`e.g. "Called attorney — left voicemail" or "Contractor quoted $850"`}
              value={newLogNote}
              onChange={e => setNewLogNote(e.target.value)}
            />
            <div style={base.modalBtns}>
              <button style={dyn.secondaryBtn} onClick={closeModal}>Close</button>
              <button style={dyn.primaryBtn} onClick={handleAddLogNote}>ADD NOTE</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ THEME PICKER MODAL ══ */}
      {modalMode === "theme" && (
        <div style={base.modal} onClick={closeModal}>
          <div style={base.modalBox} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: G.fontDisplay, fontSize:"14px", fontWeight:900, margin:"0 0 20px", color: G.text, letterSpacing:"2px" }}>CHOOSE YOUR THEME</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(100px, 1fr))", gap:"10px" }}>
              {Object.entries(THEMES).map(([key, theme]) => {
                const selected = key === themeKey;
                return (
                  <div
                    key={key}
                    onClick={() => { setThemeKey(key); localStorage.setItem("lcc-theme", key); }}
                    style={{
                      padding: "14px 8px",
                      borderRadius: "10px",
                      border: selected ? `2px solid ${theme.accent}` : `1px solid ${G.border}`,
                      background: selected ? theme.surface : G.surface,
                      color: selected ? theme.text : G.muted,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s",
                      position: "relative",
                    }}>
                    {selected && (
                      <span style={{ position:"absolute", top:"6px", right:"8px", fontSize:"12px" }}>✓</span>
                    )}
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%",
                      background: theme.accent, margin: "0 auto 8px",
                      border: `3px solid ${theme.surface}`,
                      boxShadow: `0 0 0 1px ${theme.border}`,
                    }} />
                    <div style={{ fontFamily: G.fontDisplay, fontSize:"11px", fontWeight:700, letterSpacing:"0.5px" }}>{theme.name}</div>
                    <div style={{ fontSize:"8px", letterSpacing:"1.5px", color: selected ? theme.muted : G.muted, marginTop:"4px", textTransform:"uppercase" }}>{theme.mode}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:"16px", display:"flex", justifyContent:"flex-end" }}>
              <button style={dyn.secondaryBtn} onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
