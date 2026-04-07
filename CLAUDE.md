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
