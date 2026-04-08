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
  { key: "due",      label: "DUE",      next: "paid",    emoji: "💰", color: "#22c55e" },
  { key: "paid",     label: "PAID",     next: null,       emoji: "✅", color: "#00c896" },
];

const STATUS_PAIRS = [
  { from: "broke",   to: "fixed",    label: "BROKE → FIXED",      desc: "Something broken that needs repair" },
  { from: "open",    to: "closed",   label: "OPEN → CLOSED",      desc: "Active issue that needs resolution" },
  { from: "lost",    to: "found",    label: "LOST → FOUND",       desc: "Missing document, item, or info" },
  { from: "dirty",   to: "cleaned",  label: "DIRTY → CLEANED",    desc: "Cleanup or organization task" },
  { from: "pending", to: "complete", label: "PENDING → COMPLETE", desc: "Waiting on someone else to act" },
  { from: "draft",   to: "sent",     label: "DRAFT → SENT",       desc: "Letter, email, or filing to send" },
  { from: "idea",    to: "launched", label: "IDEA → LAUNCHED",    desc: "Project or build to get off the ground" },
  { from: "due",     to: "paid",     label: "DUE → PAID",         desc: "Bill, invoice, rent, or payment that needs to be made or collected" },
];


const PRIORITIES = [
  { key: "high",   label: "HIGH", color: "#ff4444", icon: "🔥" },
  { key: "medium", label: "MED",  color: "#ffc107", icon: "⚡" },
  { key: "low",    label: "LOW",  color: "#5a5a7a", icon: "🌀" },
];

const CATEGORIES = ["Business", "Personal"];
const STATUS_MAP   = Object.fromEntries(STATUSES.map(s => [s.key, s]));
const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map(p => [p.key, p]));

const LOG_NOTE_MAX = 280;

function now() { return new Date().toISOString(); }
function logEntry(text, type = "system") { return { timestamp: now(), text, type, starred: false }; }

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
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}

function latestUserNote(activity_log) {
  if (!activity_log?.length) return null;
  const userNotes = [...activity_log]
    .reverse()
    .filter(e => e.type === "user");
  return userNotes[0] || null;
}

// ─── CHECKLIST HELPERS ──────────────────────────────────────────────────────
function checklistProgress(checklist) {
  if (!checklist?.length) return null;
  const done = checklist.filter(i => i.done).length;
  return { done, total: checklist.length, complete: done === checklist.length };
}

function newChecklistItemId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function reorderChecklist(list, fromIndex, toIndex) {
  if (fromIndex === toIndex) return list;
  const result = [...list];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

function DragHandle({ style }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "3px",
      padding: "4px 6px",
      cursor: "grab",
      flexShrink: 0,
      opacity: 0.35,
      ...style,
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ display: "flex", gap: "3px" }}>
          <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "currentColor" }} />
          <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "currentColor" }} />
        </div>
      ))}
    </div>
  );
}

// ─── ANALYTICS ──────────────────────────────────────────────────────────────
function computeAnalytics(tasks) {
  const now = new Date();
  const weekAgo = new Date(now - 7 * 86400000);
  const twoWeeksAgo = new Date(now - 14 * 86400000);

  const active   = tasks.filter(t => STATUS_MAP[t.status]?.next);
  const resolved = tasks.filter(t => !STATUS_MAP[t.status]?.next);

  // ── Velocity ──────────────────────────────────────────────────────────────
  const velocityData = resolved
    .filter(t => t.resolved_at && t.created_at)
    .map(t => ({
      days: Math.round((new Date(t.resolved_at) - new Date(t.created_at)) / 86400000),
      category: t.category,
      status: t.status,
    }));

  const avgVelocity = velocityData.length
    ? Math.round(velocityData.reduce((s, t) => s + t.days, 0) / velocityData.length)
    : null;

  const velocityByPair = STATUS_PAIRS.map(pair => {
    const pairTasks = velocityData.filter(t => t.status === pair.to);
    return {
      label: pair.label,
      from: pair.from,
      avg: pairTasks.length
        ? Math.round(pairTasks.reduce((s, t) => s + t.days, 0) / pairTasks.length)
        : null,
      count: pairTasks.length,
    };
  }).filter(p => p.count > 0);

  // ── Completion rate ────────────────────────────────────────────────────────
  const thisWeekResolved = resolved.filter(t =>
    t.resolved_at && new Date(t.resolved_at) >= weekAgo
  ).length;

  const lastWeekResolved = resolved.filter(t =>
    t.resolved_at &&
    new Date(t.resolved_at) >= twoWeeksAgo &&
    new Date(t.resolved_at) < weekAgo
  ).length;

  const weeklyDelta = thisWeekResolved - lastWeekResolved;

  // ── Stuck tasks ────────────────────────────────────────────────────────────
  const stuckTasks = active.filter(t => {
    if (t.priority !== "high") return false;
    const lastActivity = t.activity_log?.length
      ? new Date(t.activity_log[t.activity_log.length - 1].timestamp)
      : new Date(t.created_at);
    return (now - lastActivity) / 86400000 >= 7;
  });

  // ── Bottleneck detection ───────────────────────────────────────────────────
  const blockerMap = {};
  active.forEach(t => {
    (t.blocked_by || []).forEach(entry => {
      const bid = typeof entry === "string" ? entry : entry.id;
      if (!blockerMap[bid]) blockerMap[bid] = [];
      blockerMap[bid].push(t.id);
    });
  });

  const bottlenecks = Object.entries(blockerMap)
    .map(([blockerId, blockedIds]) => {
      const blocker = tasks.find(t => t.id === blockerId);
      return blocker ? { task: blocker, blockingCount: blockedIds.length, blockedIds } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.blockingCount - a.blockingCount)
    .slice(0, 3);

  // ── Priority drift ─────────────────────────────────────────────────────────
  const driftingHigh = active.filter(t => {
    if (t.priority !== "high") return false;
    const age = (now - new Date(t.created_at)) / 86400000;
    return age >= 7;
  }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // ── Category breakdown ─────────────────────────────────────────────────────
  const categoryStats = ["Business", "Personal"].map(cat => {
    const catActive   = active.filter(t => t.category === cat);
    const catResolved = resolved.filter(t => t.category === cat);
    const catOverdue  = catActive.filter(t =>
      t.due_date && new Date(t.due_date + "T00:00:00") < now
    );
    return {
      category: cat,
      active:   catActive.length,
      resolved: catResolved.length,
      overdue:  catOverdue.length,
      total:    catActive.length + catResolved.length,
    };
  });

  // ── Overdue aging ──────────────────────────────────────────────────────────
  const overdueAging = active
    .filter(t => t.due_date && new Date(t.due_date + "T00:00:00") < now)
    .map(t => ({
      ...t,
      daysOverdue: Math.round((now - new Date(t.due_date + "T00:00:00")) / 86400000),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // ── Weekly trend (last 8 weeks) ────────────────────────────────────────────
  const weeklyTrend = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(now - (7 - i) * 7 * 86400000);
    const weekEnd   = new Date(now - (6 - i) * 7 * 86400000);
    const count = resolved.filter(t =>
      t.resolved_at &&
      new Date(t.resolved_at) >= weekStart &&
      new Date(t.resolved_at) < weekEnd
    ).length;
    return {
      label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count,
    };
  });

  return {
    totalActive:       active.length,
    totalResolved:     resolved.length,
    avgVelocity,
    velocityByPair,
    thisWeekResolved,
    lastWeekResolved,
    weeklyDelta,
    stuckTasks,
    bottlenecks,
    driftingHigh,
    categoryStats,
    overdueAging,
    weeklyTrend,
  };
}

// ─── BLANK FORM STATE ─────────────────────────────────────────────────────────
const BLANK = { title:"", category:"Business", status:"broke", priority:"medium", due_date:"", notes:"", blocked_by:[], checklist:[], log_checklist_items: false };

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function TaskTracker() {
  const [themeKey, setThemeKey] = useState(() => {
    return localStorage.getItem("lcc-theme") || "midnight";
  });
  const [tasks,          setTasks]          = useState([]);
  const [filter,         setFilter]         = useState("all");
  const [catFilter,      setCatFilter]      = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showResolved,   setShowResolved]   = useState(() => {
    return localStorage.getItem("lcc-show-resolved") === "true";
  });
  const [dueFilter,      setDueFilter]      = useState("all");  // all | week | today | overdue
  const [resolvedOnly,   setResolvedOnly]   = useState(() =>
    localStorage.getItem("lcc-resolved-only") === "true"
  );
  const [expandedId,     setExpandedId]     = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [filtersOpen,    setFiltersOpen]    = useState(false);
  const [showReport,     setShowReport]     = useState(false);
  const [reportKey,      setReportKey]      = useState(0);
  const [copyReportConfirm, setCopyReportConfirm] = useState(false);

  // ─── DESIGN TOKENS (reactive) ──────────────────────────────────────────────
  const G = THEMES[themeKey];

  const base = {
    root:       { minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.font, padding: "0 0 80px 0" },
    header:     { borderBottom: `1px solid ${G.border}`, padding: "24px 20px 16px", position: "sticky", top: 0, background: G.bg, zIndex: 100 },
    logo:       { fontFamily: G.fontDisplay, fontSize: "11px", letterSpacing: "4px", color: G.accent, textTransform: "uppercase", margin: 0 },
    headline:   { fontFamily: G.fontDisplay, fontSize: "22px", fontWeight: 900, margin: "4px 0 0", letterSpacing: "-0.5px", color: G.text },
    filterRow:  { display: "flex", gap: "6px", padding: "10px 20px", overflowX: "auto", borderBottom: `1px solid ${G.border}`, flexWrap: "wrap" },
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
    filterBtn:   (active, color) => ({ padding: "6px 12px", borderRadius: "6px", border: `1px solid ${active ? color : G.border}`, background: active ? `${color}22` : "transparent", color: active ? color : G.muted, fontSize: "11px", letterSpacing: "0.5px", fontFamily: G.font, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s", fontWeight: active ? 700 : 400 }),
    card:        (color, blocked, { isOverdue, isHigh, isResolved } = {}) => ({
      background: isResolved ? (G.mode === "dark" ? `${G.surface}cc` : `${G.surface}`) : isOverdue ? (G.mode === "dark" ? "#1a0a0a" : "#fff5f5") : isHigh ? (G.mode === "dark" ? "#1a0f0a" : "#fff8f5") : G.surface,
      border: `1px solid ${blocked ? "#ff444433" : isOverdue ? "#ff444422" : G.border}`,
      borderLeft: `3px solid ${isResolved ? G.muted : color}`,
      borderRadius: "8px", padding: "14px 16px",
      cursor: "pointer", opacity: blocked ? 0.78 : isResolved ? 0.65 : 1,
      transition: "all 0.2s",
      WebkitTapHighlightColor: "transparent",
    }),
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

  // Modal modes: null | "add" | "edit" | "log" | "theme" | "blocker"
  const [modalMode,  setModalMode]  = useState(null);
  const [editTarget, setEditTarget] = useState(null);  // task being edited
  const [logTarget,  setLogTarget]  = useState(null);  // task whose log is open

  // Form state
  const [form,       setForm]       = useState(BLANK);
  const [newLogNote, setNewLogNote] = useState("");
  const [formError,  setFormError]  = useState("");
  const [saving,     setSaving]     = useState(false);
  const [logNoteError,  setLogNoteError]  = useState("");
  const [copyConfirm,   setCopyConfirm]   = useState(false);
  const [logSearch,     setLogSearch]     = useState("");

  // AI
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading,setAiLoading] = useState(false);
  const [aiError,  setAiError]   = useState("");

  // Blocker section state
  const [blockerSectionOpen, setBlockerSectionOpen] = useState(false);
  const [blockerSearch,      setBlockerSearch]      = useState("");

  // Blocker picker state (card action)
  const [blockerTarget,             setBlockerTarget]             = useState(null);
  const [blockerPickerNewSelection, setBlockerPickerNewSelection] = useState(null);
  const [blockerPickerReason,       setBlockerPickerReason]       = useState("");

  // Checklist form state
  const [newChecklist,    setNewChecklist]    = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newLogChecklistItems, setNewLogChecklistItems] = useState(false);

  // Drag-to-reorder state
  const [dragState, setDragState] = useState(null);
  const [modalDragState, setModalDragState] = useState(null);
  function clearDrag() { setDragState(null); }

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
  function toggleBlockedBy(taskId) {
    setForm(f => {
      const existing = (f.blocked_by || []).find(e => {
        const id = typeof e === "string" ? e : e.id;
        return id === taskId;
      });
      if (existing) {
        return { ...f, blocked_by: f.blocked_by.filter(e => {
          const id = typeof e === "string" ? e : e.id;
          return id !== taskId;
        })};
      } else {
        return { ...f, blocked_by: [...(f.blocked_by || []), { id: taskId, reason: "" }] };
      }
    });
  }

  function updateBlockerReason(taskId, reason) {
    setForm(f => ({
      ...f,
      blocked_by: (f.blocked_by || []).map(e => {
        const id = typeof e === "string" ? e : e.id;
        return id === taskId ? { id: taskId, reason } : e;
      }),
    }));
  }

  // ── Open modals ──
  function openAdd() {
    setForm(BLANK); setAiPrompt(""); setAiError(""); setFormError(""); setSaving(false);
    setNewChecklist([]); setNewChecklistItem(""); setNewLogChecklistItems(false);
    setModalDragState(null);
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
    setNewChecklist(task.checklist || []);
    setNewLogChecklistItems(task.log_checklist_items || false);
    setBlockerSectionOpen((task.blocked_by || []).length > 0);
    setBlockerSearch("");
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
    setFormError(""); setSaving(false);
    setLogNoteError(""); setCopyConfirm(false); setLogSearch("");
    setNewChecklist([]); setNewChecklistItem(""); setNewLogChecklistItems(false);
    setBlockerSectionOpen(false); setBlockerSearch("");
    setBlockerTarget(null); setBlockerPickerNewSelection(null); setBlockerPickerReason("");
    setModalDragState(null);
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
    } catch (err) { setAiError(err.message || "Couldn't parse — try being more specific."); }
    setAiLoading(false);
  }

  // ── Add task ──
  async function handleAdd() {
    if (!form.title.trim()) { setFormError("Task name is required."); return; }
    setFormError(""); setSaving(true);
    try {
      const payload = {
        title:       form.title.trim(),
        category:    form.category,
        status:      form.status,
        priority:    form.priority,
        due_date:    form.due_date || null,
        notes:       form.notes.trim(),
        blocked_by:  form.blocked_by,
        checklist:   newChecklist,
        log_checklist_items: newLogChecklistItems,
        activity_log:[logEntry("Task created")],
      };
      const { data, error } = await addTask(payload);
      if (error) { setFormError(error.message || "Failed to add task."); setSaving(false); return; }
      setTasks(prev => [data, ...prev]);
      closeModal();
    } catch (err) { setFormError(err.message || "Something went wrong."); setSaving(false); }
  }

  // ── Save edit ──
  async function handleSaveEdit() {
    if (!form.title.trim()) { setFormError("Task name is required."); return; }
    if (!editTarget) return;
    setFormError(""); setSaving(true);
    try {
      const prev = editTarget;
      const changes = [];
      if (form.title    !== prev.title)    changes.push(`Title updated`);
      if (form.status   !== prev.status)   changes.push(`Status: ${prev.status.toUpperCase()} → ${form.status.toUpperCase()}`);
      if (form.priority !== prev.priority) changes.push(`Priority: ${prev.priority} → ${form.priority}`);
      if (form.due_date !== (prev.due_date||"")) changes.push(`Due date updated`);
      if (form.notes.trim() !== (prev.notes||"").trim()) changes.push("Task notes updated");
      if (JSON.stringify(newChecklist) !== JSON.stringify(prev.checklist || [])) {
        changes.push(`Checklist updated (${newChecklist.length} items)`);
      }
      if (newLogChecklistItems !== (prev.log_checklist_items || false)) {
        changes.push(newLogChecklistItems ? "Item logging enabled" : "Item logging disabled");
      }
      const newLog = changes.length ? [...(prev.activity_log||[]), logEntry(changes.join(" · "))] : (prev.activity_log||[]);
      const patch = { title: form.title.trim(), category: form.category, status: form.status, priority: form.priority, due_date: form.due_date||null, notes: form.notes.trim(), blocked_by: form.blocked_by, checklist: newChecklist, log_checklist_items: newLogChecklistItems, activity_log: newLog };
      const { error } = await updateTask(prev.id, patch);
      if (error) { setFormError(error.message || "Failed to save changes."); setSaving(false); return; }
      setTasks(ts => ts.map(t => t.id === prev.id ? { ...t, ...patch } : t));
      closeModal();
    } catch (err) { setFormError(err.message || "Something went wrong."); setSaving(false); }
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
    const patch  = {
      status: s.next,
      activity_log: newLog,
      ...(STATUS_MAP[s.next]?.next === null ? { resolved_at: new Date().toISOString() } : {}),
    };
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
    if (!newLogNote.trim()) {
      setLogNoteError("Note can't be empty.");
      setTimeout(() => setLogNoteError(""), 2500);
      return;
    }
    setLogNoteError("");
    const entry = logEntry(newLogNote.trim(), "user");
    const newLog = [...(logTarget.activity_log||[]), entry];
    await updateTask(logTarget.id, { activity_log: newLog });
    setTasks(ts => ts.map(t => t.id === logTarget.id ? { ...t, activity_log: newLog } : t));
    setLogTarget(lt => ({ ...lt, activity_log: newLog }));
    setNewLogNote("");
  }

  // ── Delete individual user log entry ──
  async function handleDeleteLogEntry(taskId, entryIndex) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const originalIndex = (task.activity_log.length - 1) - entryIndex;
    const entry = task.activity_log[originalIndex];
    if (entry.type === "system" || !entry.type) return;
    const newLog = task.activity_log.filter((_, i) => i !== originalIndex);
    await updateTask(taskId, { activity_log: newLog });
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, activity_log: newLog } : t));
    setLogTarget(lt => ({ ...lt, activity_log: newLog }));
  }

  // ── Star/unstar log entry ──
  async function handleStarLogEntry(taskId, entryIndex) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const originalIndex = (task.activity_log.length - 1) - entryIndex;
    const newLog = task.activity_log.map((e, i) =>
      i === originalIndex ? { ...e, starred: !e.starred } : e
    );
    await updateTask(taskId, { activity_log: newLog });
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, activity_log: newLog } : t));
    setLogTarget(lt => ({ ...lt, activity_log: newLog }));
  }

  // ── Checklist data functions ──
  const toggleChecklistItem = async (taskId, itemId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Resolved tasks are read-only
    if (!STATUS_MAP[task.status]?.next) return;

    const currentItem = (task.checklist || []).find(i => i.id === itemId);
    if (!currentItem) return;

    const isChecking = !currentItem.done;

    const newChecklist = (task.checklist || []).map(item =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );

    // Only log when checking an item (not unchecking) AND log_checklist_items is enabled
    let newActivityLog = task.activity_log || [];
    if (isChecking && task.log_checklist_items) {
      const entry = logEntry(`✓ ${currentItem.text}`, "system");
      newActivityLog = [...newActivityLog, entry];
    }

    const patch = { checklist: newChecklist };
    if (isChecking && task.log_checklist_items) {
      patch.activity_log = newActivityLog;
    }

    await updateTask(taskId, patch);
    setTasks(ts => ts.map(t =>
      t.id === taskId
        ? { ...t, checklist: newChecklist, activity_log: newActivityLog }
        : t
    ));
  };

  const deleteChecklistItem = async (taskId, itemId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !STATUS_MAP[task.status]?.next) return;
    const updated = (task.checklist || []).filter(item => item.id !== itemId);
    await updateTask(taskId, { checklist: updated });
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, checklist: updated } : t));
  };

  const updateChecklistOrder = async (taskId, newChecklist) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (!STATUS_MAP[task.status]?.next) return;
    await updateTask(taskId, { checklist: newChecklist });
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, checklist: newChecklist } : t));
  };

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
      const isResolved = !STATUS_MAP[t.status]?.next;

      // resolvedOnly mode — show ONLY resolved tasks
      if (resolvedOnly) return isResolved;

      // Normal mode — hide resolved unless showResolved is true
      if (!showResolved && isResolved) return false;

      const pairMatch = filter === "all" || t.status === filter || STATUS_PAIRS.find(p => p.from === filter && t.status === p.to);
      if (!pairMatch) return false;
      // Resolved tasks bypass category/priority/due filters so "SHOW DONE" always reveals them
      if (isResolved) return true;
      const catMatch  = catFilter === "all" || t.category === catFilter;
      const priMatch  = priorityFilter === "all" || t.priority === priorityFilter;
      let dueMatch = true;
      if (dueFilter === "today")   dueMatch = t.due_date === todayStr && !!STATUS_MAP[t.status]?.next;
      if (dueFilter === "week")    dueMatch = t.due_date && t.due_date <= weekStr && !!STATUS_MAP[t.status]?.next;
      if (dueFilter === "overdue") dueMatch = t.due_date && t.due_date < todayStr && !!STATUS_MAP[t.status]?.next;
      return catMatch && priMatch && dueMatch;
    })
    .sort((a, b) => {
      const resolved_a = !STATUS_MAP[a.status]?.next;
      const resolved_b = !STATUS_MAP[b.status]?.next;

      // In resolvedOnly mode, sort resolved tasks by resolved_at descending (most recent first)
      if (resolvedOnly) {
        const dateA = a.resolved_at ? new Date(a.resolved_at) : new Date(a.created_at);
        const dateB = b.resolved_at ? new Date(b.resolved_at) : new Date(b.created_at);
        return dateB - dateA;
      }

      // Normal mode — resolved tasks sink to the bottom
      if (resolved_a !== resolved_b) return resolved_a ? 1 : -1;

      // Within active tasks — high priority first, then by due date
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
    { key:"due",     label:"DUE→PAID",         color:"#22c55e" },
  ];

  const analytics = showReport ? computeAnalytics(tasks) : null;

  const selectedPair = STATUS_PAIRS.find(p => p.from === form.status);

  // Compute filtered blocker candidates
  const blockerCandidates = (() => {
    // All active tasks excluding the task being edited or created
    const pool = activeTasks.filter(t =>
      modalMode === "edit" ? t.id !== editTarget?.id : true
    );

    // Apply search filter only — no track compatibility filtering
    const searched = blockerSearch.trim()
      ? pool.filter(t =>
          t.title.toLowerCase().includes(blockerSearch.toLowerCase()) ||
          t.notes?.toLowerCase().includes(blockerSearch.toLowerCase())
        )
      : pool;

    // Split same-category first, cross-category second — for visual grouping only
    const sameCategory  = searched.filter(t => t.category === form.category);
    const crossCategory = searched.filter(t => t.category !== form.category);

    return { sameCategory, crossCategory, total: searched.length };
  })();

  // Helper to check if a task is currently selected as a blocker
  function isBlockerSelected(taskId) {
    return (form.blocked_by || []).some(e => {
      const id = typeof e === "string" ? e : e.id;
      return id === taskId;
    });
  }

  // Helper to get the reason for a selected blocker
  function getBlockerReason(taskId) {
    const entry = (form.blocked_by || []).find(e => {
      const id = typeof e === "string" ? e : e.id;
      return id === taskId;
    });
    return entry ? (typeof entry === "string" ? "" : entry.reason || "") : "";
  }

  // ── Blocker picker helpers (card action) ──
  function isBlockerSelectedOnTask(task, candidateId) {
    return (task.blocked_by || []).some(e => {
      const id = typeof e === "string" ? e : e.id;
      return id === candidateId;
    });
  }

  async function handleToggleBlockerOnTask(taskId, blockerId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // If there's a pending reason for a previous selection, save it first
    if (blockerPickerNewSelection && blockerPickerNewSelection !== blockerId && blockerPickerReason.trim()) {
      const updatedBlockedBy = (task.blocked_by || []).map(e => {
        const id = typeof e === "string" ? e : e.id;
        return id === blockerPickerNewSelection
          ? { id, reason: blockerPickerReason.trim() }
          : e;
      });
      await updateTask(taskId, { blocked_by: updatedBlockedBy });
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, blocked_by: updatedBlockedBy } : t));
      setBlockerTarget(prev => prev ? { ...prev, blocked_by: updatedBlockedBy } : null);
      // Update task reference for the rest of the function
      task.blocked_by = updatedBlockedBy;
    }

    const currentlySelected = isBlockerSelectedOnTask(task, blockerId);

    let newBlockedBy;
    if (currentlySelected) {
      newBlockedBy = (task.blocked_by || []).filter(e => {
        const id = typeof e === "string" ? e : e.id;
        return id !== blockerId;
      });
      setBlockerPickerNewSelection(null);
      setBlockerPickerReason("");
    } else {
      const entry = { id: blockerId, reason: blockerPickerReason.trim() };
      newBlockedBy = [...(task.blocked_by || []), entry];
      setBlockerPickerNewSelection(blockerId);
      setBlockerPickerReason("");
    }

    try {
      const { error } = await updateTask(taskId, { blocked_by: newBlockedBy });
      if (error) throw error;
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, blocked_by: newBlockedBy } : t));
      setBlockerTarget(prev => prev ? { ...prev, blocked_by: newBlockedBy } : null);
    } catch {
      console.error("Couldn't update blocker.");
    }
  }

  async function handleRemoveBlocker(taskId, blockerId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newBlockedBy = (task.blocked_by || []).filter(e => {
      const id = typeof e === "string" ? e : e.id;
      return id !== blockerId;
    });

    try {
      const { error } = await updateTask(taskId, { blocked_by: newBlockedBy });
      if (error) throw error;
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, blocked_by: newBlockedBy } : t));
      setBlockerTarget(prev => prev ? { ...prev, blocked_by: newBlockedBy } : null);
    } catch {
      console.error("Couldn't remove blocker.");
    }
  }

  // Blocker picker candidates (for card action modal)
  const blockerPickerCandidates = modalMode === "blocker" && blockerTarget
    ? activeTasks.filter(t => {
        if (t.id === blockerTarget.id) return false;
        if (blockerSearch.trim()) {
          return (
            t.title.toLowerCase().includes(blockerSearch.toLowerCase()) ||
            t.notes?.toLowerCase().includes(blockerSearch.toLowerCase())
          );
        }
        return true;
      })
    : [];

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: ${G.bg}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${G.border}; border-radius: 2px; }
        button:active { transform: scale(0.96); }
        .lcc-stat:active { transform: scale(0.95); opacity: 0.8; }
        .lcc-card:active { transform: scale(0.985); }
        input[type=date] { color-scheme: ${G.mode}; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4) sepia(1) saturate(3) hue-rotate(220deg); cursor: pointer; }
      `}</style>

      <div style={base.root}>

        {/* ── Header ── */}
        <div style={base.header}>
          <p style={base.logo}>LIFE COMMAND CENTER</p>
          <h1 style={base.headline}>STATUS TRACKER</h1>
          {/* Header right-side controls — single container, both buttons inside */}
          <div style={{
            position: "absolute",
            top: "18px",
            right: "14px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "6px",
          }}>
            {/* Report button */}
            <button
              onClick={() => {
                setShowReport(v => {
                  if (!v) setReportKey(k => k + 1);
                  return !v;
                });
              }}
              style={{
                background: showReport ? `${G.accent}22` : "transparent",
                border: `1px solid ${showReport ? G.accent : G.border}`,
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "10px",
                letterSpacing: "1.5px",
                fontFamily: G.font,
                cursor: "pointer",
                color: showReport ? G.accent : G.muted,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                whiteSpace: "nowrap",
              }}>
              <span style={{ fontSize: "13px" }}>📊</span>
              <span>REPORT</span>
            </button>

            {/* Theme button */}
            <button
              onClick={() => setModalMode("theme")}
              style={{
                background: "transparent",
                border: `1px solid ${G.border}`,
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "16px",
                cursor: "pointer",
                color: G.text,
                flexShrink: 0,
              }}>
              🎨
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        {!showReport && (() => {
          const tasksWithChecklists = tasks.filter(t => (t.checklist || []).length > 0);
          const totalItems = tasksWithChecklists.reduce((sum, t) => sum + t.checklist.length, 0);
          const doneItems = tasksWithChecklists.reduce((sum, t) => sum + t.checklist.filter(i => i.done).length, 0);
          const showChecklist = totalItems > 0;
          const stats = [
            {
              label: "ACTIVE",
              val: activeTasks.length,
              color: "#ffc107",
              active: !resolvedOnly && priorityFilter === "all" && dueFilter === "all",
              onClick: () => {
                setResolvedOnly(false);
                setShowResolved(false);
                setPriorityFilter("all");
                setDueFilter("all");
                localStorage.setItem("lcc-resolved-only", "false");
                localStorage.setItem("lcc-show-resolved", "false");
                localStorage.setItem("lcc-priority-filter", "all");
                localStorage.setItem("lcc-due-filter", "all");
              },
            },
            {
              label: "DONE",
              val: resolvedTasks.length,
              color: "#00c896",
              active: resolvedOnly,
              onClick: () => {
                setResolvedOnly(true);
                setShowResolved(true);
                localStorage.setItem("lcc-resolved-only", "true");
                localStorage.setItem("lcc-show-resolved", "true");
              },
            },
            {
              label: "🔥 HIGH",
              val: highCount,
              color: "#ff4444",
              active: !resolvedOnly && priorityFilter === "high",
              onClick: () => {
                setResolvedOnly(false);
                setShowResolved(false);
                setPriorityFilter("high");
                setDueFilter("all");
                localStorage.setItem("lcc-resolved-only", "false");
                localStorage.setItem("lcc-show-resolved", "false");
                localStorage.setItem("lcc-priority-filter", "high");
                localStorage.setItem("lcc-due-filter", "all");
              },
            },
            {
              label: "OVERDUE",
              val: overdueCount,
              color: overdueCount > 0 ? "#ff4444" : G.muted,
              active: !resolvedOnly && dueFilter === "overdue",
              onClick: () => {
                setResolvedOnly(false);
                setShowResolved(false);
                setDueFilter("overdue");
                setPriorityFilter("all");
                localStorage.setItem("lcc-resolved-only", "false");
                localStorage.setItem("lcc-show-resolved", "false");
                localStorage.setItem("lcc-due-filter", "overdue");
                localStorage.setItem("lcc-priority-filter", "all");
              },
            },
          ];
          return (
            <div style={{ ...base.statsRow, gridTemplateColumns: showChecklist ? "repeat(5,1fr)" : "repeat(4,1fr)" }}>
              {stats.map(st => (
                <div key={st.label} className="lcc-stat" onClick={st.onClick} style={{
                  ...base.statBox,
                  cursor: "pointer",
                  border: `1px solid ${st.active ? st.color + "66" : G.border}`,
                  background: st.active ? `${st.color}0f` : G.surface,
                  transition: "all 0.2s",
                }}>
                  <span style={{ ...dyn.statNum(st.color), opacity: st.val === 0 ? 0.4 : 1 }}>{st.val}</span>
                  <span style={{
                    fontSize: "8px", letterSpacing: "1px",
                    color: st.active ? st.color : G.muted,
                    display: "block", marginTop: "2px",
                    fontWeight: st.active ? 700 : 400,
                  }}>{st.label}</span>
                </div>
              ))}
              {showChecklist && (
                <div style={{ ...base.statBox, cursor: "default" }}>
                  <span style={dyn.statNum(G.accent)}>{doneItems}/{totalItems}</span>
                  <span style={{ fontSize: "8px", letterSpacing: "1px", color: G.muted, display: "block", marginTop: "2px" }}>CHECKLIST</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Filter toggle bar ── */}
        {!showReport && (() => {
          const hasActiveFilters = priorityFilter !== "all" || catFilter !== "all" || dueFilter !== "all" || filter !== "all" || showResolved || resolvedOnly;
          const activeCount = [priorityFilter !== "all", catFilter !== "all", dueFilter !== "all", filter !== "all", showResolved, resolvedOnly].filter(Boolean).length;
          return (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 20px", borderBottom: `1px solid ${G.border}`,
              cursor: "pointer", WebkitTapHighlightColor: "transparent",
            }} onClick={() => setFiltersOpen(v => !v)}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "10px", letterSpacing: "1.5px", color: filtersOpen ? G.accent : G.muted, fontFamily: G.font, fontWeight: 600, transition: "color 0.15s" }}>
                  FILTERS
                </span>
                {hasActiveFilters && (
                  <span style={{
                    fontSize: "9px", padding: "1px 6px", borderRadius: "8px",
                    background: `${G.accent}22`, color: G.accent, fontFamily: G.font, fontWeight: 700,
                  }}>{activeCount}</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {hasActiveFilters && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setFilter("all");           localStorage.setItem("lcc-filter", "all");
                      setCatFilter("all");         localStorage.setItem("lcc-cat-filter", "all");
                      setPriorityFilter("all");    localStorage.setItem("lcc-priority-filter", "all");
                      setDueFilter("all");         localStorage.setItem("lcc-due-filter", "all");
                      setResolvedOnly(false);      localStorage.setItem("lcc-resolved-only", "false");
                      setShowResolved(false);      localStorage.setItem("lcc-show-resolved", "false");
                    }}
                    style={{ fontSize: "9px", letterSpacing: "1px", color: G.muted, background: "transparent", border: `1px solid ${G.border}`, borderRadius: "4px", padding: "2px 8px", cursor: "pointer", fontFamily: G.font }}>
                    CLEAR
                  </button>
                )}
                <span style={{ fontSize: "12px", color: G.muted, transition: "transform 0.2s", transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
              </div>
            </div>
          );
        })()}

        {/* ── Collapsible filter rows ── */}
        {!showReport && <div style={{
          maxHeight: filtersOpen ? "300px" : "0",
          overflow: "hidden",
          transition: "max-height 0.25s ease",
        }}>
          {/* Priority + Category + Due filters */}
          <div style={base.filterRow}>
            {[
              { key:"all",    label:"All Priority", color: G.accent },
              { key:"high",   label:"High", color:"#ff4444" },
              { key:"medium", label:"Medium",  color:"#ffc107" },
              { key:"low",    label:"Low",  color: G.muted  },
            ].map(f => (
              <button key={f.key} style={dyn.filterBtn(priorityFilter===f.key, f.color)} onClick={() => setPriorityFilter(f.key)}>{f.label}</button>
            ))}
            <span style={{ width:"1px", background: G.border, flexShrink:0, margin:"0 2px" }} />
            {["all","Business","Personal"].map(c => (
              <button key={c} style={dyn.filterBtn(catFilter===c, c==="Personal" ? "#ff8c42" : G.accent)} onClick={() => setCatFilter(c)}>
                {c==="all" ? "All" : c}
              </button>
            ))}
            <span style={{ width:"1px", background: G.border, flexShrink:0, margin:"0 2px" }} />
            {[
              { key:"all",     label:"All Due"  },
              { key:"today",   label:"Today"    },
              { key:"week",    label:"This Week" },
              { key:"overdue", label:"Overdue"  },
            ].map(f => (
              <button key={f.key} style={dyn.filterBtn(dueFilter===f.key, "#38bdf8")} onClick={() => setDueFilter(f.key)}>{f.label}</button>
            ))}
          </div>

          {/* Status pair filters with counts */}
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
            <button style={dyn.filterBtn(showResolved || resolvedOnly, "#00c896")} onClick={() => {
                if (resolvedOnly) {
                  // Exit resolvedOnly mode back to normal
                  setResolvedOnly(false);
                  setShowResolved(false);
                  localStorage.setItem("lcc-resolved-only", "false");
                  localStorage.setItem("lcc-show-resolved", "false");
                } else {
                  const next = !showResolved;
                  setShowResolved(next);
                  localStorage.setItem("lcc-show-resolved", String(next));
                }
              }}>
              {resolvedOnly ? "← Back to Active" : showResolved ? "HIDE DONE" : "SHOW DONE"}
            </button>
          </div>
        </div>}

        {/* ── Task list / Command Report ── */}
        {showReport ? (
          <CommandReport
            analytics={analytics} tasks={tasks} G={G} dyn={dyn} base={base}
            onTaskClick={(id) => { setShowReport(false); setExpandedId(id); }}
            onNavigate={(filters) => {
              setShowReport(false);
              if (filters.category) setCatFilter(filters.category);
              if (filters.priority) setPriorityFilter(filters.priority);
              if (filters.resolvedOnly) { setResolvedOnly(true); setShowResolved(true); localStorage.setItem("lcc-resolved-only", "true"); localStorage.setItem("lcc-show-resolved", "true"); }
            }}
            onClose={() => setShowReport(false)}
            reportKey={reportKey}
            setReportKey={setReportKey}
            copyReportConfirm={copyReportConfirm}
            setCopyReportConfirm={setCopyReportConfirm}
          />
        ) : (
        <div style={base.taskList}>
          {loading && <p style={{ color: G.muted, fontSize:"12px", textAlign:"center" }}>Loading…</p>}
          {!loading && filtered.length === 0 && (
            <div style={base.emptyState}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>
                {resolvedOnly ? "✅" : "⬜"}
              </div>
              <p style={{ fontSize: "12px", letterSpacing: "2px" }}>
                {resolvedOnly ? "NO COMPLETED TASKS YET" : "NO TASKS"}
              </p>
              <p style={{ fontSize: "11px", marginTop: "4px", color: G.muted }}>
                {resolvedOnly
                  ? "Complete a task to see it here"
                  : filter !== "all" || catFilter !== "all" || priorityFilter !== "all" || dueFilter !== "all"
                    ? "Try clearing your filters"
                    : "Tap + to add one"}
              </p>
              {resolvedOnly && (
                <button
                  style={{ marginTop: "12px", padding: "6px 14px", borderRadius: "6px", background: G.accentGlow, border: `1px solid ${G.accent}`, color: G.accent, fontFamily: G.font, fontSize: "10px", cursor: "pointer" }}
                  onClick={() => {
                    setResolvedOnly(false);
                    setShowResolved(false);
                    localStorage.setItem("lcc-resolved-only", "false");
                    localStorage.setItem("lcc-show-resolved", "false");
                  }}>
                  ← Back to Active Tasks
                </button>
              )}
              {!resolvedOnly && (filter !== "all" || catFilter !== "all" || priorityFilter !== "all" || dueFilter !== "all") && (
                <button
                  style={{ marginTop: "12px", padding: "6px 14px", borderRadius: "6px", background: G.accentGlow, border: `1px solid ${G.accent}`, color: G.accent, fontFamily: G.font, fontSize: "10px", cursor: "pointer" }}
                  onClick={() => {
                    setFilter("all"); setCatFilter("all"); setPriorityFilter("all"); setDueFilter("all");
                    setResolvedOnly(false);
                    Object.entries({ "lcc-filter":"all", "lcc-cat-filter":"all", "lcc-priority-filter":"all", "lcc-due-filter":"all", "lcc-resolved-only":"false" })
                      .forEach(([k,v]) => localStorage.setItem(k, v));
                  }}>
                  CLEAR FILTERS
                </button>
              )}
            </div>
          )}

          {filtered.map(task => {
            const s         = STATUS_MAP[task.status] || STATUSES[0];
            const p         = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
            const expanded  = expandedId === task.id;
            const isResolved= !s.next;
            const dueInfo   = dueDateLabel(task.due_date);
            const blockers  = (task.blocked_by||[]).map(entry => { const id = typeof entry === "string" ? entry : entry.id; return tasks.find(t => t.id===id); }).filter(bt => bt && STATUS_MAP[bt.status]?.next);
            const isBlocked = blockers.length > 0;
            const logCount  = (task.activity_log||[]).length;
            const isOverdue = dueInfo && dueInfo.color === "#ff4444" && !isResolved;
            const isHigh    = task.priority === "high" && !isResolved;

            return (
              <div key={task.id} className="lcc-card" style={dyn.card(s.color, isBlocked, { isOverdue, isHigh, isResolved })}
                onClick={() => setExpandedId(expanded ? null : task.id)}>

                {/* Top row */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px" }}>
                  <span style={{
                    fontFamily: G.fontDisplay, fontSize:"14px", fontWeight:700, lineHeight:1.3, flex:1,
                    textDecoration: isResolved ? "line-through" : "none",
                    color: isResolved ? G.muted : G.text,
                  }}>
                    {isBlocked && <span style={{ color:"#ff4444", marginRight:"6px" }}>🔒</span>}
                    {task.title}
                  </span>
                  <div style={{ display:"flex", flexDirection:"column", gap:"4px", alignItems:"flex-end", flexShrink:0 }}>
                    <span style={dyn.badge(s.color)}>{s.emoji} {s.label}</span>
                    {!isResolved && <span style={dyn.badge(p.color)}>{p.icon} {p.label}</span>}
                  </div>
                </div>

                {/* Meta row */}
                <div style={{ display:"flex", gap:"10px", marginTop:"8px", alignItems:"center", flexWrap:"wrap" }}>
                  <span style={dyn.catTag(task.category)}>{task.category}</span>
                  {dueInfo && <span style={{ fontSize:"9px", color: dueInfo.color, letterSpacing:"1px", fontWeight:700 }}>{dueInfo.label}</span>}
                  {isResolved && <span style={{ fontSize:"9px", color:"#00c896" }}>✓ DONE</span>}
                  {isBlocked && <span style={{ fontSize:"9px", color:"#ff4444" }}>BLOCKED BY {blockers.length}</span>}
                  {logCount > 0 && <span style={{ fontSize:"9px", color: G.muted }}>📋 {logCount} note{logCount!==1?"s":""}</span>}
                  {(() => {
                    const progress = checklistProgress(task.checklist);
                    return progress ? (
                      <span style={{
                        fontSize: "9px",
                        color: progress.complete ? "#00c896" : G.muted,
                        letterSpacing: "1px",
                        fontWeight: progress.complete ? 700 : 400,
                      }}>
                        {progress.complete ? "✓" : "☐"} {progress.done}/{progress.total}
                      </span>
                    ) : null;
                  })()}
                  {task.log_checklist_items && (task.checklist || []).length > 0 && (
                    <span style={{ fontSize: "9px", color: G.accent, letterSpacing: "1px" }}>
                      📋 LOGGED
                    </span>
                  )}
                </div>

                {task.notes && <p style={{ fontSize:"11px", color: G.muted, marginTop:"6px", lineHeight:1.5 }}>{task.notes}</p>}

                {(() => {
                  const latest = latestUserNote(task.activity_log);
                  return latest ? (
                    <p style={{
                      fontSize: "10px",
                      color: G.accent,
                      marginTop: "5px",
                      lineHeight: 1.4,
                      opacity: 0.85,
                      fontStyle: "italic",
                    }}>
                      📝 {latest.text.length > 60 ? latest.text.slice(0, 60) + "…" : latest.text}
                    </p>
                  ) : null;
                })()}

                {/* Expanded actions */}
                {expanded && (
                  <div onClick={e => e.stopPropagation()}>
                    {isBlocked && (
                      <div style={{ marginTop:"10px", padding:"8px 10px", background:"#ff444411", borderRadius:"6px", border:"1px solid #ff444433" }}>
                        <p style={{ fontSize:"9px", color:"#ff4444", letterSpacing:"1px", margin:"0 0 6px" }}>BLOCKED BY:</p>
                        {blockers.map(bt => {
                          const entry = (task.blocked_by || []).find(e => {
                            const id = typeof e === "string" ? e : e.id;
                            return id === bt.id;
                          });
                          const reason = entry && typeof entry !== "string" ? entry.reason : "";
                          return (
                            <div key={bt.id} style={{ marginBottom: "4px" }}>
                              <p style={{ fontSize:"11px", color: G.muted, margin: 0 }}>→ {bt.title}</p>
                              {reason && (
                                <p style={{ fontSize:"10px", color:"#ff444488", margin:"2px 0 0 10px", fontStyle:"italic" }}>
                                  {reason}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Checklist */}
                    {(task.checklist || []).length > 0 && (
                      <div style={{ marginTop: "12px" }} onClick={e => e.stopPropagation()}>
                        {(() => {
                          const progress = checklistProgress(task.checklist);
                          return (
                            <div style={{ marginBottom: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "9px", color: G.muted, letterSpacing: "1px" }}>CHECKLIST</span>
                                <span style={{ fontSize: "9px", color: progress.complete ? "#00c896" : G.muted }}>
                                  {progress.done} / {progress.total}
                                </span>
                              </div>
                              <div style={{ height: "2px", background: G.border, borderRadius: "1px", overflow: "hidden" }}>
                                <div style={{
                                  height: "100%",
                                  width: `${(progress.done / progress.total) * 100}%`,
                                  background: progress.complete ? "#00c896" : G.accent,
                                  transition: "width 0.3s ease",
                                  borderRadius: "1px",
                                }} />
                              </div>
                            </div>
                          );
                        })()}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", touchAction: dragState?.taskId === task.id ? "none" : "auto" }}>
                          {task.checklist.map((item, index) => {
                            const isDragging  = dragState?.taskId === task.id && dragState?.fromIndex === index;
                            const isDragOver  = dragState?.taskId === task.id && dragState?.overIndex === index;

                            return (
                              <div
                                key={item.id}
                                data-checklist-item={task.id}
                                draggable={!isResolved}
                                onDragStart={e => {
                                  e.dataTransfer.effectAllowed = "move";
                                  setDragState({ taskId: task.id, fromIndex: index, overIndex: index });
                                }}
                                onDragEnter={e => {
                                  e.preventDefault();
                                  if (dragState?.taskId === task.id) {
                                    setDragState(s => ({ ...s, overIndex: index }));
                                  }
                                }}
                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                                onDragEnd={async () => {
                                  if (dragState?.taskId === task.id && dragState.fromIndex !== dragState.overIndex && dragState.overIndex !== null) {
                                    const newList = reorderChecklist(task.checklist, dragState.fromIndex, dragState.overIndex);
                                    await updateChecklistOrder(task.id, newList);
                                  }
                                  clearDrag();
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "8px 10px",
                                  borderRadius: "6px",
                                  background: isDragOver && !isDragging
                                    ? `${G.accent}18`
                                    : item.done ? `${G.accent}0a` : "transparent",
                                  border: `1px solid ${
                                    isDragOver && !isDragging ? G.accent
                                    : isDragging ? `${G.accent}44`
                                    : item.done ? `${G.accent}33`
                                    : G.border
                                  }`,
                                  opacity: isDragging ? 0.4 : 1,
                                  transition: "background 0.1s, border-color 0.1s, opacity 0.15s",
                                  cursor: "default",
                                }}>

                                {/* Drag handle — hidden on resolved tasks */}
                                {!isResolved && (
                                  <div
                                    onTouchStart={e => {
                                      const touch = e.touches[0];
                                      setDragState({ taskId: task.id, fromIndex: index, overIndex: index, touchY: touch.clientY });
                                    }}
                                    onTouchMove={e => {
                                      if (!dragState || dragState.taskId !== task.id) return;
                                      e.preventDefault();
                                      const touch = e.touches[0];
                                      const elements = document.querySelectorAll(`[data-checklist-item="${task.id}"]`);
                                      let closestIndex = index;
                                      let closestDistance = Infinity;
                                      elements.forEach((el, i) => {
                                        const rect = el.getBoundingClientRect();
                                        const centerY = rect.top + rect.height / 2;
                                        const distance = Math.abs(touch.clientY - centerY);
                                        if (distance < closestDistance) {
                                          closestDistance = distance;
                                          closestIndex = i;
                                        }
                                      });
                                      setDragState(s => ({ ...s, overIndex: closestIndex }));
                                    }}
                                    onTouchEnd={async () => {
                                      if (dragState?.taskId === task.id && dragState.fromIndex !== dragState.overIndex && dragState.overIndex !== null) {
                                        const newList = reorderChecklist(task.checklist, dragState.fromIndex, dragState.overIndex);
                                        await updateChecklistOrder(task.id, newList);
                                      }
                                      clearDrag();
                                    }}
                                  >
                                    <DragHandle style={{ color: G.muted }} />
                                  </div>
                                )}

                                {/* Checkbox */}
                                <div
                                  style={{
                                    width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0,
                                    border: `1.5px solid ${item.done ? G.accent : G.muted}`,
                                    background: item.done ? G.accent : "transparent",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    transition: "all 0.15s", cursor: "pointer",
                                  }}
                                  onClick={e => { e.stopPropagation(); toggleChecklistItem(task.id, item.id); }}>
                                  {item.done && <span style={{ color: "#fff", fontSize: "10px", lineHeight: 1 }}>✓</span>}
                                </div>

                                {/* Item text */}
                                <span style={{
                                  fontSize: "12px",
                                  color: item.done ? G.muted : G.text,
                                  flex: 1,
                                  textDecoration: item.done ? "line-through" : "none",
                                  transition: "all 0.15s",
                                }}>
                                  {item.text}
                                </span>

                                {/* Delete button */}
                                {!isResolved && (
                                  <button
                                    style={{ background: "transparent", border: "none", color: G.muted, fontSize: "12px", cursor: "pointer", padding: "0 2px", flexShrink: 0 }}
                                    onClick={e => { e.stopPropagation(); deleteChecklistItem(task.id, item.id); }}>
                                    ✕
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div style={{ display:"flex", gap:"8px", marginTop:"12px", flexWrap:"wrap" }}>
                      {s.next && !isBlocked && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {(() => {
                            const progress = checklistProgress(task.checklist);
                            const hasUnfinished = progress && !progress.complete;
                            return (
                              <>
                                {hasUnfinished && (
                                  <p style={{ fontSize: "9px", color: "#ffc107", letterSpacing: "0.5px", margin: 0 }}>
                                    ⚠ {progress.total - progress.done} checklist item{progress.total - progress.done !== 1 ? "s" : ""} remaining
                                  </p>
                                )}
                                <button type="button" style={dyn.actionBtn("#00c896")} onClick={() => handleAdvance(task)}>
                                  → Mark {STATUS_MAP[s.next]?.label}
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      )}
                      {isResolved && (
                        <button type="button" style={dyn.actionBtn("#ffc107")} onClick={e => handleReopen(task, e)}>
                          ↩ Reopen
                        </button>
                      )}
                      <button type="button" style={dyn.actionBtn(G.accent)} onClick={e => openEdit(task, e)}>✏ Edit</button>
                      <button
                        type="button"
                        style={dyn.actionBtn(G.accent, true)}
                        onClick={e => {
                          e.stopPropagation();
                          setBlockerTarget(task);
                          setBlockerSearch("");
                          setModalMode("blocker");
                        }}>
                        🔒 {(task.blocked_by || []).length > 0 ? `Blockers (${(task.blocked_by || []).length})` : "Add Blocker"}
                      </button>
                      <button type="button" style={dyn.actionBtn("#38bdf8")} onClick={e => openLog(task, e)}>📋 Log ({logCount})</button>
                      <button type="button" style={dyn.actionBtn("#ff4444", true)} onClick={e => handleDelete(task.id, e)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
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
                    <button type="button"
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
                <button type="button" key={p.from} style={dyn.pairOption(form.status === p.from)} onClick={() => setF("status", p.from)}>{p.label}</button>
              ))}
            </div>
            {selectedPair && (
              <p style={{ fontSize:"11px", color:"#a78bfa", margin:"-2px 0 16px", lineHeight:1.4, paddingLeft:"2px" }}>↳ {selectedPair.desc}</p>
            )}

            {/* Priority */}
            <label style={base.label}>Priority</label>
            <div style={base.priorityRow}>
              {PRIORITIES.map(p => (
                <button type="button" key={p.key} style={dyn.priorityBtn(form.priority===p.key, p.color)} onClick={() => setF("priority", p.key)}>{p.icon} {p.label}</button>
              ))}
            </div>

            {/* Due date */}
            <label style={base.label}>Due Date (optional)</label>
            <input type="date" style={base.input} value={form.due_date} onChange={e => setF("due_date", e.target.value)} />

            {/* Notes */}
            <label style={base.label}>Notes (optional)</label>
            <textarea style={{ ...base.input, minHeight:"56px", resize:"vertical" }} placeholder="Any context or details…" value={form.notes} onChange={e => setF("notes", e.target.value)} />

            {/* Checklist */}
            <label style={base.label}>Checklist (optional)</label>

            {newChecklist.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px", touchAction: modalDragState ? "none" : "auto" }}>
                {newChecklist.map((item, index) => {
                  const isDragging = modalDragState?.fromIndex === index;
                  const isDragOver = modalDragState?.overIndex === index;

                  return (
                    <div
                      key={item.id}
                      data-modal-checklist-item="modal"
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.effectAllowed = "move";
                        setModalDragState({ fromIndex: index, overIndex: index });
                      }}
                      onDragEnter={e => {
                        e.preventDefault();
                        setModalDragState(s => s ? ({ ...s, overIndex: index }) : s);
                      }}
                      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDragEnd={() => {
                        if (modalDragState && modalDragState.fromIndex !== modalDragState.overIndex && modalDragState.overIndex !== null) {
                          setNewChecklist(prev => reorderChecklist(prev, modalDragState.fromIndex, modalDragState.overIndex));
                        }
                        setModalDragState(null);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: isDragOver && !isDragging ? `${G.accent}18` : G.bg,
                        border: `1px solid ${isDragOver && !isDragging ? G.accent : isDragging ? `${G.accent}44` : G.border}`,
                        opacity: isDragging ? 0.4 : 1,
                        transition: "background 0.1s, border-color 0.1s",
                      }}>

                      {/* Drag handle */}
                      <div
                        onTouchStart={e => {
                          const touch = e.touches[0];
                          setModalDragState({ fromIndex: index, overIndex: index, touchY: touch.clientY });
                        }}
                        onTouchMove={e => {
                          if (!modalDragState) return;
                          e.preventDefault();
                          const touch = e.touches[0];
                          const elements = document.querySelectorAll('[data-modal-checklist-item="modal"]');
                          let closestIndex = index;
                          let closestDistance = Infinity;
                          elements.forEach((el, i) => {
                            const rect = el.getBoundingClientRect();
                            const centerY = rect.top + rect.height / 2;
                            const distance = Math.abs(touch.clientY - centerY);
                            if (distance < closestDistance) {
                              closestDistance = distance;
                              closestIndex = i;
                            }
                          });
                          setModalDragState(s => ({ ...s, overIndex: closestIndex }));
                        }}
                        onTouchEnd={() => {
                          if (modalDragState && modalDragState.fromIndex !== modalDragState.overIndex && modalDragState.overIndex !== null) {
                            setNewChecklist(prev => reorderChecklist(prev, modalDragState.fromIndex, modalDragState.overIndex));
                          }
                          setModalDragState(null);
                        }}
                      >
                        <DragHandle style={{ color: G.muted }} />
                      </div>

                      {/* Item text */}
                      <span style={{ fontSize: "11px", color: G.text, flex: 1 }}>{item.text}</span>

                      {/* Remove button */}
                      <button
                        style={{ background: "transparent", border: "none", color: G.muted, fontSize: "11px", cursor: "pointer", padding: "0 2px" }}
                        onClick={() => setNewChecklist(prev => prev.filter(i => i.id !== item.id))}>
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <input
                style={{ ...base.input, marginBottom: 0, flex: 1, fontSize: "13px" }}
                placeholder="Add item (e.g. Shower curtain liner)"
                value={newChecklistItem}
                maxLength={100}
                onChange={e => setNewChecklistItem(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!newChecklistItem.trim()) return;
                    setNewChecklist(prev => [...prev, {
                      id: newChecklistItemId(),
                      text: newChecklistItem.trim(),
                      done: false,
                    }]);
                    setNewChecklistItem("");
                  }
                }}
              />
              <button
                type="button"
                style={{
                  padding: "10px 14px", borderRadius: "6px",
                  background: G.accentGlow, border: `1px solid ${G.accent}`,
                  color: G.accent, fontFamily: G.font, fontSize: "12px",
                  cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                }}
                onClick={() => {
                  if (!newChecklistItem.trim()) return;
                  setNewChecklist(prev => [...prev, {
                    id: newChecklistItemId(),
                    text: newChecklistItem.trim(),
                    done: false,
                  }]);
                  setNewChecklistItem("");
                }}>
                + ADD
              </button>
            </div>
            {newChecklist.length === 0 && (
              <p style={{ fontSize: "9px", color: G.muted, margin: "-10px 0 16px", letterSpacing: "0.5px" }}>
                Press Enter or tap + ADD after each item
              </p>
            )}

            {/* Log checklist items toggle */}
            {newChecklist.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  background: newLogChecklistItems ? `${G.accent}0f` : G.bg,
                  border: `1px solid ${newLogChecklistItems ? G.accent + "44" : G.border}`,
                  marginBottom: "16px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onClick={() => setNewLogChecklistItems(v => !v)}>
                <div>
                  <p style={{ fontSize: "12px", color: G.text, margin: "0 0 2px", fontWeight: 600 }}>
                    Log each item when checked
                  </p>
                  <p style={{ fontSize: "10px", color: G.muted, margin: 0, lineHeight: 1.4 }}>
                    {newLogChecklistItems
                      ? "Each completed item will be timestamped in the activity log"
                      : "Off — checklist progress tracked silently (good for shopping lists)"}
                  </p>
                </div>
                {/* Toggle pill */}
                <div style={{
                  width: "36px", height: "20px", borderRadius: "10px", flexShrink: 0,
                  background: newLogChecklistItems ? G.accent : G.border,
                  position: "relative", transition: "background 0.2s", marginLeft: "12px",
                }}>
                  <div style={{
                    width: "14px", height: "14px", borderRadius: "50%", background: "#fff",
                    position: "absolute", top: "3px",
                    left: newLogChecklistItems ? "19px" : "3px",
                    transition: "left 0.2s",
                  }} />
                </div>
              </div>
            )}

            {/* ── BLOCKED BY ── */}
            <div style={{ marginBottom: "16px" }}>

              {/* Collapsed trigger */}
              {!blockerSectionOpen ? (
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 14px",
                    width: "100%",
                    borderRadius: "8px",
                    background: "transparent",
                    border: `1px dashed ${G.border}`,
                    color: G.muted,
                    fontFamily: G.font,
                    fontSize: "11px",
                    letterSpacing: "1px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                  onClick={() => setBlockerSectionOpen(true)}>
                  <span style={{ fontSize: "14px" }}>🔒</span>
                  <span>Add blocker (optional)</span>
                  {(form.blocked_by || []).length > 0 && (
                    <span style={{
                      marginLeft: "auto",
                      background: `${G.accent}22`,
                      color: G.accent,
                      fontSize: "9px",
                      letterSpacing: "1px",
                      padding: "2px 8px",
                      borderRadius: "3px",
                      border: `1px solid ${G.accent}44`,
                    }}>
                      {(form.blocked_by || []).length} SELECTED
                    </span>
                  )}
                </button>
              ) : (

                /* Expanded section */
                <div style={{ background: G.bg, border: `1px solid ${G.border}`, borderRadius: "10px", padding: "14px" }}>

                  {/* Section header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <p style={{ fontSize: "9px", letterSpacing: "2px", color: G.muted, margin: "0 0 2px", textTransform: "uppercase" }}>
                        Blocked By
                      </p>
                      <p style={{ fontSize: "10px", color: G.muted, margin: 0, lineHeight: 1.4 }}>
                        {blockerCandidates.total === 0
                          ? "No active tasks found"
                          : `${blockerCandidates.total} active task${blockerCandidates.total !== 1 ? "s" : ""} — tap to select`}
                      </p>
                    </div>
                    <button
                      style={{ background: "transparent", border: "none", color: G.muted, fontSize: "16px", cursor: "pointer", padding: "4px 8px" }}
                      onClick={() => setBlockerSectionOpen(false)}>
                      ✕
                    </button>
                  </div>

                  {/* Search — shown when 2+ candidates */}
                  {blockerCandidates.total >= 2 && (
                    <input
                      style={{ ...base.input, marginBottom: "10px", fontSize: "12px" }}
                      placeholder="Search all active tasks…"
                      value={blockerSearch}
                      onChange={e => setBlockerSearch(e.target.value)}
                      autoFocus
                    />
                  )}

                  {/* Empty state */}
                  {blockerCandidates.total === 0 && (
                    <p style={{ fontSize: "11px", color: G.muted, textAlign: "center", padding: "16px 0" }}>
                      {blockerSearch.trim()
                        ? `No active tasks match "${blockerSearch}"`
                        : "No other active tasks exist yet — add the blocker task first, then come back to set this relationship."}
                    </p>
                  )}

                  {/* Same-category tasks */}
                  {blockerCandidates.sameCategory.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {blockerCandidates.sameCategory.map(t => {
                        const selected = isBlockerSelected(t.id);
                        const reason   = getBlockerReason(t.id);
                        const s        = STATUS_MAP[t.status];
                        return (
                          <div key={t.id}>
                            {/* Task row */}
                            <div
                              style={{
                                display: "flex", alignItems: "center", gap: "10px",
                                padding: "10px 12px",
                                borderRadius: selected ? "8px 8px 0 0" : "8px",
                                cursor: "pointer",
                                border: `1px solid ${selected ? G.accent : G.border}`,
                                borderLeft: `3px solid ${selected ? G.accent : s?.color || G.border}`,
                                background: selected ? G.accentGlow : G.surface,
                                transition: "all 0.15s",
                              }}
                              onClick={() => toggleBlockedBy(t.id)}>
                              {/* Checkbox */}
                              <div style={{
                                width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0,
                                border: `1.5px solid ${selected ? G.accent : G.muted}`,
                                background: selected ? G.accent : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.15s",
                              }}>
                                {selected && <span style={{ color: "#fff", fontSize: "11px", lineHeight: 1 }}>✓</span>}
                              </div>
                              {/* Title */}
                              <span style={{ fontSize: "12px", color: selected ? G.text : G.muted, flex: 1, lineHeight: 1.3 }}>
                                {t.title}
                              </span>
                              {/* Status badge */}
                              <span style={{
                                fontSize: "9px", letterSpacing: "1px",
                                color: s?.color || G.muted,
                                border: `1px solid ${s?.color || G.muted}`,
                                padding: "1px 6px", borderRadius: "3px",
                                flexShrink: 0,
                              }}>
                                {s?.label}
                              </span>
                            </div>

                            {/* Reason field — shown only when selected */}
                            {selected && (
                              <div style={{
                                borderLeft: `3px solid ${G.accent}`,
                                borderRight: `1px solid ${G.accent}`,
                                borderBottom: `1px solid ${G.accent}`,
                                borderRadius: "0 0 8px 8px",
                                padding: "8px 12px",
                                background: `${G.accent}08`,
                              }}>
                                <input
                                  style={{
                                    width: "100%", background: "transparent",
                                    border: "none", borderBottom: `1px solid ${G.border}`,
                                    color: G.text, fontFamily: G.font,
                                    fontSize: "11px", padding: "4px 0",
                                    outline: "none", boxSizing: "border-box",
                                  }}
                                  placeholder="Why is this blocking? (optional)"
                                  maxLength={80}
                                  value={reason}
                                  onChange={e => updateBlockerReason(t.id, e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Cross-category divider */}
                  {blockerCandidates.crossCategory.length > 0 && blockerCandidates.sameCategory.length > 0 && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      margin: "8px 0",
                    }}>
                      <div style={{ flex: 1, height: "1px", background: G.border }} />
                      <span style={{ fontSize: "9px", color: G.muted, letterSpacing: "1px", whiteSpace: "nowrap" }}>
                        OTHER CATEGORY
                      </span>
                      <div style={{ flex: 1, height: "1px", background: G.border }} />
                    </div>
                  )}

                  {/* Cross-category tasks */}
                  {blockerCandidates.crossCategory.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {blockerCandidates.crossCategory.map(t => {
                        const selected = isBlockerSelected(t.id);
                        const reason   = getBlockerReason(t.id);
                        const s        = STATUS_MAP[t.status];
                        return (
                          <div key={t.id}>
                            <div
                              style={{
                                display: "flex", alignItems: "center", gap: "10px",
                                padding: "10px 12px",
                                borderRadius: selected ? "8px 8px 0 0" : "8px",
                                cursor: "pointer",
                                border: `1px solid ${selected ? G.accent : G.border}`,
                                borderLeft: `3px solid ${selected ? G.accent : s?.color || G.border}`,
                                background: selected ? G.accentGlow : G.surface,
                                transition: "all 0.15s",
                              }}
                              onClick={() => toggleBlockedBy(t.id)}>
                              <div style={{
                                width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0,
                                border: `1.5px solid ${selected ? G.accent : G.muted}`,
                                background: selected ? G.accent : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.15s",
                              }}>
                                {selected && <span style={{ color: "#fff", fontSize: "11px", lineHeight: 1 }}>✓</span>}
                              </div>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: "12px", color: selected ? G.text : G.muted, display: "block", lineHeight: 1.3 }}>
                                  {t.title}
                                </span>
                                <span style={{ fontSize: "9px", color: G.muted, letterSpacing: "0.5px" }}>
                                  {t.category}
                                </span>
                              </div>
                              <span style={{
                                fontSize: "9px", letterSpacing: "1px",
                                color: s?.color || G.muted,
                                border: `1px solid ${s?.color || G.muted}`,
                                padding: "1px 6px", borderRadius: "3px", flexShrink: 0,
                              }}>
                                {s?.label}
                              </span>
                            </div>
                            {selected && (
                              <div style={{
                                borderLeft: `3px solid ${G.accent}`,
                                borderRight: `1px solid ${G.accent}`,
                                borderBottom: `1px solid ${G.accent}`,
                                borderRadius: "0 0 8px 8px",
                                padding: "8px 12px",
                                background: `${G.accent}08`,
                              }}>
                                <input
                                  style={{
                                    width: "100%", background: "transparent",
                                    border: "none", borderBottom: `1px solid ${G.border}`,
                                    color: G.text, fontFamily: G.font,
                                    fontSize: "11px", padding: "4px 0",
                                    outline: "none", boxSizing: "border-box",
                                  }}
                                  placeholder="Why is this blocking? (optional)"
                                  maxLength={80}
                                  value={reason}
                                  onChange={e => updateBlockerReason(t.id, e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected count summary */}
                  {(form.blocked_by || []).length > 0 && (
                    <div style={{
                      marginTop: "12px", padding: "8px 12px",
                      background: `${G.accent}11`,
                      border: `1px solid ${G.accent}33`,
                      borderRadius: "6px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: "11px", color: G.accent }}>
                        🔒 {(form.blocked_by || []).length} blocker{(form.blocked_by || []).length !== 1 ? "s" : ""} selected
                      </span>
                      <button
                        style={{ background: "transparent", border: "none", color: G.muted, fontSize: "10px", fontFamily: G.font, cursor: "pointer", letterSpacing: "0.5px" }}
                        onClick={() => setForm(f => ({ ...f, blocked_by: [] }))}>
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {formError && <p style={{ fontSize:"11px", color:"#ff4444", margin:"0 0 8px", lineHeight:1.4 }}>{formError}</p>}
            <div style={base.modalBtns}>
              <button type="button" style={dyn.secondaryBtn} onClick={closeModal} disabled={saving}>Cancel</button>
              <button type="button" style={{ ...dyn.primaryBtn, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }} onClick={modalMode==="add" ? handleAdd : handleSaveEdit} disabled={saving}>
                {saving ? "SAVING…" : modalMode==="add" ? "ADD TASK" : "SAVE CHANGES"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ACTIVITY LOG MODAL ══ */}
      {modalMode === "log" && logTarget && (
        <div style={base.modal} onClick={closeModal}>
          <div style={base.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
              <div>
                <h2 style={{ fontFamily: G.fontDisplay, fontSize: "14px", fontWeight: 900, margin: 0, color: G.text }}>
                  ACTIVITY LOG
                </h2>
                <p style={{ fontSize: "11px", color: G.muted, margin: "4px 0 0", lineHeight: 1.4 }}>{logTarget.title}</p>
              </div>
              <button
                style={{ padding: "5px 10px", borderRadius: "4px", background: "transparent", border: `1px solid ${G.border}`, color: G.muted, fontSize: "9px", fontFamily: G.font, letterSpacing: "1px", cursor: "pointer" }}
                onClick={() => {
                  const text = [...(logTarget.activity_log||[])]
                    .map(e => `[${fmtTime(e.timestamp)}]${e.starred ? " ★" : ""} ${e.text}`)
                    .join("\n");
                  navigator.clipboard.writeText(`${logTarget.title}\n${"─".repeat(40)}\n${text}`);
                  setCopyConfirm(true);
                  setTimeout(() => setCopyConfirm(false), 2000);
                }}>
                {copyConfirm ? "✓ COPIED" : "COPY LOG"}
              </button>
            </div>

            <div style={{ marginBottom: "20px" }} />

            {/* Search (only when > 6 entries) */}
            {(logTarget.activity_log||[]).length > 6 && (
              <input
                style={{ ...base.input, marginBottom: "12px", fontSize: "12px" }}
                placeholder="Search log…"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
              />
            )}

            {/* Log entries */}
            <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"20px", maxHeight:"280px", overflowY:"auto" }}>
              {(logTarget.activity_log||[]).length === 0 && (
                <p style={{ fontSize:"11px", color: G.muted }}>No activity yet.</p>
              )}
              {(() => {
                const sortedLog = [...(logTarget.activity_log||[])]
                  .reverse()
                  .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
                const filteredLog = sortedLog.filter(e =>
                  !logSearch.trim() || e.text.toLowerCase().includes(logSearch.toLowerCase())
                );
                return filteredLog.map((entry, i) => {
                  const isUser = entry.type === "user" || (!entry.type && entry.text && !entry.text.includes("→") && entry.text !== "Task created" && !entry.text.startsWith("Marked"));
                  return (
                    <div key={i} style={{
                      padding: "10px 12px",
                      background: isUser ? G.surface : "transparent",
                      borderRadius: "6px",
                      border: isUser ? `1px solid ${G.border}` : "none",
                      borderLeft: isUser ? `3px solid ${G.accent}` : `2px solid ${G.border}`,
                      paddingLeft: isUser ? "12px" : "10px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <p style={{ fontSize: "9px", color: G.muted, margin: 0, letterSpacing: "0.5px" }}>
                          {isUser ? "📝 " : "⚙️ "}{fmtTime(entry.timestamp)}
                        </p>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                          <button
                            style={{ background: "transparent", border: "none", color: entry.starred ? "#ffc107" : G.muted, fontSize: "12px", cursor: "pointer", padding: "0 4px" }}
                            onClick={() => handleStarLogEntry(logTarget.id, i)}>
                            {entry.starred ? "★" : "☆"}
                          </button>
                          {isUser && (
                            <button
                              style={{ background: "transparent", border: "none", color: G.muted, fontSize: "10px", cursor: "pointer", padding: "0 4px" }}
                              onClick={() => handleDeleteLogEntry(logTarget.id, i)}>
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      <p style={{
                        fontSize: isUser ? "12px" : "11px",
                        color: isUser ? G.text : G.muted,
                        margin: 0, lineHeight: 1.5,
                        fontStyle: isUser ? "normal" : "italic",
                      }}>
                        {entry.starred && <span style={{ color: "#ffc107", marginRight: "6px" }}>★</span>}
                        {entry.text}
                      </p>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Add note */}
            <label style={base.label}>Add Note</label>
            <textarea
              style={{ ...base.input, minHeight: "56px", resize: "vertical", marginBottom: "4px" }}
              placeholder={`e.g. "Called attorney — left voicemail" or "Contractor quoted $850"`}
              value={newLogNote}
              maxLength={LOG_NOTE_MAX}
              onChange={e => setNewLogNote(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddLogNote(); }}
            />
            {logNoteError && (
              <p style={{ fontSize: "10px", color: "#ff4444", margin: "-10px 0 10px", letterSpacing: "0.5px" }}>
                {logNoteError}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <p style={{ fontSize: "9px", color: G.muted, margin: 0, letterSpacing: "0.5px" }}>⌘+Enter to add</p>
              <p style={{ fontSize: "9px", color: newLogNote.length > LOG_NOTE_MAX * 0.9 ? "#ffc107" : G.muted, margin: 0 }}>
                {newLogNote.length} / {LOG_NOTE_MAX}
              </p>
            </div>
            <div style={base.modalBtns}>
              <button type="button" style={dyn.secondaryBtn} onClick={closeModal}>Close</button>
              <button type="button" style={dyn.primaryBtn} onClick={handleAddLogNote}>
                ADD NOTE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ BLOCKER PICKER MODAL ══ */}
      {modalMode === "blocker" && blockerTarget && (
        <div style={base.modal} onClick={closeModal}>
          <div style={{ ...base.modalBox, maxHeight: "75vh" }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontFamily: G.fontDisplay, fontSize: "15px", fontWeight: 900, color: G.text, margin: "0 0 4px" }}>
                Set Blocker
              </h2>
              <p style={{ fontSize: "11px", color: G.muted, margin: 0, lineHeight: 1.5 }}>
                {blockerTarget.title}
              </p>
            </div>

            {/* Currently selected blockers */}
            {(blockerTarget.blocked_by || []).length > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <p style={{ fontSize: "9px", letterSpacing: "1.5px", color: G.muted, margin: "0 0 6px", textTransform: "uppercase" }}>
                  Currently Blocking
                </p>
                {(blockerTarget.blocked_by || []).map(entry => {
                  const id = typeof entry === "string" ? entry : entry.id;
                  const reason = typeof entry === "string" ? "" : entry.reason || "";
                  const blocker = tasks.find(t => t.id === id);
                  if (!blocker) return null;
                  return (
                    <div key={id} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "8px 10px", borderRadius: "6px",
                      background: `${G.accent}11`,
                      border: `1px solid ${G.accent}33`,
                      marginBottom: "5px",
                    }}>
                      <span style={{ fontSize: "12px", color: G.text, flex: 1 }}>{blocker.title}</span>
                      {reason && (
                        <span style={{ fontSize: "10px", color: G.muted, fontStyle: "italic", maxWidth: "120px", textAlign: "right" }}>
                          {reason}
                        </span>
                      )}
                      <button
                        style={{ background: "transparent", border: "none", color: "#ff4444", fontSize: "12px", cursor: "pointer", padding: "0 4px", flexShrink: 0 }}
                        onClick={() => handleRemoveBlocker(blockerTarget.id, id)}>
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search */}
            <input
              style={{ ...base.input, marginBottom: "10px", fontSize: "13px" }}
              placeholder="Search all active tasks…"
              value={blockerSearch}
              onChange={e => setBlockerSearch(e.target.value)}
              autoFocus
            />

            {/* Task list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", maxHeight: "320px" }}>
              {blockerPickerCandidates.length === 0 && (
                <p style={{ fontSize: "11px", color: G.muted, textAlign: "center", padding: "16px 0" }}>
                  {blockerSearch.trim()
                    ? `No tasks match "${blockerSearch}"`
                    : "No other active tasks to select."}
                </p>
              )}

              {blockerPickerCandidates.map(t => {
                const alreadySelected = isBlockerSelectedOnTask(blockerTarget, t.id);
                const s = STATUS_MAP[t.status];
                return (
                  <div
                    key={t.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 12px", borderRadius: "8px",
                      border: `1px solid ${alreadySelected ? G.accent : G.border}`,
                      borderLeft: `3px solid ${alreadySelected ? G.accent : s?.color || G.border}`,
                      background: alreadySelected ? G.accentGlow : G.surface,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onClick={() => handleToggleBlockerOnTask(blockerTarget.id, t.id)}>

                    {/* Checkbox */}
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0,
                      border: `1.5px solid ${alreadySelected ? G.accent : G.muted}`,
                      background: alreadySelected ? G.accent : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {alreadySelected && <span style={{ color: "#fff", fontSize: "11px", lineHeight: 1 }}>✓</span>}
                    </div>

                    {/* Task info */}
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "12px", color: alreadySelected ? G.text : G.muted, display: "block", lineHeight: 1.3 }}>
                        {t.title}
                      </span>
                      <span style={{ fontSize: "9px", color: G.muted, letterSpacing: "0.5px" }}>
                        {t.category} · {s?.label}
                      </span>
                    </div>

                    {/* Status color dot */}
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: s?.color || G.muted, flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>

            {/* Reason field — shows when a new blocker is selected */}
            {blockerPickerNewSelection && (
              <div style={{ marginTop: "12px", padding: "10px 12px", background: `${G.accent}0a`, border: `1px solid ${G.accent}22`, borderRadius: "8px" }}>
                <p style={{ fontSize: "9px", color: G.accent, letterSpacing: "1.5px", margin: "0 0 6px", textTransform: "uppercase" }}>
                  Why is this blocking? (optional)
                </p>
                <input
                  style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${G.border}`, color: G.text, fontFamily: G.font, fontSize: "12px", padding: "4px 0", outline: "none", boxSizing: "border-box" }}
                  placeholder="e.g. Need attorney confirmed before sending"
                  maxLength={80}
                  value={blockerPickerReason}
                  onChange={e => setBlockerPickerReason(e.target.value)}
                />
              </div>
            )}

            {/* Footer buttons */}
            <div style={{ ...base.modalBtns, marginTop: "16px" }}>
              <button style={dyn.secondaryBtn} onClick={async () => {
                if (blockerPickerNewSelection && blockerPickerReason.trim() && blockerTarget) {
                  const updatedBlockedBy = (blockerTarget.blocked_by || []).map(e => {
                    const id = typeof e === "string" ? e : e.id;
                    return id === blockerPickerNewSelection
                      ? { id, reason: blockerPickerReason.trim() }
                      : e;
                  });
                  await updateTask(blockerTarget.id, { blocked_by: updatedBlockedBy });
                  setTasks(ts => ts.map(t => t.id === blockerTarget.id ? { ...t, blocked_by: updatedBlockedBy } : t));
                }
                closeModal();
              }}>Done</button>
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

// ─── COMMAND REPORT COMPONENT ───────────────────────────────────────────────
function CommandReport({ analytics, tasks, G, dyn, base, onTaskClick, onNavigate, onClose, reportKey, setReportKey, copyReportConfirm, setCopyReportConfirm }) {
  const a = analytics;
  if (!a) return null;

  const fmtDays = (d) => {
    if (d === null) return "—";
    if (d === 0) return "< 1 day";
    if (d === 1) return "1 day";
    return `${d} days`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 20px 0" }}>
        <div>
          <p style={{ fontSize: "9px", letterSpacing: "3px", color: G.accent, textTransform: "uppercase", margin: "0 0 4px" }}>
            COMMAND REPORT
          </p>
          <h2 style={{ fontFamily: G.fontDisplay, fontSize: "20px", fontWeight: 900, color: G.text, margin: 0 }}>
            Where You Stand
          </h2>
          <p style={{ fontSize: "11px", color: G.muted, marginTop: "4px" }}>
            {new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            style={{ background: "transparent", border: `1px solid ${G.border}`, borderRadius: "6px", padding: "6px 10px", fontSize: "12px", color: G.muted, cursor: "pointer", fontFamily: G.font }}
            onClick={() => setReportKey(k => k + 1)}
            title="Refresh report">
            ↻
          </button>
          <button
            style={{ background: "transparent", border: `1px solid ${G.border}`, borderRadius: "6px", padding: "6px 10px", fontSize: "12px", color: G.muted, cursor: "pointer", fontFamily: G.font }}
            onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      {/* ── Top stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "10px", padding: "0 20px" }}>
        {[
          {
            label: "ACTIVE", val: a.totalActive, color: "#ffc107", sub: null,
            onClick: () => onNavigate({}),
          },
          {
            label: "RESOLVED", val: a.totalResolved, color: "#00c896", sub: null,
            onClick: () => onNavigate({ resolvedOnly: true }),
          },
          {
            label: "THIS WEEK", val: a.thisWeekResolved,
            color: a.weeklyDelta >= 0 ? "#00c896" : "#ff4444",
            sub: a.weeklyDelta > 0 ? `↑ ${a.weeklyDelta} vs last week` : a.weeklyDelta < 0 ? `↓ ${Math.abs(a.weeklyDelta)} vs last week` : "Same as last week",
            onClick: null,
          },
          {
            label: "AVG RESOLVE", val: fmtDays(a.avgVelocity), color: G.accent,
            sub: "from create to done",
            onClick: null,
          },
        ].map(s => (
          <div
            key={s.label}
            style={{
              background: G.surface,
              border: `1px solid ${G.border}`,
              borderRadius: "10px",
              padding: "14px",
              cursor: s.onClick ? "pointer" : "default",
              transition: s.onClick ? "opacity 0.15s" : "none",
            }}
            onClick={s.onClick || undefined}>
            <span style={{
              fontFamily: G.fontDisplay, fontSize: "26px", fontWeight: 900,
              color: s.color, display: "block", lineHeight: 1,
              opacity: s.val === 0 || s.val === "—" ? 0.4 : 1,
            }}>
              {s.val}
            </span>
            <span style={{ fontSize: "8px", letterSpacing: "1.5px", color: G.muted, display: "block", marginTop: "4px" }}>
              {s.label}
            </span>
            {s.sub && (
              <span style={{ fontSize: "10px", color: s.color, display: "block", marginTop: "2px" }}>
                {s.sub}
              </span>
            )}
            {s.onClick && (
              <span style={{ fontSize: "9px", color: G.muted, display: "block", marginTop: "4px", letterSpacing: "0.5px" }}>
                tap to view →
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Bottlenecks ── */}
      {a.bottlenecks.length > 0 && (
        <div style={{ background: G.surface, border: `1px solid #ff444433`, borderRadius: "10px", padding: "16px", margin: "0 20px" }}>
          <p style={{ fontSize: "9px", letterSpacing: "2px", color: "#ff4444", margin: "0 0 12px", textTransform: "uppercase" }}>
            CRITICAL PATH — BLOCKING THE MOST WORK
          </p>
          {a.bottlenecks.map(b => (
            <div key={b.task.id}
              style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "8px", background: "#ff44440a", border: "1px solid #ff444422", marginBottom: "6px", cursor: "pointer" }}
              onClick={() => onTaskClick(b.task.id)}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: G.text, margin: "0 0 2px", fontFamily: G.fontDisplay }}>{b.task.title}</p>
                <p style={{ fontSize: "10px", color: G.muted, margin: 0 }}>{STATUS_MAP[b.task.status]?.label} · {b.task.category}</p>
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: G.fontDisplay, fontSize: "22px", fontWeight: 900, color: "#ff4444", display: "block", lineHeight: 1 }}>{b.blockingCount}</span>
                <span style={{ fontSize: "8px", color: "#ff4444", letterSpacing: "1px" }}>BLOCKING</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Stuck HIGH tasks ── */}
      {a.stuckTasks.length > 0 && (
        <div style={{ background: G.surface, border: `1px solid #ffc10733`, borderRadius: "10px", padding: "16px", margin: "0 20px" }}>
          <p style={{ fontSize: "9px", letterSpacing: "2px", color: "#ffc107", margin: "0 0 12px", textTransform: "uppercase" }}>
            STUCK — HIGH PRIORITY, NO MOVEMENT IN 7+ DAYS
          </p>
          {a.stuckTasks.map(t => {
            const lastActivity = t.activity_log?.length
              ? new Date(t.activity_log[t.activity_log.length - 1].timestamp)
              : new Date(t.created_at);
            const daysSince = Math.round((new Date() - lastActivity) / 86400000);
            return (
              <div key={t.id}
                style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 12px", borderRadius:"8px", background:"#ffc1070a", border:"1px solid #ffc10722", marginBottom:"6px", cursor:"pointer" }}
                onClick={() => onTaskClick(t.id)}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize:"13px", fontWeight:700, color: G.text, margin:"0 0 2px", fontFamily: G.fontDisplay }}>{t.title}</p>
                  <p style={{ fontSize:"10px", color: G.muted, margin:0 }}>{STATUS_MAP[t.status]?.label} · {t.category}</p>
                </div>
                <div style={{ textAlign:"center", flexShrink:0 }}>
                  <span style={{ fontFamily: G.fontDisplay, fontSize:"20px", fontWeight:900, color:"#ffc107", display:"block", lineHeight:1 }}>{daysSince}d</span>
                  <span style={{ fontSize:"8px", color:"#ffc107", letterSpacing:"1px" }}>NO MOVE</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Overdue aging ── */}
      {a.overdueAging.length > 0 && (
        <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: "10px", padding: "16px", margin: "0 20px" }}>
          <p style={{ fontSize: "9px", letterSpacing: "2px", color: "#ff4444", margin: "0 0 12px", textTransform: "uppercase" }}>
            OVERDUE — OLDEST FIRST
          </p>
          {a.overdueAging.slice(0, 5).map(t => (
            <div key={t.id}
              style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px", borderRadius:"6px", border:`1px solid ${G.border}`, marginBottom:"5px", cursor:"pointer" }}
              onClick={() => onTaskClick(t.id)}>
              <span style={{ fontFamily: G.fontDisplay, fontSize:"18px", fontWeight:900, color:"#ff4444", flexShrink:0, minWidth:"36px" }}>{t.daysOverdue}d</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:"12px", fontWeight:700, color: G.text, margin:"0 0 2px", fontFamily: G.fontDisplay }}>{t.title}</p>
                <p style={{ fontSize:"9px", color: G.muted, margin:0 }}>{t.category} · {STATUS_MAP[t.status]?.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Weekly trend ── */}
      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: "10px", padding: "16px", margin: "0 20px" }}>
        <p style={{ fontSize: "9px", letterSpacing: "2px", color: G.muted, margin: "0 0 14px", textTransform: "uppercase" }}>
          TASKS RESOLVED — LAST 8 WEEKS
        </p>
        {(() => {
          const max = Math.max(...a.weeklyTrend.map(w => w.count), 1);
          return (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "100px" }}>
              {a.weeklyTrend.map((w, i) => {
                const isCurrentWeek = i === a.weeklyTrend.length - 2;
                const hasData = w.count > 0;
                const height = Math.max((w.count / max) * 70, hasData ? 4 : 2);
                return (
                  <div key={i}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%", justifyContent: "flex-end", cursor: hasData ? "pointer" : "default" }}
                    onClick={() => { if (hasData) onNavigate({ resolvedOnly: true }); }}>
                    <span style={{ fontSize: "8px", color: isCurrentWeek ? G.accent : G.muted, fontFamily: G.font }}>{w.count}</span>
                    <div style={{ width: "100%", height: `${height}px`, borderRadius: "3px 3px 0 0", background: isCurrentWeek ? G.accent : hasData ? `${G.accent}66` : G.border, transition: "height 0.4s ease" }} />
                    <span style={{ fontSize: "7px", color: isCurrentWeek ? G.accent : G.muted, fontFamily: G.font, textAlign: "center", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", maxWidth: "100%" }}>
                      {w.label.split(" ")[1]}
                    </span>
                    {hasData && (
                      <span style={{ fontSize: "7px", color: G.muted, textAlign: "center" }}>tap</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ── Velocity by track ── */}
      {a.velocityByPair.length > 0 && (
        <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: "10px", padding: "16px", margin: "0 20px" }}>
          <p style={{ fontSize: "9px", letterSpacing: "2px", color: G.muted, margin: "0 0 12px", textTransform: "uppercase" }}>
            Avg Days to Resolve by Track
          </p>
          {a.velocityByPair.map((p, i) => {
            const isFastest = a.velocityByPair.length > 1 && i === 0;
            const isSlowest = a.velocityByPair.length > 1 && i === a.velocityByPair.length - 1;
            return (
              <div key={p.from} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "10px", color: G.muted, fontFamily: G.font, letterSpacing: "0.5px", display: "block" }}>
                    {p.label}
                  </span>
                  {isFastest && (
                    <span style={{ fontSize: "8px", color: "#00c896", letterSpacing: "1px" }}>FASTEST</span>
                  )}
                  {isSlowest && (
                    <span style={{ fontSize: "8px", color: "#ffc107", letterSpacing: "1px" }}>MOST TIME</span>
                  )}
                </div>
                <span style={{ fontSize: "9px", color: G.muted, fontFamily: G.font }}>({p.count})</span>
                <span style={{ fontFamily: G.fontDisplay, fontSize: "16px", fontWeight: 900, color: G.accent, minWidth: "60px", textAlign: "right" }}>
                  {fmtDays(p.avg)}
                </span>
              </div>
            );
          })}
          {a.velocityByPair.length === 1 && (
            <p style={{ fontSize: "10px", color: G.muted, marginTop: "6px", fontStyle: "italic" }}>
              Resolve more tasks to see patterns by track.
            </p>
          )}
        </div>
      )}

      {/* ── Category breakdown ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "0 20px" }}>
        {a.categoryStats.map(c => (
          <div
            key={c.category}
            style={{
              background: G.surface,
              border: `1px solid ${G.border}`,
              borderRadius: "10px",
              padding: "14px",
              cursor: "pointer",
            }}
            onClick={() => onNavigate({ category: c.category })}>
            <p style={{ fontSize: "9px", letterSpacing: "2px", color: c.category === "Business" ? G.accent : "#ff8c42", margin: "0 0 10px", textTransform: "uppercase" }}>
              {c.category} →
            </p>
            {[
              { label: "Active",   val: c.active,   color: "#ffc107" },
              { label: "Resolved", val: c.resolved, color: "#00c896" },
              { label: "Overdue",  val: c.overdue,  color: c.overdue > 0 ? "#ff4444" : G.muted },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", color: G.muted }}>{s.label}</span>
                <span style={{ fontSize: "10px", color: s.color, fontFamily: G.font, fontWeight: 700 }}>{s.val}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── All clear state ── */}
      {a.bottlenecks.length === 0 && a.stuckTasks.length === 0 && a.overdueAging.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "20px 16px",
          background: `${G.accent}0a`,
          border: `1px solid ${G.accent}22`,
          borderRadius: "10px",
          margin: "0 20px",
        }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "50%",
            background: "#00c896", display: "flex",
            alignItems: "center", justifyContent: "center",
            margin: "0 auto 10px",
            fontSize: "16px", color: "#fff",
          }}>✓</div>
          <p style={{ fontSize: "13px", color: G.text, fontFamily: G.fontDisplay, fontWeight: 700, margin: "0 0 4px" }}>
            No Blockers Detected
          </p>
          <p style={{ fontSize: "11px", color: G.muted, margin: 0 }}>
            No stuck tasks, no bottlenecks, no overdue items.
          </p>
        </div>
      )}

      {/* ── Copy Report button ── */}
      <div style={{ padding: "0 20px 32px" }}>
        <button
          style={{
            width: "100%", padding: "12px",
            borderRadius: "8px", background: "transparent",
            border: `1px solid ${G.border}`,
            color: G.muted, fontFamily: G.font,
            fontSize: "10px", letterSpacing: "1.5px",
            cursor: "pointer", transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}
          onClick={() => {
            const lines = [
              `LIFE COMMAND CENTER — COMMAND REPORT`,
              `${new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" })}`,
              ``,
              `OVERVIEW`,
              `Active: ${a.totalActive} · Resolved: ${a.totalResolved} · This week: ${a.thisWeekResolved} · Avg resolve: ${fmtDays(a.avgVelocity)}`,
              ``,
              a.bottlenecks.length > 0 ? [
                `BOTTLENECKS (${a.bottlenecks.length})`,
                ...a.bottlenecks.map(b => `  · ${b.task.title} — blocking ${b.blockingCount} task${b.blockingCount !== 1 ? "s" : ""}`),
                ``,
              ].join("\n") : "",
              a.stuckTasks.length > 0 ? [
                `STUCK — HIGH PRIORITY NO MOVEMENT 7+ DAYS`,
                ...a.stuckTasks.map(t => {
                  const lastActivity = t.activity_log?.length
                    ? new Date(t.activity_log[t.activity_log.length - 1].timestamp)
                    : new Date(t.created_at);
                  const days = Math.round((new Date() - lastActivity) / 86400000);
                  return `  · ${t.title} — ${days} days no movement`;
                }),
                ``,
              ].join("\n") : "",
              a.overdueAging.length > 0 ? [
                `OVERDUE`,
                ...a.overdueAging.map(t => `  · ${t.title} — ${t.daysOverdue}d overdue`),
                ``,
              ].join("\n") : "",
              `CATEGORY BREAKDOWN`,
              ...a.categoryStats.map(c => `  ${c.category}: ${c.active} active · ${c.resolved} resolved · ${c.overdue} overdue`),
              ``,
              a.velocityByPair.length > 0 ? [
                `VELOCITY BY TRACK`,
                ...a.velocityByPair.map(p => `  ${p.label}: ${fmtDays(p.avg)} avg (${p.count} resolved)`),
              ].join("\n") : "",
            ].filter(Boolean).join("\n");

            navigator.clipboard.writeText(lines).then(() => {
              setCopyReportConfirm(true);
              setTimeout(() => setCopyReportConfirm(false), 2500);
            });
          }}>
          {copyReportConfirm ? "✓ COPIED TO CLIPBOARD" : "↓ COPY REPORT AS TEXT"}
        </button>
      </div>

    </div>
  );
}
