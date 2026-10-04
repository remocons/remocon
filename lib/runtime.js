import readline from 'node:readline'
import { Session } from './session.js'
import { execute, format } from './commands.js'
import { tokenize, startKeys } from './input.js'

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
    if (rl && input.isTTY && !stopping) { rl.setPrompt(tag === null ? '> ' : `[${tag}] `); rl.prompt() }
  }
  const print = (stream, text) => {
    if (rl && input.isTTY && errorOutput.isTTY) readline.clearLine(errorOutput, 0)
    stream.write(`${text}\n`)
    prompt()
  }
  const context = { session, hidden: false, output: text => print(output, text) }
  const onFailure = error => requestStop(error)
  const onInterrupt = () => requestStop()
  const onTerminate = () => requestStop(Object.assign(new Error('SIGTERM으로 종료했습니다.'), { exitCode: 143 }))
  session.on('failure', onFailure)
  session.io.on('message', (name, ...payload) => { if (!context.hidden) context.output(`-message: ${name} ${format(payload)}`) })
  session.io.on('@', (name, ...payload) => { if (!context.hidden) context.output(`CID Message: ${name} ${format(payload)}`) })
  session.io.on('echo', (...payload) => { if (payload[0] !== session.flushToken) context.output(`ECHO ${format(payload)}`) })
  session.io.on('iam_res', (...payload) => context.output(`IAM ${format(payload)}`))
  process.once('SIGINT', onInterrupt)
  process.once('SIGTERM', onTerminate)
  let result
  try {
    const work = async () => {
      await session.connect()
      if (stopping) return
      if (input.isTTY) print(errorOutput, `ready: cid: ${session.io.cid} (${mode}) 종료: Ctrl+C`)
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
            print(errorOutput, `오류: ${error.message || format([error])}`)
          }
          prompt()
        }
        rl.on('line', line => {
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
    cleanupInput()
    session.destroy()
    process.off('SIGINT', onInterrupt)
    process.off('SIGTERM', onTerminate)
  }
}
