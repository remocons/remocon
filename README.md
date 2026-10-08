# remocon

IOSignal 서버에 연결하여 단발 명령, 줄 단위 입력, 키 단위 입력, 대화형 명령을 실행합니다. Node.js 22.16.0 이상이 필요합니다.

## 설치와 실행

Node.js 없이 실행하려면 [v0.60.0 다운로드](https://github.com/remocons/remocon/releases/tag/v0.60.0)에서 운영체제와 CPU에 맞는 파일을 받으세요. [설치 방법](packaging/sea/INSTALL.md)을 참고하세요.

npm에 배포된 버전을 전역 설치하려면:

```sh
npm install -g remocon
```

현재 저장소의 구현을 전역 설치하려면 저장소 디렉터리에서 실행합니다.

```sh
npm install -g .
```

저장소에서 직접 실행하거나 개발·테스트하려면:

```sh
npm ci
node bin/remocon.js --help
node bin/remocon.js -c ws://localhost:7777 pub demo hello
npm test
```

전역 설치 후 `remocon`과 `remote` 명령을 사용할 수 있습니다.

```sh
remocon                           # 대화형 명령
remocon console                   # 대화형 명령 (명시적 선택)
remocon pub demo "hello world"     # 한 번 전송 후 종료
remocon input demo --lines        # Enter 기준 줄 단위 전송 (기본)
remocon input demo --keys         # Enter 없이 키마다 전송
```

기본 서버 주소는 기존 구현과 같은 `wss://io.remocon.kr/ws`입니다. 공통 옵션은 하위 명령 **앞**에 지정합니다. 서버는 별도로 실행되어 있어야 합니다.

```sh
remocon -c ws://localhost:7777 pub demo hello
remocon -c cong://localhost:8888 input demo --keys
remocon -c ws://localhost:7777 -i uno -k uno-key console
```

| 공통 옵션 | 설명 |
|---|---|
| `-c, --connect <url>` | WebSocket(`ws://`, `wss://`) 또는 TCP(`cong://`); bare host:port는 WebSocket |
| `-i, --id <id>` / `-k, --key <key>` | 인증 ID와 키; 둘을 함께 지정 |
| `-a, --auth-idKey <id.key>` | 인증 정보 단축 표기; 완전한 `-i`/`-k` 쌍이 우선 |
| `-j, --join-channel <tags>` | 시작 시 구독; 쉼표 구분 |
| `-t, --timeout <ms>` | 연결, 종료 확인 및 서비스 응답 제한 시간; 기본 10000ms |
| `-h, --help` / `-V, --version` | 도움말 / 버전 |

명령행 키는 셸 이력이나 프로세스 목록에 남을 수 있습니다. 프로그램은 시작 옵션의 인증 키를 출력하지 않습니다.

## 단발 명령

```sh
remocon pub demo hello world
remocon signal demo "hello world" ""
remocon call reply echo hello
remote demo hello
```

`pub`, `publish`, `sig`, `signal`은 같은 전송 동작입니다. `hello world`를 따옴표로 묶지 않으면 두 payload 인자, 묶으면 하나의 문자열입니다. 빈 문자열과 payload 없는 신호도 지원합니다. `pub`의 태그 뒤 인자는 `--foo`처럼 시작하더라도 payload로 전달합니다.

`call`은 서버가 등록한 서비스의 응답을 기다립니다. `reply` 예제에는 서버의 `reply` 서비스 등록이 필요합니다. `remote <tag> [payload...]`는 기존 단발 전송 문법을 유지하는 호환 진입점이며 같은 구현을 사용합니다. `remote`의 대시로 시작하는 인자는 `--` 뒤에 지정하세요.

연결이 `ready`가 된 후 전송하며, 종료 전 짧은 고유 echo의 응답으로 서버가 앞선 프레임을 받았는지 확인합니다. 고정 100ms 후 강제 종료하지 않습니다. 이 확인은 **수신 장치의 수신·실행 완료 ACK가 아닙니다.** 장치의 처리 완료 보장이 필요하면 별도의 응답 프로토콜을 사용하세요.

## 줄 단위 연속 입력

```sh
remocon input demo
remocon input demo --lines
```

Enter를 누를 때 한 줄 전체를 **하나의 문자열 payload**로 보냅니다. 앞뒤 공백, 빈 줄, 따옴표를 그대로 유지하며 줄바꿈 구분자는 제외합니다. `.quit` 같은 문자열도 그대로 전송합니다. 종료는 `Ctrl+C`이며, 파이프 입력은 EOF 후 전송 확인을 거쳐 종료합니다. 마지막 줄에 줄바꿈이 없어도 전송합니다.

```sh
# macOS/Linux
printf 'first line\nsecond line\n' | remocon input demo
```

```powershell
# Windows PowerShell
"first line", "second line" | remocon input demo
```

## 키 단위 연속 입력

```sh
remocon input demo --keys
```

TTY 터미널에서 키 입력을 받는 즉시 **문자열 payload 하나**를 보냅니다. `--lines`와 `--keys`는 동시에 지정할 수 없습니다. 파이프·파일 입력에는 줄 모드를 사용하세요.

| 입력 | payload 예 |
|---|---|
| 문자 | `a`, `A`, `한`, `🙂` |
| 방향키 | `up`, `down`, `left`, `right` |
| Enter / Tab / Backspace / Escape | `enter`, `tab`, `backspace`, `escape` |
| Ctrl+A / Alt+X / Shift+Up | `ctrl+a`, `alt+x`, `shift+up` |
| 기능키 | `f1`, `f2` 등 터미널이 전달하는 키 이름 |
| Ctrl+C | 전송하지 않고 로컬 종료 |

Node.js `readline.emitKeypressEvents`와 TTY raw mode를 사용하여 macOS·Linux·Windows 터미널에서 같은 처리 경로를 사용합니다. 정상 종료, Ctrl+C, SIGTERM, 연결 오류 때 raw mode를 원래 상태로 복원합니다.

이 모드는 운영체제 전역 키보드 후킹이 아니라 **현재 터미널의 입력 이벤트**를 전송합니다. 키를 떼는 이벤트는 없고, 길게 누르면 터미널의 반복 입력이 전송됩니다. Shift 단독, OS가 가로채는 단축키, 동일한 제어 바이트를 내는 조합은 구분되지 않을 수 있습니다. IME 문자는 조합 확정 후 전달되고, 붙여넣기는 여러 문자 이벤트가 될 수 있습니다. 수신 측에서는 `up`이라는 문자와 방향키 이름이 동일한 문자열임에 유의하세요.

## 대화형 명령

`iosignal-cli`와 동일하게 대화형 명령 앞에 점(`.`)을 붙이지 않습니다. 기존 `.help`, `.sub`, `.pub`는 오류로 처리하므로 `help`, `sub`, `pub`로 입력하세요. 셸을 실행하거나 `$변수`를 확장하지 않습니다. 작은따옴표·큰따옴표로 공백과 빈 인자를 표현할 수 있고, 따옴표 밖이나 큰따옴표 안에서 역슬래시로 공백·따옴표·역슬래시를 이스케이프할 수 있습니다.

```text
sub demo
pub demo "hello world" ""
call reply echo hello
input demo
```

`input demo`로 대화형 줄 입력에 진입하면 프롬프트가 `[demo]`로 바뀝니다. 이 상태에서 `.back`은 명령 모드로 복귀, `.quit`/`.exit`는 종료입니다. 실제 `.back` 문자열은 `..back`으로 보내며, 점 두 개로 시작하면 첫 점 하나를 제거합니다. 그 외 입력은 그대로 전송합니다. 키 모드는 별도 `remocon input <tag> --keys` 실행으로 선택합니다.

| 명령 | 동작 |
|---|---|
| `help` | 전체 명령 표시 |
| `sub` / `subscribe` / `listen` / `join <tags>` | 쉼표로 구분한 태그 구독; 공통 수신 출력 사용 |
| `unsub [tags]` | 지정 구독 또는 전체 구독 취소 |
| `pub` / `publish` / `sig` / `signal <tag> [args...]` | 전송 |
| `sig_bin <tag> <bytes>` | 0으로 채운 바이너리; 0~1048576, 서버 quota 별도 적용 |
| `call <service> <command> [args...]` | 서비스 호출 |
| `sudo <command> [args...]` | sudo 서비스 호출; 서버의 서비스 등록과 권한 필요 |
| `auth` / `login <id> <key>` | 다음 연결용 인증 설정 / 현재 서버 challenge로 로그인; `id.key`도 지원 |
| `id` / `ch` / `quota` | 연결 / 구독 / 제한 조회 |
| `ping` / `pong` / `pping <cid>` | 서버 ping·pong / 상대 CID ping |
| `echo [text]` / `iam [name]` | echo / 별명 조회·설정; 공백 포함 값은 따옴표 사용 |
| `encNo` / `encYes` / `encAuto` / `encMode` | 암호화 모드 변경 / 조회 |
| `hide` / `show` | 일반 및 CID 수신 출력 숨김 / 표시 |
| `close` / `open [url]` / `connect [url]` | 명시적으로 연결 닫기 / 열기 |
| `input <tag>` | 대화형 줄 입력 모드 진입 |
| `quit` / `exit` | 종료 |

명령은 대소문자를 구분합니다. 잘못된 대화형 명령은 오류를 표시하고 계속 입력받습니다. `close`는 자동 재접속하지 않으며 `open`으로 다시 연결하면 구독 목록을 복원합니다. `open`으로 WS와 TCP를 바꾸려면 프로그램을 다시 실행하세요.

네트워크·인증 오류, 연결 시간 초과, 연결 중단은 오류와 종료 코드 1을 반환합니다. 입력을 조용히 버리거나 나중에 재전송하지 않도록 자동 재접속은 사용하지 않습니다. Ctrl+C와 정상 EOF/종료 명령은 정상 종료하며 SIGTERM은 143입니다.

## 구조

- `lib/cli.js`: 셸 옵션·하위 명령
- `lib/commands.js`: 공통 명령 실행기
- `lib/runtime.js`: 단발·줄·키·대화형 모드와 종료 처리
- `lib/session.js`: 연결·인증·전송 확인
- `lib/input.js`: 대화형 인자 파서와 키 정규화


`npm test`는 로컬 WebSocket/TCP 서버로 전송·인증·서비스 호출·EOF·대화형 명령을 검사하고, Node.js keypress 디코더에 입력 시퀀스를 주어 즉시 전송과 터미널 복원을 확인합니다. 외부 공개 서버는 테스트에 사용하지 않습니다.

현재 작업에서는 macOS에서 자동 테스트와 실제 PTY의 키 즉시 전송·Ctrl+C·SIGTERM 후 터미널 복원을 검증했습니다. Windows·Linux 실기기 실행은 아직 검증하지 않았습니다.

## Node.js 설치 없이 사용하는 SEA 배포

독립 실행 파일을 다운로드하면 Node.js·npm 없이 사용할 수 있습니다. Windows x64/ARM64는 ZIP, macOS Intel/Apple Silicon과 Linux x64/ARM64는 tar.gz로 배포합니다. 라즈베리파이는 **64비트 OS용 Linux ARM64** 파일을 사용합니다.

[플랫폼별 다운로드·설치 안내](packaging/sea/INSTALL.md)에 파일 선택, SHA256 확인, 압축 해제, PATH 등록, 업데이트·삭제 방법을 정리했습니다. 각 압축 파일 안에도 `INSTALL.md`가 들어 있습니다. GitHub Release를 공개하기 전에는 다운로드 페이지에 파일이 나타나지 않습니다.

### 유지관리자의 빌드·검증

SEA 빌드 런타임은 `packaging/sea/node-version`에 **22.23.3**으로 고정했습니다. 해당 Node.js를 설치·선택한 환경에서 실행합니다. 일반 npm CLI 사용 조건과 별개의 빌드 조건입니다.

nvm을 사용하는 개발 환경에서는 먼저 `nvm install 22.23.3`과 `nvm use 22.23.3`을 실행합니다.

```sh
npm ci
npm test
npm run sea:dist
```

`sea:dist`는 `sea:build` → `sea:test` → `sea:package` 순서로 실행합니다.

- esbuild로 의존성을 CommonJS 번들로 묶고 Node.js SEA blob을 생성합니다.
- 동일한 Node.js 실행 파일에 postject로 blob을 삽입합니다. ws의 선택적 native addon 대신 JS 구현을 사용합니다.
- `remocon`과 `remote` 독립 실행 파일, 문서·라이선스·빌드 정보를 만듭니다.
- 임시 폴더로 복사하고 PATH에서 Node.js를 제거한 환경에서 도움말·버전 및 실제 WebSocket/TCP 통합 테스트를 실행합니다.
- 현재 OS·CPU용 압축 파일과 `.sha256` 파일을 `dist/`에 생성합니다. 빌드 중간 파일 `.sea/`와 `dist/`는 Git에 커밋하지 않습니다.

빌드는 현재 실행 중인 Node.js의 OS·CPU를 대상으로 합니다. Mac에서 명령 한 번으로 Windows 실행 파일까지 생성하는 방식이 아닙니다. 런타임에 포함된 Node.js를 업데이트하려면 `node-version`, 해당 버전의 공식 `LICENSE.node`, 문서의 버전을 함께 갱신하고 전체 대상을 다시 검증합니다.

### GitHub Actions와 릴리스

`.github/workflows/sea.yml`은 Windows x64/ARM64, macOS x64/ARM64, Linux x64/ARM64의 네이티브 러너에서 빌드·테스트합니다. Actions의 **SEA binaries → Run workflow**로 실행하면 플랫폼별 archive와 checksum을 artifact에서 받을 수 있습니다.

버전을 확정한 후 `package.json`과 잠금 파일의 버전을 맞추고 `v<버전>` 태그를 푸시하면, 6개 대상이 모두 성공했을 때 실행 파일이 첨부된 **draft release**를 만듭니다. 자동 공개는 하지 않습니다. 태그가 패키지 버전과 다르면 실패합니다. 기존 릴리스가 있으면 덮어쓰지 않으므로 재실행 시 기존 draft를 확인하세요.

기본 결과물은 Windows 게시자 미서명 / macOS ad-hoc 서명 상태입니다. 일반 사용자용 정식 배포에서 필요한 코드 서명·공증 및 그 이후 재패키징은 [설치 안내의 서명 설명](packaging/sea/INSTALL.md#서명과-배포-상태)을 참고하세요. 외부 서명 후에는 `npm run sea:test`와 `npm run sea:package`를 실행하며, `sea:build`는 서명 전 결과물을 다시 만들므로 실행하지 않습니다. 외부 서명을 적용했다면 `build-info.json`의 signing 정보도 갱신하세요.

이 구현의 로컬 검증 대상은 macOS ARM64입니다. 다른 플랫폼의 CI 실행 및 라즈베리파이 실기기 검증은 별도로 필요합니다. Windows에서는 Unix SIGTERM 정리 테스트를 제외하며, 실제 콘솔의 Ctrl+C 동작은 실기기 검증 대상입니다.

참고: [Node.js SEA 공식 문서](https://nodejs.org/docs/latest-v22.x/api/single-executable-applications.html)

## 대화형 로그 표시

대화형 프롬프트는 CID 대신 `›`를 사용합니다. 응답은 들여쓰고 수신 메시지,
연결 상태, 오류를 구분합니다. 시간은 기본적으로 숨기며 `--timestamps`로 표시합니다.
`NO_COLOR=1`로 색상을 끌 수 있습니다. 파이프 출력에는 장식이나 시간이 추가되지 않습니다.

`ping`은 서버에, `ping <cid>`는 상대 장치에 요청합니다. `pping <cid>`는 별칭입니다.
응답은 `pong` 또는 `pong (<cid>)`이며 3초 후 응답이 없으면 timeout을 표시합니다.
CLI는 수신한 peer ping에 자동 응답하며 `hide` 설정에도 응답합니다.
Node CLI는 기존 서버의 WebSocket 제어 PONG과 IOSignal PONG 패킷을 모두 처리합니다.
브라우저 CLI의 기본 ping에는 서버의 IOSignal PONG 패킷 응답이 필요합니다.
