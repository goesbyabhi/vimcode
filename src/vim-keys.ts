import type { EditBufferRenderable } from "@opentui/core"

const shifted: Record<string, string> = {
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
  "0": ")",
}

export function normalizeKey(name: string, shift: boolean) {
  if (/^[a-z]$/i.test(name)) return shift ? name.toUpperCase() : name.toLowerCase()
  return shift ? (shifted[name] ?? name) : name
}

export function operatorCommand(key: string) {
  return {
    d: "input.delete.line",
    w: "input.delete.word.forward",
    e: "input.delete.word.forward",
    b: "input.delete.word.backward",
    h: "input.backspace",
    l: "input.delete",
    "0": "input.delete.to.line.start",
    $: "input.delete.to.line.end",
  }[key]
}

export function sessionCommand(key: string) {
  return { j: "session.line.down", k: "session.line.up" }[key]
}

export function editAction(editor: EditBufferRenderable, action: string) {
  const actions: Record<string, () => boolean | void> = {
    "input.move.left": () => editor.moveCursorLeft(),
    "input.move.right": () => editor.moveCursorRight(),
    "input.move.up": () => editor.moveCursorUp(),
    "input.move.down": () => editor.moveCursorDown(),
    "input.word.forward": () => editor.moveWordForward(),
    "input.word.backward": () => editor.moveWordBackward(),
    "input.line.home": () => editor.gotoLineHome(),
    "input.line.end": () => editor.gotoLineTextEnd(),
    "input.delete": () => editor.deleteChar(),
    "input.backspace": () => editor.deleteCharBackward(),
    "input.delete.line": () => editor.deleteLine(),
    "input.delete.word.forward": () => editor.deleteWordForward(),
    "input.delete.word.backward": () => editor.deleteWordBackward(),
    "input.delete.to.line.start": () => editor.deleteToLineStart(),
    "input.delete.to.line.end": () => editor.deleteToLineEnd(),
    "input.undo": () => editor.undo(),
    "input.redo": () => editor.redo(),
    "input.newline": () => editor.newLine(),
  }
  return actions[action]?.()
}
