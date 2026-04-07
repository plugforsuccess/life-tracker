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

## Data Model

### `blocked_by` field

- `blocked_by` is `jsonb` in Supabase (changed from `uuid[]`)
- Each entry shape: `{ id: string, reason: string }` — reason may be empty string
- Backward compatibility: existing string UUID entries handled via `typeof entry === "string"` fallback everywhere `blocked_by` is read
- `BLOCKER_COMPATIBILITY` constant defines which status tracks can block which others — located near `STATUS_PAIRS`
- Blocker section is collapsed by default in the modal — expands on tap
- Cross-category blockers are hidden by default — shown via toggle

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
