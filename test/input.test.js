import test from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { tokenize, keyPayload, startKeys } from '../lib/input.js'

test('command lexer preserves quotes, empty arguments, paths and does not expand shell syntax', () => {
  assert.deepEqual(tokenize(`pub demo "hello world" '' C:\\Users\\test '$HOME'`), ['pub','demo','hello world','','C:\\Users\\test','$HOME'])
  assert.deepEqual(tokenize('pub x hello\\ world'), ['pub','x','hello world'])
  assert.throws(() => tokenize('pub x "oops'), /따옴표/)
})
test('keypress normalization handles text and terminal modifiers', () => {
  assert.equal(keyPayload('A',{name:'a',shift:true}),'A')
  assert.equal(keyPayload('한'), '한')
  assert.equal(keyPayload('\r',{name:'return'}),'enter')
  assert.equal(keyPayload('\u001b[A',{name:'up'}),'up')
  assert.equal(keyPayload('\u0001',{name:'a',ctrl:true}),'ctrl+a')
  assert.equal(keyPayload('\u001bx',{name:'x',meta:true}),'alt+x')
})
test('real readline decoder sends keys immediately and restores raw mode on Ctrl+C', async () => {
  const input = new PassThrough()
  input.isTTY = true; input.isRaw = false
  const raw = []
  input.setRawMode = value => { raw.push(value); input.isRaw = value }
  const received = []
  let exited = false
  const cleanup = startKeys(input, value => received.push(value), () => { exited = true }, error => { throw error })
  input.write('aA\u001b[A\r\t\u007f\u0001\u001bx한🙂\u0003')
  assert.deepEqual(received,['a','A','up','enter','tab','backspace','ctrl+a','alt+x','한','🙂'])
  assert.equal(exited,true)
  cleanup()
  assert.deepEqual(raw,[true,false])
  assert.equal(input.listenerCount('keypress'),0)
})
