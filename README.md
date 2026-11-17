# OpenCode Vim TUI

A Vim-inspired modal editing plugin for the OpenCode terminal UI.

## Install

### Windows

From this repository, run:

```powershell
pwsh -File .\scripts\install.ps1
```

To remove the plugin from the global CLI config:

```powershell
pwsh -File .\scripts\install.ps1 -Uninstall
```

The installer edits `~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json`), preserves other settings,
and creates a timestamped backup before changing an existing file. Close and reopen the TUI after installing or changing
the plugin source.

### Other platforms

Add this repository's absolute path to the `plugins` array in the global `cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["/absolute/path/to/opencode-vim-tui"]
}
```

Merge the entry into your existing file; don't replace other settings.

## Use

Starts in **Normal** mode. Press `i` to type; `Esc` returns to Normal mode. `Ctrl+Alt+V` toggles modes. The command
palette and `/vim` command also expose **Toggle Vim mode**.

| Normal-mode keys | Action |
| --- | --- |
| `h/l` | Move prompt cursor, or focus the adjacent pane when the prompt is not focused |
| `j/k` | Scroll the session transcript down/up |
| `w/b/e`, `0/^/$` | Word and line motions |
| `i/a/I/A`, `o/O` | Enter Insert mode |
| `x/X`, `u`, `Ctrl+R` | Delete character, undo, redo |
| `p/P` | Paste from the system clipboard after/before the cursor |
| `d` then `d/w/b/e/h/l/0/$` | Delete line, word, character, or to line boundary |
| `c` then `c/w/b/e/h/l/0/$` | Change matching text, then enter Insert mode |
| `q` then a letter, `q` | Record/stop a macro |
| `@` then a letter, `@@` | Replay a macro |
| `Ctrl+D` / `Ctrl+U` | Scroll half a page |

The plugin handles Normal-mode keys only in OpenCode's base input mode and leaves Insert-mode typing to the TUI.

## Limitations

This is Vim-inspired, not a full Vim implementation. Named text registers, yanking selections, visual mode, counts, and
full text objects are unavailable because OpenCode does not expose the prompt buffer/selection through its plugin API.
`p/P` use the system clipboard. `e` currently behaves like `w`.

## Development

```sh
npm test
```

The plugin entry point is `src/tui.ts`; `src/vim-keys.ts` contains key normalization and editor actions.
