import { Plugin } from "@opencode/plugin/tui"
import type { KeyEvent, ParsedKey, PasteEvent } from "@opentui/core"
import { editAction, normalizeKey, operatorCommand, sessionCommand } from "./vim-keys.ts"

type RecordedInput =
  | { type: "key"; key: ParsedKey }
  | { type: "paste"; bytes: Uint8Array }

export default Plugin.define({
  id: "opencode-vim.tui",
  setup(context) {
    type Operator = "delete" | "change"

    let mode: "normal" | "insert" = "normal"
    let operator: Operator | undefined
    let awaitingMacro: "record" | "play" | undefined
    let recording: string | undefined
    let lastMacro: string | undefined
    let playing = false
    const macros = new Map<string, RecordedInput[]>()

    const setMode = (next: "normal" | "insert") => {
      mode = next
      operator = undefined
      context.ui.toast.show({
        title: "Vim",
        message: `${next.toUpperCase()} mode`,
        duration: 900,
      })
    }

    const dispatch = (command: string) => context.keymap.dispatch(command)

    const saveKey = (event: KeyEvent) => {
      if (!recording || playing) return
      macros.get(recording)?.push({
        type: "key",
        key: {
          name: event.name,
          ctrl: event.ctrl,
          meta: event.meta,
          shift: event.shift,
          option: event.option,
          sequence: event.sequence,
          number: event.number,
          raw: event.raw,
          eventType: "press",
          source: event.source,
          code: event.code,
          super: event.super,
          hyper: event.hyper,
          capsLock: event.capsLock,
          numLock: event.numLock,
          baseCode: event.baseCode,
          repeated: event.repeated,
        },
      })
    }

    const replay = (register: string) => {
      const inputs = macros.get(register)
      if (!inputs || playing) return
      playing = true
      try {
        for (const input of inputs) {
          if (input.type === "key") context.renderer.keyInput.processParsedKey(input.key)
          else context.renderer.keyInput.processPaste(input.bytes)
        }
      } finally {
        playing = false
      }
    }

    function onKey(event: KeyEvent) {
      if (event.eventType === "release") return
      const editor = context.renderer.currentFocusedEditor
      if (context.keymap.mode.current() !== "base") return

      const key = normalizeKey(event.name, event.shift)
      const alt = event.option || event.meta
      const consume = () => {
        event.preventDefault()
        event.stopPropagation()
      }

      if (event.ctrl && alt && key.toLowerCase() === "v") {
        consume()
        setMode(mode === "normal" ? "insert" : "normal")
        return
      }

      if (mode === "insert") {
        if (!editor) return
        if (recording && !playing) saveKey(event)
        if (key === "escape" || (event.ctrl && key === "[")) {
          consume()
          setMode("normal")
        }
        return
      }

      if (event.ctrl && !alt && ["r", "d", "u"].includes(key.toLowerCase())) {
        operator = undefined
        if (recording && !playing) saveKey(event)
        consume()
        if (key.toLowerCase() === "r") editAction(editor, "input.redo")
        else dispatch(key.toLowerCase() === "d" ? "session.half.page.down" : "session.half.page.up")
        return
      }
      if ((event.ctrl && !alt) || (event.meta && !event.option) || (alt && key.length > 1)) {
        operator = undefined
        awaitingMacro = undefined
        return
      }

      // Normal mode consumes unmapped input too, so it cannot accidentally enter the prompt.
      consume()

      if (awaitingMacro) {
        const pending = awaitingMacro
        awaitingMacro = undefined
        if (pending === "play" && key === "@") {
          if (lastMacro) replay(lastMacro)
          return
        }
        if (!/^[a-z]$/i.test(key)) return
        const register = key.toLowerCase()
        if (pending === "record") {
          macros.set(register, [])
          recording = register
          context.ui.toast.show({ title: "Vim", message: `Recording @${register}`, duration: 900 })
        } else {
          lastMacro = register
          replay(register)
        }
        return
      }

      if (key === "q") {
        operator = undefined
        if (recording) {
          context.ui.toast.show({ title: "Vim", message: `Recorded @${recording}`, duration: 900 })
          recording = undefined
        } else {
          awaitingMacro = "record"
        }
        return
      }

      if (recording && !playing) saveKey(event)

      if (operator) {
        const current = operator
        operator = undefined
        const action = operatorCommand(key)
        if (action) editAction(editor, action)
        if (current === "change" && action) setMode("insert")
        return
      }

      const sessionAction = sessionCommand(key)
      if (sessionAction) {
        dispatch(sessionAction)
        return
      }

      if (key === "@") {
        awaitingMacro = "play"
        return
      }
      if (key === "d" || key === "c") {
        operator = key === "d" ? "delete" : "change"
        return
      }

      const actions: Record<string, string> = {
        h: "input.move.left",
        l: "input.move.right",
        left: "input.move.left",
        down: "input.move.down",
        up: "input.move.up",
        right: "input.move.right",
        w: "input.word.forward",
        b: "input.word.backward",
        e: "input.word.forward",
        "0": "input.line.home",
        home: "input.line.home",
        "^": "input.line.home",
        $: "input.line.end",
        end: "input.line.end",
        x: "input.delete",
        X: "input.backspace",
        u: "input.undo",
      }

      if (key === "i") setMode("insert")
      else if (key === "a") {
        editAction(editor, "input.move.right")
        setMode("insert")
      } else if (key === "p") {
        editAction(editor, "input.move.right")
        dispatch("prompt.paste")
      } else if (key === "P") {
        dispatch("prompt.paste")
      } else if (key === "I") {
        editAction(editor, "input.line.home")
        setMode("insert")
      } else if (key === "A") {
        editAction(editor, "input.line.end")
        setMode("insert")
      } else if (key === "o" || key === "O") {
        editAction(editor, key === "O" ? "input.line.home" : "input.line.end")
        editAction(editor, "input.newline")
        setMode("insert")
      } else if (key === "escape") {
        operator = undefined
      } else if (actions[key]) {
        if (editor) editAction(editor, actions[key])
        else if (key === "h") dispatch("pane.focus.left")
        else if (key === "l") dispatch("pane.focus.right")
      }
    }

    function onPaste(event: PasteEvent) {
      if (!context.renderer.currentFocusedEditor || context.keymap.mode.current() !== "base") return
      if (mode === "normal") {
        event.preventDefault()
        event.stopPropagation()
      } else if (recording && !playing) {
        macros.get(recording)?.push({ type: "paste", bytes: event.bytes.slice() })
      }
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "opencode-vim.toggle",
          title: "Toggle Vim mode",
          group: "Vim",
          bind: false,
          palette: true,
          slash: { name: "vim" },
          run: () => setMode(mode === "normal" ? "insert" : "normal"),
        },
      ],
      bindings: ["opencode-vim.toggle"],
    }))

    // Intercept before the prompt so every key is safe to consume in Normal mode.
    context.renderer.keyInput.prependListener("keypress", onKey)
    context.renderer.keyInput.prependListener("paste", onPaste)
    context.ui.toast.show({ title: "Vim", message: "NORMAL mode — press i to type", duration: 1800 })

    return () => {
      context.renderer.keyInput.removeListener("keypress", onKey)
      context.renderer.keyInput.removeListener("paste", onPaste)
    }
  },
})
