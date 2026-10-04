import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import { Server, replyService, BohoAuth, StringKeyProvider } from 'iosignal'
import { Session } from '../lib/session.js'

const opts = url => ({ connect: url, timeout: 1500 })
async function until(check) {
  for (let i = 0; i < 200; i++) { if (check()) return; await delay(10) }
  throw new Error('condition timed out')
}
function launch(t, args, input, binary = 'remocon') {
  const directory = process.env.REMOCON_TEST_BIN_DIR
  const executable = directory ? path.join(directory, binary + (process.platform === 'win32' ? '.exe' : '')) : process.execPath
  const argv = directory ? args : [`bin/${binary}.js`, ...args]
  const child = spawn(executable, argv, {
    stdio: ['pipe','pipe','pipe'],
    ...(directory ? { cwd: directory, env: { ...process.env, PATH: '', NODE_PATH: '', NODE_OPTIONS: '' } } : {})
  })
  child.text = ''
  child.stdout.on('data', b => { child.text += b })
  child.stderr.on('data', b => { child.text += b })
  child.done = once(child, 'exit').then(([code]) => code)
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL') })
  if (input !== undefined) child.stdin.end(input)
  return child
}
async function fixture(t, auth = false) {
  const server = new Server({ port: 0, congPort: 0 }, auth ? new BohoAuth(new StringKeyProvider('uno.uno-key.uno.1')) : undefined)
  server.attach('reply', replyService)
  await once(server, 'ready')
  t.after(() => new Promise(resolve => server.close(resolve)))
  const url = `ws://127.0.0.1:${server.port}`
  const subscriber = new Session(opts(url))
  subscriber.io.channels.add('demo')
  subscriber.io.channels.add('other')
  const messages = []
  subscriber.io.on('message', (tag, ...payload) => messages.push([tag,...payload]))
  await subscriber.connect(); await subscriber.flush()
  t.after(() => subscriber.destroy())
  return { url, tcp: `cong://127.0.0.1:${server.congPort}`, messages, server }
}

test('one-shot WS/TCP, empty/multiple/dash payload and remote compatibility', { timeout: 15000 }, async t => {
  const { url, tcp, messages } = await fixture(t)
  for (const address of [url,tcp]) {
    const child = launch(t, ['-c',address,'pub','demo','hello world','','--literal'], '')
    assert.equal(await child.done, 0, child.text)
  }
  const remote = launch(t, ['-c',url,'demo','old form'], '', 'remote')
  assert.equal(await remote.done, 0, remote.text)
  await until(() => messages.length === 3)
  assert.deepEqual(messages, [['demo','hello world','','--literal'],['demo','hello world','','--literal'],['demo','old form']])
})
test('line input preserves whitespace, Unicode, blank lines, CRLF and final partial line', { timeout: 10000 }, async t => {
  const { url, messages } = await fixture(t)
  const child = launch(t, ['-c',url,'input','demo','--lines'], '  hello world  \r\n\r\n.quit\n한글🙂\nlast')
  assert.equal(await child.done, 0, child.text)
  assert.deepEqual(messages, [['demo','  hello world  '],['demo',''],['demo','.quit'],['demo','한글🙂'],['demo','last']])
})
test('dotless interactive commands, prefix rejection, quotes and line-mode escape/back', { timeout: 10000 }, async t => {
  const { url, messages } = await fixture(t)
  const child = launch(t, ['-c',url,'console'], 'bogus\n.pub demo SHOULD-NOT-SEND\n.help\n.quit\npub demo "hello world" ""\ninput demo\nraw line\n..back\n.back\npub other next\nquit\npub demo SHOULD-NOT-SEND\n')
  assert.equal(await child.done, 0, child.text)
  assert.match(child.text, /알 수 없는 명령/)
  assert.equal((child.text.match(/명령 앞의 점/g) || []).length, 3)
  assert.deepEqual(messages, [['demo','hello world',''],['demo','raw line'],['demo','.back'],['other','next']])
})
test('service call and authenticated one-shot', { timeout: 10000 }, async t => {
  const { url } = await fixture(t, true)
  const child = launch(t, ['-c',url,'-i','uno','-k','uno-key','call','reply','echo','hello'], '')
  assert.equal(await child.done, 0, child.text)
  assert.match(child.text, /hello/)
  assert.doesNotMatch(child.text, /uno-key/)
})
test('invalid input, auth failures and refusal exit nonzero', { timeout: 15000 }, async t => {
  const { url } = await fixture(t, true)
  for (const args of [
    ['input','demo','--keys'], ['input','demo','--keys','--lines'], ['-i','uno','pub','demo'],
    ['-c','file:///tmp/x','pub','demo'], ['-c',url,'-i','uno','-k','bad','pub','demo'],
    ['-c','ws://127.0.0.1:1','-t','100','pub','demo']
  ]) {
    const child = launch(t,args,'')
    assert.equal(await child.done,1,child.text)
  }
})
test('console subscriptions can be removed and close/open reused', { timeout: 10000 }, async t => {
  const { url } = await fixture(t)
  const child = launch(t,['-c',url], 'sub demo,other\nch\nunsub demo\nch\nclose\nopen\nch\nquit\n')
  assert.equal(await child.done,0,child.text)
  assert.match(child.text,/channels: demo,other/)
  assert.equal((child.text.match(/channels: other/g)||[]).length,2)
})

test('ready timeout and interrupt while connection is pending clean up sockets', { timeout: 10000 }, async t => {
  const { createServer } = await import('node:net')
  const sockets = new Set()
  let connections = 0
  const silent = createServer(socket => { connections++; sockets.add(socket); socket.on('close', () => sockets.delete(socket)) })
  silent.listen(0,'127.0.0.1'); await once(silent,'listening')
  t.after(() => { for (const socket of sockets) socket.destroy(); return new Promise(resolve => silent.close(resolve)) })
  const url = `ws://127.0.0.1:${silent.address().port}`
  const timeout = launch(t,['-c',url,'-t','100','pub','demo'],'')
  assert.equal(await timeout.done,1,timeout.text)
  assert.match(timeout.text,/時間|시간 초과/)
  if (process.platform === 'win32') return // Windows kill(SIGINT) force-terminates; Ctrl+C is a console event.
  const waiting = launch(t,['-c',url,'-t','30000','pub','demo'],'')
  await until(() => connections === 2)
  waiting.kill('SIGINT')
  assert.equal(await waiting.done,0,waiting.text)
})
test('connection loss and quota overflow do not silently succeed', { timeout: 10000 }, async t => {
  const { url, server } = await fixture(t)
  const big = launch(t,['-c',url,'input','demo'], `${'x'.repeat(1048577)}\n`)
  assert.equal(await big.done,1,big.text)
  const console = launch(t,['-c',url,'console'])
  console.stdin.write('id\n')
  await until(() => console.text.includes('state: ready'))
  for (const socket of server.wss.clients) socket.terminate()
  assert.equal(await console.done,1,console.text)
})
test('SIGTERM cancels a pending service call without waiting its 30s timer', { timeout: 10000, skip: process.platform === 'win32' }, async t => {
  const { url, server } = await fixture(t)
  let requested = false
  server.attach('silent', { commands: ['hold'], checkPermission: () => true, hold: () => { requested = true } })
  const child = launch(t,['-c',url,'-t','30000','call','silent','hold'],'')
  await until(() => requested)
  child.kill('SIGTERM')
  assert.equal(await child.done,143,child.text)
})
test('lost connection cancels the pending RPC timer', { timeout: 10000 }, async t => {
  const { url, server } = await fixture(t)
  server.attach('drop', { commands: ['now'], checkPermission: () => true, now: remote => remote.socket.terminate() })
  const child = launch(t,['-c',url,'-t','30000','call','drop','now'],'')
  assert.equal(await child.done,1,child.text)
})
