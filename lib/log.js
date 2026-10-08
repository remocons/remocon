const colors = { command: '\x1b[38;5;109m', incoming: '\x1b[38;5;108m', status: '\x1b[38;5;144m', error: '\x1b[38;5;174m', reply: '\x1b[39m' }
export function formatLog(text, { kind = 'reply', timestamps = false, color = true } = {}) {
  const safe = String(text).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')
  const prefix = kind === 'incoming' ? '[수신] ' : kind === 'error' ? '[오류] ' : kind === 'status' && !safe.startsWith('[') ? '[상태] ' : ''
  const time = timestamps ? `${new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })} ` : ''
  const body = safe.replace(/\r\n?/g, '\n').split('\n').join('\n  ')
  return `${color ? colors[kind] || colors.reply : ''}${time}  ${prefix}${body}${color ? '\x1b[39m' : ''}`
}
