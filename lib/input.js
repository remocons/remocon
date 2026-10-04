import readline from 'node:readline'

// A small command lexer, not a shell: no expansion or execution.
export function tokenize(line) {
  const words = []
  let word = '', quote = null, active = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\' && quote !== "'" && i + 1 < line.length && /[\s"'\\]/u.test(line[i + 1])) {
      word += line[++i]; active = true
    } else if (quote) {
      if (ch === quote) quote = null
      else word += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch; active = true
    } else if (/\s/u.test(ch)) {
      if (active) { words.push(word); word = ''; active = false }
    } else { word += ch; active = true }
  }
  if (quote) throw new Error('닫히지 않은 따옴표입니다.')
  if (active) words.push(word)
  return words
}

export function keyPayload(value, key = {}) {
  // Keep text/case/Unicode; normalize control and terminal escape sequences.
  const text = value && !/[\u0000-\u001f\u007f-\u009f]/u.test(value) ? value : null
  if (text && !key.ctrl && !key.meta) return text
  let name = key.name === 'return' || key.name === 'enter' ? 'enter' : key.name
  if (!name) return null
  return [key.ctrl && 'ctrl', key.meta && 'alt', key.shift && 'shift', name].filter(Boolean).join('+')
}

export function startKeys(input, send, exit, fail) {
  if (!input.isTTY || typeof input.setRawMode !== 'function') throw new Error('키 모드는 TTY 터미널이 필요합니다. 파이프는 줄 모드를 사용하세요.')
  const wasRaw = Boolean(input.isRaw)
  readline.emitKeypressEvents(input)
  const onKey = (value, key = {}) => {
    if (key.ctrl && key.name === 'c') { exit(); return }
    const payload = keyPayload(value, key)
    if (payload !== null) {
      try { send(payload) } catch (error) { fail(error) }
    }
  }
  input.setRawMode(true)
  input.on('keypress', onKey)
  input.on('end', exit)
  input.resume()
  let cleaned = false
  return () => {
    if (cleaned) return
    cleaned = true
    input.off('keypress', onKey)
    input.off('end', exit)
    input.setRawMode(wasRaw)
    input.pause()
  }
}
