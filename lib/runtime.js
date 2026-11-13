import readline from 'node:readline'
import { formatLog } from './log.js'
import { Session } from './session.js'
import { execute, format } from './commands.js'
import { tokenize, startKeys } from './input.js'
import { createPingDisplay } from './ping-line.js'

export async function run(mode, args, options, streams = {}) {
  const input = streams.input || process.stdin
  const output = streams.output || process.stdout
  const errorOutput = streams.error || process.stderr
  if (mode === 'keys' && (!input.isTTY || typeof input.setRawMode !== 'function')) throw new Error('키 모드는 TTY 터미널이 필요합니다. 파이프는 줄 모드를 사용하세요.')
  if (Boolean(options.id) !== Boolean(options.key)) throw new Error('--id와 --key는 함께 지정하세요.')
  if (['lines', 'keys'].includes(mode) && !args[0]) throw new Error('전송할 태그가 비어 있습니다.')
  if (options.authIdKey && !/^[^.]+\..+$/u.test(options.authIdKey)) throw new Error('--auth-idKey는 id.key 형식입니다.')
  const session = new Session(options)
  let cleanupInput = () => {}, rl, stopping = false, tag = mode === 'lines' ? args[0] : null
  let finish
  const stopped = new Promise(resolve => { finish = resolve })
  const requestStop = error => { if (!stopping) { stopping = true; finish(error) } }
  const prompt = () => {
    if (rl && input.isTTY && !stopping) {
      const marker = tag === null ? '›' : `[${tag}]`
      rl.setPrompt(errorOutput.isTTY && !process.env.NO_COLOR ? `\x1b[38;5;109m${marker}\x1b[39m ` : `${marker} `)
      // true: what is being typed is drawn again with the cursor where it was.
      rl.prompt(true)
    }
  }
  // Lines written so far, printed or typed: the ping line is changed in place only while it is the last.
  let lines = 0
  // Erases the prompt and what is being typed, every row of it when it wraps, so a message can be written
  // there; prompt() then draws the typed text again.
  const clearInput = () => {
    if (!rl || !input.isTTY || !errorOutput.isTTY) return
    readline.moveCursor(errorOutput, 0, -rl.getCursorPos().rows)
    readline.cursorTo(errorOutput, 0)
    readline.clearScreenDown(errorOutput)
    // readline redraws by moving up the rows it last drew; the cursor is already at the top of them.
    rl.prevRows = 0
  }
  const print = (stream, text, kind = 'reply') => {
    lines++
    clearInput()
    const interactive = input.isTTY && stream.isTTY
    stream.write(`${interactive ? formatLog(kind === 'incoming' ? text.replace(/^CID Message: /, '직접 ').replace(/^-message: /, '채널 ') : text, { kind, timestamps: options.timestamps, color: !process.env.NO_COLOR }) : text}\n`)
    prompt()
  }
  const context = { session, hidden: false, output: (text, kind) => print(output, text, kind) }
  // A ping is one line that changes in place (ping-line.js, shared with iosignal-cli).
  const live = Boolean(input.isTTY && output.isTTY)
  const pingDisplay = createPingDisplay({
    live,
    print: (text, kind) => print(output, text, kind),
    rewrite: (text, kind) => {
      clearInput()
      output.write(`\x1b[1A\r\x1b[2K${formatLog(text, { kind, timestamps: options.timestamps, color: !process.env.NO_COLOR })}\n`)
      prompt()
    },
    lines: () => lines,
  })
  // A typed line stays on screen, except a ping that updates the ping line just above it.
  const typed = line => {
    let target = null
    if (mode === 'console' && tag === null) {
      try {
        const words = tokenize(line)
        if (['ping', 'pping'].includes(words[0]) && words.length <= 2) target = words[1] ?? ''
      } catch {}
    }
    if (target !== null && live && pingDisplay.continues(target)) errorOutput.write('\x1b[1A\r\x1b[2K')
    else lines++
  }
  const onFailure = error => requestStop(error)
  const onInterrupt = () => requestStop()
  const onTerminate = () => requestStop(Object.assign(new Error('SIGTERM으로 종료했습니다.'), { exitCode: 143 }))
  session.on('failure', onFailure)
  session.io.on('message', (name, ...payload) => { if (!context.hidden) context.output(`-message: ${name} ${format(payload)}`, 'incoming') })
  session.io.on('@', (name, ...payload) => { if (!context.hidden && !['@ping', '@pong'].includes(name)) context.output(`CID Message: ${name} ${format(payload)}`, 'incoming') })
  session.on('ping_sent', target => pingDisplay.start(target))
  session.on('pong', (target, ms) => pingDisplay.pong(target, ms))
  session.on('ping_timeout', (target, ms) => pingDisplay.timeout(target, ms))
  session.io.on('echo', (...payload) => { if (payload[0] !== session.flushToken) context.output(`ECHO ${format(payload)}`) })
  session.io.on('iam_res', (...payload) => context.output(`IAM ${format(payload)}`))
  process.once('SIGINT', onInterrupt)
  process.once('SIGTERM', onTerminate)
  let result
  try {
    const work = async () => {
      await session.connect()
      if (stopping) return
      if (input.isTTY) print(errorOutput, `[연결] 접속 완료 (${mode}) · 종료: Ctrl+C`, 'status')
      if (mode === 'once') { await execute(args, context); return }
      if (mode === 'keys') {
        cleanupInput = startKeys(input, value => session.signal(args[0], value), onInterrupt, onFailure)
        await stopped
        return
      }
      await new Promise((resolve, reject) => {
        let chain = Promise.resolve()
        rl = readline.createInterface({ input, output: errorOutput, terminal: Boolean(input.isTTY && errorOutput.isTTY), crlfDelay: Infinity })
        cleanupInput = () => { rl.close(); input.pause() }
        rl.on('SIGINT', onInterrupt)
        rl.on('error', reject)
        input.on('error', reject)
        const onLine = async line => {
          if (stopping) return
          try {
            // Dedicated line mode sends every line literally, including blank lines.
            if (mode === 'lines') session.signal(tag, line)
            else if (tag !== null) {
              if (line === '.back') tag = null
              else if (line === '.quit' || line === '.exit') { requestStop(); return }
              else session.signal(tag, line.startsWith('..') ? line.slice(1) : line)
            } else {
              const commandResult = await execute(tokenize(line), context)
              if (commandResult === 'quit') { requestStop(); return }
              if (commandResult?.input) tag = commandResult.input
            }
          } catch (error) {
            if (mode !== 'console' || session.failure) throw error
            if (!error.pingTimeout) print(errorOutput, errorOutput.isTTY && input.isTTY ? `${error.message || format([error])}` : `오류: ${error.message || format([error])}`, 'error')
          }
          prompt()
        }
        rl.on('line', line => {
          typed(line)
          chain = chain.then(() => onLine(line))
          chain.catch(reject)
        })
        rl.on('close', () => { input.off('error', reject); chain.then(resolve, reject) })
        prompt()
      })
    }
    result = await Promise.race([work().then(() => null, error => error), stopped])
    stopping = true
    cleanupInput()
    if (!result && session.io.stateName === 'ready') await session.flush()
    if (result) throw result
  } finally {
    stopping = true
    pingDisplay.dispose()
    cleanupInput()
    session.destroy()
    process.off('SIGINT', onInterrupt)
    process.off('SIGTERM', onTerminate)
  }
}
