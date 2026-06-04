# Life Command Center

## IMPORTANT — File Location

The main application file is `src/App.jsx` — NOT `src/task-tracker.jsx`.
All prompts and documentation referencing `task-tracker.jsx` apply to `src/App.jsx`.

## Theme System

The app uses a theme system defined in `src/App.jsx`.

### THEMES constant

Located at the top of `src/App.jsx` (outside the component), the `THEMES` object is the single source of truth for all color values. Each theme has this shape:

```js
{
  name: "Theme Name",   // Display name
  mode: "dark"|"light",  // Used for color-scheme CSS
  bg, surface, border,   // Background layers
  text, muted,           // Text colors
  accent, accentGlow,    // Brand/accent color + glow variant
  font, fontDisplay,     // Typography stacks
}
```

Typography: `font` is the body stack (`Inter`, sans-serif) and `fontDisplay` is the heading/title stack (`Fraunces`, serif). Both are loaded via the Google Fonts `<link>` in `index.html`.

### How to add a new theme

1. Copy an existing theme entry in the `THEMES` object
2. Give it a unique key (e.g., `ocean`) and a display `name`
3. Set `mode` to `"dark"` or `"light"`
4. Customize the color values

### Architecture

- `G` is always derived from `THEMES[themeKey]` — never hardcode colors outside of status/priority constants
- `base` and `dyn` style objects are defined inside the component so they re-derive on every render when the theme changes
- Status colors (`#ff4444`, `#ffc107`, etc.) and priority colors are NOT themeable — they stay hardcoded
- The localStorage key is `"lcc-theme"` (stores the theme key string, e.g., `"midnight"`)

## Task Card Layout

- `expandedId` state holds the id of the currently expanded card (`null` when all collapsed); tapping a card toggles it
- **Collapsed** card shows only two rows: the title row, and a type+status+priority row (`catTag` + status `badge` + priority `badge`)
- **Expanded** (`expanded && ...`) reveals everything else: the meta row (due, done, blocked count, note count, checklist progress, logged), notes, latest user note, blocker list, checklist, and action buttons
- Action buttons (Mark/Reopen, Edit, Add Blocker, Log, Delete) live in a single `flexWrap` row; the "⚠ N checklist items remaining" warning renders as its own full-width line above that row so Mark and Edit stay on the same row

## Data Model

### `blocked_by` field

- `blocked_by` is `jsonb` in Supabase (changed from `uuid[]`)
- Each entry shape: `{ id: string, reason: string }` — reason may be empty string
- Backward compatibility: existing string UUID entries handled via `typeof entry === "string"` fallback everywhere `blocked_by` is read
- `BLOCKER_COMPATIBILITY` has been removed — the blocker picker now shows all active tasks
- `blockerTarget` state holds the task being assigned a blocker via the card action
- `modalMode === "blocker"` opens the standalone blocker picker bottom sheet
- Blockers can be set/edited/removed from three places: add modal, edit modal, and card action
- `handleToggleBlockerOnTask(taskId, blockerId)` — adds or removes a blocker on an existing task with immediate Supabase write
- `handleRemoveBlocker(taskId, blockerId)` — removes a specific blocker with immediate Supabase write
- Search in the blocker picker checks both title and notes fields
- Blocker section is collapsed by default in the add/edit modal — expands on tap
- Cross-category tasks shown below same-category with a divider — never hidden

## Checklist Feature

**Drag-to-reorder:**

- `reorderChecklist(list, fromIndex, toIndex)` — pure helper, no side effects
- `updateChecklistOrder(taskId, newChecklist)` — calls `updateTask` and `setTasks`
- `dragState` — component-level state `{ taskId, fromIndex, overIndex, touchY? }`
- `modalDragState` — separate state for modal checklist drag `{ fromIndex, overIndex }`
- Uses HTML5 Drag and Drop API for desktop + touch events for iOS Safari
- `data-checklist-item={task.id}` attribute on each card checklist item enables touch position detection
- Drag handle is hidden on resolved tasks — checklist is read-only when task is resolved
- Main task list does NOT have drag-to-reorder — sort is computed

## Command Report

- `computeAnalytics(tasks)` is a pure function defined outside the component — takes the full tasks array, returns the analytics object
- `CommandReport` is a function component defined after `TaskTracker` in `src/App.jsx`
- `showReport` boolean state controls visibility — when true, hides task list and shows report
- `resolved_at` timestamptz column added to tasks — set in `handleAdvance()` when advancing to a terminal status
- No new Supabase tables required — all analytics computed client-side from existing data
- Premium gating not yet implemented — full feature available to all users in v1

## Calendar View

- Three mutually-exclusive top-level views: list / report / calendar. `showReport` and `showCalendar` boolean states control them — turning one on turns the others off (handled in the REPORT/CALENDAR header button `onClick`s).
- Header controls (CALENDAR button + REPORT button + 🎨 theme button) live in the absolutely-positioned div in the header; CALENDAR is styled like REPORT (toggle highlight via `G.accent`).
- The stats/filters blocks are gated by `!showReport && !showCalendar`. The main render switch is three-way: `showReport ? <CommandReport/> : showCalendar ? <Calendar/> : <taskList>`.
- `Calendar` is a function component defined after `CommandReport` in `src/App.jsx`. Props: `tasks, events, G, dyn, base, onTaskClick, onAddTaskOnDate, onAddEventOnDate, onEditEvent, onRescheduleTask, onRescheduleEvent`. Internal `calMode` toggles `"month"` vs `"agenda"`.
- Month grid (Sun–Sat) with prev/next month nav, a "Today" button, and the month/year label. Manages `viewYear`/`viewMonth`/`selectedDate` internally.
- A day is "active" if any task has `due_date === dateStr` OR any event occurs on it. Small colored dots indicate content: tasks (`#38bdf8`), Business events (`#7c6af7`), Personal events (`#ff8c42`). Today and the selected day are highlighted.
- **Resolved-task styling:** the task dot is a SOLID `#38bdf8` only when the day has at least one active task (`hasActiveTask = dayTasks.some(t => STATUS_MAP[t.status]?.next)`); if every task on the day is resolved it renders as a hollow muted ring (`border: 1px solid G.muted`, transparent fill) so completed days stay visible without competing with actionable ones. In the agenda/overdue list, `renderTask` mirrors the List view's `dyn.card` resolved treatment — grey muted left bar (`barColor = isResolved ? G.muted : …`) and `opacity: 0.65`.
- Tapping a day selects it and shows its agenda below the grid: events (tap → `openEditEvent`) and tasks (tap → `onTaskClick` = `goToTaskInList(id)`). "+ Add task" / "+ Add event" actions add for the selected date.
- `goToTaskInList(id)` (shared by Calendar and CommandReport `onTaskClick`) switches to the List view and focuses the task: it relaxes filters ONLY if the task isn't already in `filtered` (so a resolved/filtered task can't land on an empty list), expands it (`setExpandedId`), `scrollIntoView`s the `[data-task-id]` card, and pulse-highlights it via the `lcc-highlight` class (`lccPulse` keyframe, ~1.6s).
- Dated tasks AUTO-APPEAR on the calendar — no extra step, just `due_date`.
- **Recurrence is virtual** — no rows are generated. `eventOccursOn(ev, dateStr)` (module-level) expands `recurrence` (`daily`/`weekly`/`monthly`/`yearly`) forward from `event_date`; monthly clamps the day-of-month to month end (the 31st lands on Feb 28). Tasks have no recurrence field (single-row status can't represent per-instance completion — would need a generator).
- **Drag-to-reschedule:** agenda rows have a `⠿` drag handle; day cells carry `data-cal-date` and are drop targets. Desktop uses HTML5 DnD; touch uses `elementFromPoint` to find the cell (mirrors the checklist touch pattern). Drop calls `onRescheduleTask`/`onRescheduleEvent` → `handleRescheduleTask`/`handleRescheduleEvent` in `TaskTracker` (immediate Supabase write; task moves log an activity entry). Rescheduling a recurring event shifts the whole series start.
- **Overdue roll-up:** collapsible banner (open by default) listing active tasks (`STATUS_MAP[status].next` truthy) with `due_date < today`. Shown in both modes.
- **Agenda mode:** flat list of the next 21 days that have any task/event (recurrence-expanded), grouped by date.
- **Date handling:** `localDateStr(d)` (module-level helper) builds local-time `YYYY-MM-DD`. NEVER use `toISOString()` for calendar dates — it shifts the day by timezone. `due_date` and `event_date` are `'YYYY-MM-DD'` strings.

## Events Table & Data Layer

- `events` is a dedicated Supabase table (NOT a flag on tasks). Columns: `id, title, event_date (date), start_time/end_time (time, null = all-day), all_day (bool), category ('Business'|'Personal'), location, notes, recurrence ('none'|'daily'|'weekly'|'monthly'|'yearly'), created_at, updated_at`.
- RLS MIRRORS the tasks table exactly: RLS enabled + a single permissive `"Allow all access"` policy (`for all using (true) with check (true)`) so the app reaches it with the anon key. Same `handle_updated_at` trigger. Migration: `supabase/migrations/20260603_add_events_table.sql` (also reflected in `schema.sql`).
- Event CRUD helpers live in `src/lib/supabase.js`: `fetchEvents/addEvent/updateEvent/deleteEvent`, mirroring the task CRUD helpers (`fetchTasks/addTask/updateTask/deleteTask`) that live at the top of `src/App.jsx`.
- `events` is added to the `supabase_realtime` publication and subscribed alongside `tasks` in the main `useEffect`.
- Event add/edit modal: `modalMode === "event"` with `eventForm`/`eventTarget`/`eventError`/`eventSaving` state, `BLANK_EVENT` constant, `openAddEvent(dateStr)`/`openEditEvent(ev)`/`handleSaveEvent()`/`handleDeleteEvent()`. `openAddOnDate(dateStr)` is the add-task variant that pre-fills `due_date`.
- **Delete confirmation:** the "DELETE EVENT" button does NOT delete directly — it sets `confirmDeleteEvent` which renders a confirmation modal (mirrors the task `deleteTarget` modal) layered over the event modal; only its DELETE button calls `handleDeleteEvent()`. `confirmDeleteEvent` is reset in `closeModal()`.
- **Resolved task rows in the calendar** (`renderTask`) show a `DONE <resolved_at>` line (muted) instead of the active `DUE/OVERDUE <due_date>` line.
- **AI Auto-Fill for events:** the event modal (new events only) has an AI box mirroring the task one — `eventAiPrompt`/`eventAiLoading`/`eventAiError` state + `handleEventAiFill()`. It calls `aiAutoFill(prompt, "event")`; the shared `ai-autofill` edge function branches on a `mode` body param (`"task"` default | `"event"`) to pick `taskSystem` vs `eventSystem` and returns event-shaped JSON (`title, event_date, all_day, start_time, end_time, category, location, notes, recurrence`).

## supabase.js Fallback Fix

- `FALLBACK_URL`/`FALLBACK_KEY` in `src/lib/supabase.js` previously pointed at the WRONG project (`ghnpzllykteelveezhnv` / quotesync). They now point at the confirmed life-tracker project (`lscgejzogtikkftwlnjn`) URL + anon key. Env vars (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) still override the fallback when present.
