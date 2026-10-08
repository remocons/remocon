import { inspect } from 'node:util'
import { ENC_MODE } from 'iosignal'

export const help = `명령 앞에 점(.)을 붙이지 않습니다. 따옴표로 공백과 빈 문자열을 묶을 수 있습니다.
sub/subscribe/listen/join <tag[,tag...]>   구독
unsub [tags]                             구독 취소 (생략: 전체)
pub/publish/sig/signal <tag> [args...]    전송
sig_bin <tag> <bytes>                    0으로 채운 바이너리 전송
call <service> <command> [args...]       서비스 호출
sudo <command> [args...]                 sudo 서비스 호출
input <tag>                             줄 입력 모드 (.back으로 복귀)
auth/login <id> <key> 또는 <id.key>      인증 설정 / 로그인
id / ch / quota                         연결 / 구독 / quota
ping [cid] / pong / pping <cid>                서버 / 상대 ping
echo [text] / iam [name]                echo / 별명
encNo / encYes / encAuto / encMode       암호화 모드
hide / show                             수신 출력 숨김 / 표시
close / open [url] / connect [url]       연결 닫기 / 열기
help / quit / exit                      도움말 / 종료`

export const format = values => values.map(v => typeof v === 'string' ? v : inspect(v, { depth: 6, colors: false, breakLength: Infinity })).join(' ')
const aliases = { subscribe:'sub', listen:'sub', join:'sub', publish:'pub', signal:'pub', sig:'pub', connect:'open', exit:'quit' }
export async function execute(words, context) {
  if (!words.length) return
  const raw = words[0]
  if (raw.startsWith('.')) throw new Error('명령 앞의 점(.)은 지원하지 않습니다. help, sub, pub처럼 입력하세요.')
  const cmd = aliases[raw] || raw
  const args = words.slice(1)
  const { session, output } = context
  const io = session.io
  const count = (min, max = Infinity) => {
    if (args.length < min || args.length > max || (min && !args[0])) throw new Error(`${raw}: 인자가 올바르지 않습니다. help를 확인하세요.`)
  }
  switch (cmd) {
    case 'help': count(0,0); output(help); return
    case 'quit': count(0,0); return 'quit'
    case 'input': count(1,1); return { input: args[0] }
    case 'hide': count(0,0); context.hidden = true; return
    case 'show': count(0,0); context.hidden = false; return
    case 'id': count(0,0); output(`state: ${io.stateName} cid: ${io.cid} level: ${io.level}`); return
    case 'ch': count(0,0); output(`channels: ${[...io.channels].join(',')}`); return
    case 'quota': count(0,0); output(JSON.stringify(io.quota)); return
    case 'encMode': count(0,0); output(`encMode: ${ENC_MODE[io.encMode]}`); return
    case 'encNo': case 'encYes': case 'encAuto':
      count(0,0); io.encMode = ENC_MODE[{ encNo:'NO', encYes:'YES', encAuto:'AUTO' }[cmd]]; return
    case 'close': count(0,0); if (io.stateName === 'ready') await session.flush(); session.disconnect(); return
    case 'open': count(0,1); await session.connect(args[0]); return
    case 'auth': case 'login':
      count(1,2)
      if (args.length === 1 && !/^[^.]+\..+$/u.test(args[0])) throw new Error('인증은 id key 또는 id.key 형식입니다.')
      if (args.length === 2 && !args[1]) throw new Error('인증 키가 비어 있습니다.')
      if (cmd === 'login') session.requireReady()
      io[cmd](...args); return
  }
  const known = ['sub','unsub','pub','sig_bin','call','sudo','ping','pong','pping','echo','iam']
  if (!known.includes(cmd)) throw new Error(`알 수 없는 명령: ${raw}. help를 확인하세요.`)
  session.requireReady()
  switch (cmd) {
    case 'pub': count(1); session.signal(...args); break
    case 'sub':
      count(1,1)
      if (args[0].split(',').some(tag => !tag)) throw new Error('빈 구독 태그입니다.')
      io.subscribe(args[0]); for (const tag of args[0].split(',')) io.channels.add(tag); break
    case 'unsub': count(0,1); io.unsubscribe(args[0]); break
    case 'sig_bin':
      count(2,2)
      if (!/^\d+$/u.test(args[1]) || Number(args[1]) > 1048576) throw new Error('바이너리 크기는 0~1048576입니다.')
      session.signal(args[0], new Uint8Array(Number(args[1]))); break
    case 'call': count(2); output(format([await io.call(...args)])); break
    case 'sudo': count(1); output(format([await io.call('sudo', ...args)])); break
    case 'pping': count(1,1); await session.ping(args[0]); break
    case 'ping': count(0,1); await session.ping(args[0]); break
    case 'echo': case 'iam': count(0,1); io[cmd](...args); break
    case 'pong': count(0,0); io[cmd](); break
  }
}
