import assert from "node:assert/strict"
import test from "node:test"
import { editAction, normalizeKey, operatorCommand, sessionCommand } from "../src/vim-keys.ts"

test("normalizes shifted Vim keys", () => {
  assert.equal(normalizeKey("v", true), "V")
  assert.equal(normalizeKey("2", true), "@")
  assert.equal(normalizeKey("2", false), "2")
})

test("maps delete operator motions to OpenCode input commands", () => {
  assert.equal(operatorCommand("d"), "input.delete.line")
  assert.equal(operatorCommand("w"), "input.delete.word.forward")
  assert.equal(operatorCommand("$"), "input.delete.to.line.end")
  assert.equal(operatorCommand("z"), undefined)
})

test("moves the focused prompt editor for Vim h/l", () => {
  const calls = []
  const editor = Object.fromEntries(
    ["moveCursorLeft", "moveCursorDown", "moveCursorUp", "moveCursorRight"].map((name) => [
      name,
      () => calls.push(name),
    ]),
  )

  for (const [key, method] of [
    ["h", "moveCursorLeft"],
    ["l", "moveCursorRight"],
  ]) {
    const action = {
      h: "input.move.left",
      l: "input.move.right",
    }[key]
    editAction(editor, action)
    assert.equal(calls.at(-1), method)
  }
})

test("maps Vim j/k to transcript scrolling", () => {
  assert.equal(sessionCommand("j"), "session.line.down")
  assert.equal(sessionCommand("k"), "session.line.up")
  assert.equal(sessionCommand("h"), undefined)
})
