# Strop design system

Strop is an AI mock-interview platform for software engineers. The interface is a quiet, dark-first workbench with a matching warm light theme. Operate mode: scanability and task completion outrank decoration.

## Principles
- Calm surfaces, one cream/ink accent, one orange "live" signal. Orange is only for recording, the gap on a skill radar, and destructive hover.
- Motion explains state (a turn settling in, a bar filling, a theme change). Nothing decorative loops during a live interview.
- Text is the product. Transcript and report copy stay at 14px or larger; mono micro-labels never go below 11px.
- Every control is reachable and visible by keyboard. Dialogs trap focus and close on Esc.

## Tokens (all in `frontend/src/index.css`)
Defined as CSS variables on `:root` (dark) and `:root.light`. Tailwind exposes them as `bg-ob-*`, `text-ob-*`, `border-ob-*`. Never hard-code hex in components.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--ob-bg` | #0d0d0c | #f3eedf | page ground |
| `--ob-bg1` | #121211 | #ece6d3 | sidebar, app shell |
| `--ob-bg2` / `--ob-card` | #161614 / #181817 | #f8f4e7 / #faf7ec | panes, cards |
| `--ob-bg3` | #20201e | #e8e1cc | hover, inset |
| `--ob-ln` / `ln2` / `ln3` | #2b2b28 / #3a3a36 / #55544e | #ddd6bf / #cbc3a8 / #a59d80 | borders |
| `--ob-tx` / `tx2` / `tx3` | #ebe9e2 / #aaa89f / #8f8d85 | #28251c / #5a5646 / #6c6753 | text |
| `--ob-ac` | #e6dfcc | #2a261b | accent, primary buttons (text on it is `--ob-onac`) |
| `--ob-hot` `ok` `wn` `er` | orange, green, amber, rose | darker equivalents | status |

The light theme is a yellow-tinted off-white, never pure white. `--ob-ov` and `--ob-sh` are the overlay and shadow tints. `.ob-dark-scope` / `.ob-cam` keep a region dark in both themes (camera preview).

## Type
Inter for UI, JetBrains Mono for labels, timers and code, Instrument Serif only for the landing headline emphasis. Body 14px, transcript 14.5 to 18px, labels 11px mono uppercase.

## Components
`ob-btn` (+ `ob-pr`, `ob-sm`, `ob-dg`), `ob-chip`, `ob-pane`, `ob-card`, `ob-input`, `ob-seg`, `ob-pb`. Corner radius: controls 9px, panes 14px, pills full. Shared helpers live in `components/ui.tsx` (including `useDialogA11y`).

## Theme switching
`lib/theme.ts` stores the choice and runs the change through a view transition: the new theme floods out from the toggle button as a soft wavy front. It falls back to an instant switch without view-transition support or under reduced motion.

## Interview room
Conversation first: the transcript and composer take the main column; camera preview, agenda and skills sit in a narrow rail (below the conversation on small screens). The current question stays pinned while you answer. The camera tile carries no scan line or HUD. A live interview warns before a refresh or Back navigation.
