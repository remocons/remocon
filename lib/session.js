import { randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { IO, IOCongSocket } from 'iosignal'

// IOSignal 7 clears pending RPCs on close but leaves their timeout handles alive.
// Adapt both transports locally so shutdown and remote disconnect settle them.
function cancelCalls(io, error) {
  for (const [, reject, timer] of io.promiseMap.values()) {
    clearTimeout(timer)
    reject(error)
  }
  io.promiseMap.clear()
}
const withCallCleanup = Base => class extends Base {
  close() {
    cancelCalls(this, new Error('연결이 종료되었습니다.'))
    super.close()
  }
}
const WebSocketClient = withCallCleanup(IO)
const TcpClient = withCallCleanup(IOCongSocket)

export function normalizeUrl(value) {
  const url = new URL(value.includes('://') ? value : `ws://${value}`)
  if (!['ws:', 'wss:', 'cong:'].includes(url.protocol)) throw new Error('주소는 ws://, wss:// 또는 cong://를 사용하세요.')
  if (url.protocol === 'cong:' && (!url.port || Number(url.port) === 0)) throw new Error('CongSocket 주소에는 유효한 포트가 필요합니다.')
  return url.href
}

export class Session extends EventEmitter {
  constructor(options) {
    super()
    this.url = normalizeUrl(options.connect)
    this.timeout = options.timeout
    this.io = this.url.startsWith('cong:') ? new TcpClient() : new WebSocketClient()
    this.io.autoReconnect = false
    this.io.promiseTimeOut = options.timeout
    this.pending = new Set()
    this.stopping = false
    this.io.on('error', error => this.fail(new Error(error.message || '연결 오류')))
    this.io.on('auth_fail', () => this.fail(new Error('인증 실패')))
    this.io.on('over_size', () => this.fail(new Error('서버의 메시지 크기 quota를 초과했습니다.')))
    this.io.on('close', () => { if (!this.stopping) this.fail(new Error('서버 연결이 종료되었습니다.')) })
    if (options.id) this.io.auth(options.id, options.key)
    else if (options.authIdKey) this.io.auth(options.authIdKey)
    if (options.joinChannel) for (const tag of options.joinChannel.split(',')) this.io.channels.add(tag)
  }
  fail(error) {
    this.failure = error
    this.cancelCalls(error)
    for (const reject of [...this.pending]) reject(error)
    this.emit('failure', error)
  }
  wait(event, action, accept = () => true) {
    return new Promise((resolve, reject) => {
      const done = (error, value) => {
        clearTimeout(timer); this.io.off(event, success); this.pending.delete(failure)
        error ? reject(error) : resolve(value)
      }
      const success = (...args) => { if (accept(...args)) done(null, args) }
      const failure = error => done(error)
      const timer = setTimeout(() => failure(new Error(`${event} 대기 시간 초과 (${this.timeout}ms)`)), this.timeout)
      this.pending.add(failure); this.io.on(event, success)
      try { action() } catch (error) { failure(error) }
    })
  }
  async connect(url) {
    if (url) {
      const next = normalizeUrl(url)
      if (next.startsWith('cong:') !== this.url.startsWith('cong:')) throw new Error('WS/TCP 전환은 프로그램을 다시 실행하세요.')
      this.url = next
    }
    this.failure = null; this.stopping = false
    await this.wait('ready', () => this.io.open(this.url))
  }
  requireReady() {
    if (this.failure) throw this.failure
    if (this.io.stateName !== 'ready') throw new Error('연결이 준비되지 않았습니다. open 명령으로 연결하세요.')
  }
  signal(tag, ...payload) {
    this.requireReady()
    this.io.signal(tag, ...payload)
    if (this.failure) throw this.failure
  }
  // A short echo barrier confirms the server processed preceding frames, not recipient ACK.
  async flush() {
    this.requireReady()
    this.flushToken = `rc-${randomBytes(6).toString('hex')}`
    try { await this.wait('echo', () => this.io.echo(this.flushToken), value => value === this.flushToken) }
    finally { this.flushToken = null }
  }
  disconnect() {
    this.stopping = true
    for (const reject of [...this.pending]) reject(new Error('연결이 종료되었습니다.'))
    this.cancelCalls(new Error('연결이 종료되었습니다.'))
    this.io.stop()
  }
  cancelCalls(error) {
    cancelCalls(this.io, error)
  }
  destroy() {
    this.disconnect()
    this.io.destroy()
  }
}
