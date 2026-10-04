import { Command, InvalidArgumentError } from 'commander'
import { run } from './runtime.js'
import { help } from './commands.js'
import pkg from '../package.json' with { type: 'json' }

function timeout(value) {
  if (!/^\d+$/u.test(value) || Number(value) < 1 || Number(value) > 2147483647) throw new InvalidArgumentError('1~2147483647 밀리초를 지정하세요.')
  return Number(value)
}
export async function main(argv = process.argv, legacy = false) {
  const program = new Command()
    .name(legacy ? 'remote' : 'remocon')
    .description('IOSignal 단발 전송, 줄/키 입력, 대화형 클라이언트')
    .version(pkg.version)
    .option('-c, --connect <url>', 'ws://, wss://, cong:// 서버 주소', 'wss://io.remocon.kr/ws')
    .option('-i, --id <id>', '인증 ID (--key와 함께 사용)')
    .option('-k, --key <key>', '인증 키')
    .option('-a, --auth-idKey <id.key>', '인증 ID와 키')
    .option('-j, --join-channel <tags>', '시작 시 구독 (쉼표 구분)')
    .option('-t, --timeout <ms>', '연결·서버 응답 제한 시간', timeout, 10000)
    .enablePositionalOptions()
    .showHelpAfterError()
  const start = (mode, args) => run(mode, args, program.opts())
  if (legacy) {
    program.argument('<tag>').argument('[payload...]')
      .description('호환 명령: remote <tag> [payload...] → remocon pub <tag> [payload...]')
      .action((tag, payload) => start('once', ['pub', tag, ...payload]))
  } else {
    program.action(() => start('console', []))
    program.command('console').description('대화형 명령 (점 없이 입력)').action(() => start('console', []))
    program.command('pub').aliases(['publish','sig','signal']).description('한 번 전송 후 종료')
      .argument('<tag>').argument('[payload...]').passThroughOptions()
      .action((tag, payload) => start('once', ['pub',tag,...payload]))
    program.command('call').description('서비스 응답을 기다린 뒤 종료')
      .argument('<service>').argument('<command>').argument('[args...]').passThroughOptions()
      .action((service, command, args) => start('once', ['call',service,command,...args]))
    program.command('input').description('Enter 기준 줄 단위 전송 (기본) 또는 키 단위 전송')
      .argument('<tag>').option('--keys', 'Enter 없이 키 입력마다 전송').option('--lines', '줄 단위 전송 (기본)')
      .action((tag, opts) => {
        if (opts.keys && opts.lines) throw new Error('--keys와 --lines는 함께 사용할 수 없습니다.')
        return start(opts.keys ? 'keys' : 'lines', [tag])
      })
    program.addHelpText('after', `
공통 옵션은 하위 명령 앞에 지정하세요.
  remocon -c ws://localhost:7777 pub demo "hello world"
  remocon input demo --lines
  remocon input demo --keys
  remocon console

${help}`)
  }
  try { await program.parseAsync(argv) }
  catch (error) {
    console.error(`오류: ${error.message || String(error)}`)
    process.exitCode = error.exitCode || 1
  }
}
