// The answer to a ping command as one line that changes in place, instead of a "pong" line per answer:
//   ⠋ ping …                                   while waiting (the mark turns)
//   ✓ pong 23 ms                               the answer
//   ✓ pong 21 ms · 6회 · 평균 23 ms  ▂▃▂▅▂▃     pings sent one after another keep updating the same line
// Shared file: iosignal-cli/lib is the source. remocon/lib and remocon_kr/src/lib/cli keep identical
// copies, and their tests compare them with this one (remocon: npm run sync:cli).
const SPINNER = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
const BARS = '▁▂▃▄▅▆▇█'
const RECENT = 12
const label = target => target ? ` (${target})` : ''
const round = ms => Math.max(0, Math.round(ms))

// Bars for the recent times, lowest to highest.
export function sparkline(values) {
  if (!values.length) return ''
  const min = Math.min(...values), max = Math.max(...values)
  return values.map(value => BARS[max === min ? 0 : Math.round((value - min) / (max - min) * (BARS.length - 1))]).join('')
}

// print(text, kind): write a new line. rewrite(text, kind): replace the line written last.
// lines(): how many lines the console has written so far, its own and the user's typed commands; the
// ping line is changed in place only while no other line came after it.
// live: false (output is not a terminal) writes only the answers, one line each, and never rewrites.
export function createPingDisplay({ print, rewrite, lines, live = true, frameMs = 80, setTimer = setInterval, clearTimer = clearInterval }) {
  let line = null // the ping line on screen: { target, count, total, recent }
  let mark = -1 // lines() right after it was written
  let spin = null, frame = 0
  const onScreen = target => live && line !== null && line.target === target && lines() === mark
  const stop = () => { if (spin !== null) { clearTimer(spin); spin = null } }
  const tail = () => line.count > 1 ? ` · ${line.count}회 · 평균 ${round(line.total / line.count)} ms  ${sparkline(line.recent)}` : ''
  const show = (text, kind, replace) => {
    if (replace) rewrite(text, kind)
    else print(text, kind)
    mark = lines()
  }
  const waiting = () => `${SPINNER[frame % SPINNER.length]} ping${label(line.target)} …${line.count ? tail() : ''}`

  return {
    // True when a ping to target would update the line on screen. A console then hides the typed command,
    // so pressing Enter on the same ping again keeps one line.
    continues: target => onScreen(target ?? ''),
    // A ping was sent.
    start(target = '') {
      stop()
      if (!live) return
      const replace = onScreen(target)
      if (!replace) line = { target, count: 0, total: 0, recent: [] }
      frame = 0
      show(waiting(), 'reply', replace)
      spin = setTimer(() => {
        if (!onScreen(target)) { stop(); return }
        frame++
        show(waiting(), 'reply', true)
      }, frameMs)
    },
    // Its answer, after ms milliseconds.
    pong(target = '', ms = 0) {
      stop()
      if (!live) { print(`pong${label(target)} ${round(ms)} ms`, 'reply'); return }
      const replace = onScreen(target)
      if (!replace) line = { target, count: 0, total: 0, recent: [] }
      line.count++
      line.total += ms
      line.recent = [...line.recent, ms].slice(-RECENT)
      show(`✓ pong${label(target)} ${round(ms)} ms${tail()}`, 'reply', replace)
    },
    // No answer within ms milliseconds. The next ping starts a new line, so the timeout stays visible.
    timeout(target = '', ms = 0) {
      stop()
      const text = `${live ? '✗ ' : ''}ping timeout${label(target)} · ${Math.round(ms / 100) / 10} s`
      if (!live) { print(text, 'error'); return }
      show(text, 'error', onScreen(target))
      line = null
    },
    dispose: stop
  }
}
