# Node.js 없이 remocon 설치하기

SEA 배포 파일에는 Node.js 런타임과 remocon 코드가 포함됩니다. 사용자 컴퓨터에 Node.js·npm을 설치하지 않아도 됩니다. 이 배포는 터미널용 CLI이며 GUI 앱이나 MSI/PKG 설치 프로그램은 아닙니다.

## 다운로드할 파일

[remocon Releases](https://github.com/remocons/remocon/releases)에서 공개된 버전의 파일과 같은 이름의 `.sha256` 파일을 다운로드합니다. 아래 `<버전>`은 릴리스 번호로 바꾸세요. 아직 릴리스를 공개하지 않았다면 다운로드 파일은 표시되지 않습니다. 개발용 결과는 GitHub Actions의 `SEA binaries` 실행에 첨부되는 artifact에서 받을 수 있습니다.

| 사용자 환경 | 다운로드 파일 |
|---|---|
| Windows Intel/AMD 64비트 | `remocon-v<버전>-windows-x64.zip` |
| Windows ARM64 | `remocon-v<버전>-windows-arm64.zip` |
| macOS Intel | `remocon-v<버전>-macos-x64.tar.gz` |
| macOS Apple Silicon | `remocon-v<버전>-macos-arm64.tar.gz` |
| Linux Intel/AMD 64비트 | `remocon-v<버전>-linux-x64.tar.gz` |
| Linux ARM64 / Raspberry Pi OS 64비트 | `remocon-v<버전>-linux-arm64.tar.gz` |

초기 지원 기준은 Windows 10/11(ARM64는 Windows 11), macOS 13.5 이상, Linux kernel 4.18 이상·glibc 2.28 이상입니다. 라즈베리파이는 Raspberry Pi OS Bookworm 64비트 이상을 권장 대상으로 합니다. 최소 환경에서의 실기기 검증과 CI 검증은 별개입니다. 32비트 OS, ARMv6/ARMv7, Alpine/musl은 이번 배포 대상에 포함하지 않습니다.

운영체제/CPU 확인은 Windows의 설정 → 시스템 → 정보, macOS의 이 Mac에 관하여를 사용하세요. Linux는 `uname -m`의 `x86_64`/`aarch64`와 `getconf LONG_BIT`의 `64`를 함께 확인합니다. 64비트 CPU에 32비트 OS를 설치했다면 ARM64 파일을 실행할 수 없습니다.

압축 안에는 `remocon`, `remote`(Windows는 `.exe`), 사용 설명, 라이선스, `build-info.json`이 들어 있습니다. `remote`는 `remote <tag> [payload...]` 호환 명령입니다. 두 실행 파일은 각각 독립 실행 파일이므로 소스·node_modules가 필요하지 않습니다.

## Windows

1. 맞는 ZIP과 `.sha256` 파일을 같은 폴더에 다운로드합니다.
2. PowerShell에서 해시를 확인합니다. 파일 이름은 실제 버전과 CPU로 바꾸세요.

```powershell
$Archive = "remocon-v<버전>-windows-x64.zip"
$Expected = ((Get-Content "$Archive.sha256" -Raw).Trim() -split '\s+')[0]
$Actual = (Get-FileHash $Archive -Algorithm SHA256).Hash
if ($Actual -ne $Expected) { throw "SHA256 불일치" }
Expand-Archive -LiteralPath $Archive -DestinationPath .
```

압축을 푼 폴더에서 바로 실행할 수 있습니다.

```powershell
.\remocon.exe --help
.\remocon.exe -c ws://localhost:7777 input demo --keys
```

항상 `remocon`이라는 명령으로 사용하려면, 압축을 푼 폴더에서 다음을 실행합니다. 관리자 권한은 필요하지 않습니다.

```powershell
$InstallDir = Join-Path $env:LOCALAPPDATA "Programs\remocon"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item .\* -Destination $InstallDir -Recurse -Force
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$Parts = @($UserPath -split ';' | Where-Object { $_ })
if ($Parts -notcontains $InstallDir) {
  [Environment]::SetEnvironmentVariable("Path", (($Parts + $InstallDir) -join ';'), "User")
}
$env:Path = "$InstallDir;$env:Path"
remocon --version
```

새 터미널에서도 명령이 인식됩니다. 일반적인 키 입력 중 Ctrl+C는 프로그램을 종료합니다. Windows의 외부 `taskkill`/강제 종료는 프로그램의 정리 핸들러를 실행시키는 종료 방식이 아닙니다.

## macOS / Linux / Raspberry Pi

다운로드한 디렉터리에서 파일 이름을 실제 버전과 CPU에 맞춰 지정합니다.

```sh
archive='remocon-v<버전>-linux-arm64.tar.gz'
# macOS는 macos-arm64 또는 macos-x64 파일을 사용합니다.
```

Linux / Raspberry Pi:

```sh
sha256sum -c "$archive.sha256"
```

macOS:

```sh
shasum -a 256 -c "$archive.sha256"
```

해시가 일치하면 압축을 풀고, 생성된 폴더로 이동합니다.

```sh
tar -xzf "$archive"
cd "${archive%.tar.gz}"
./remocon --help
./remocon -c ws://localhost:7777 input demo --keys
```

명령을 사용자 경로에 설치하려면:

```sh
mkdir -p "$HOME/.local/bin" "$HOME/.local/share/remocon"
install -m 755 remocon remote "$HOME/.local/bin/"
cp README.md INSTALL.md LICENSE LICENSE.node THIRD_PARTY_NOTICES.txt build-info.json "$HOME/.local/share/remocon/"
export PATH="$HOME/.local/bin:$PATH"
remocon --version
```

PATH 설정을 유지하려면 `export PATH="$HOME/.local/bin:$PATH"` 한 줄을 사용하는 셸의 설정 파일에 추가합니다. macOS 기본 zsh는 `~/.zshrc`, 일반적인 bash 터미널은 `~/.bashrc`입니다. 압축을 직접 풀 때 실행 권한이 사라졌다면 실행 파일에 `chmod +x remocon remote`를 적용합니다.

SSH에서도 사용할 수 있으며 키 모드에는 TTY가 필요합니다. 원격 명령으로 실행할 때는 예를 들어 `ssh -t pi@호스트 'remocon input demo --keys'`처럼 TTY를 할당합니다. 백그라운드 서비스에는 단발 명령이나 줄 입력 파이프를 사용하세요.

## 서명과 배포 상태

기본 빌드는 Windows에서 게시자 코드 서명이 없고, macOS에서는 실행에 필요한 ad-hoc 서명만 합니다. Apple Developer ID 서명·공증이 완료된 앱은 아닙니다. 인터넷에서 다운로드한 파일은 SmartScreen/Gatekeeper 경고가 발생할 수 있습니다. SHA256 비교는 파일 무결성 확인이며 게시자 신원 서명을 대체하지 않습니다.

경고 없는 일반 사용자용 배포는 유지관리자가 Windows 코드 서명 및 macOS Developer ID 서명·공증을 완료한 뒤 압축 파일과 해시를 다시 생성해야 합니다. 사용자는 자신이 신뢰하는 릴리스인지 확인하고 운영체제의 앱 허용 절차를 사용하세요.

## 사용·업데이트·삭제

```sh
remocon pub demo hello
remocon input demo --lines
remocon input demo --keys
remocon console
remote demo hello
```

서버 기본 주소는 `wss://io.remocon.kr/ws`이며 `-c <주소>`로 변경합니다. GUI가 없으므로 터미널에서 실행하세요. SEA에 포함된 Node.js는 사용자의 Node.js와 별개로 업데이트되므로 새 remocon 배포 파일로 교체해야 합니다.

업데이트는 실행 중인 remocon을 종료하고 새 버전 파일을 같은 설치 경로에 복사합니다. 제거는 복사한 실행 파일·문서와 추가했던 PATH 항목만 삭제합니다. npm 버전도 설치되어 있다면 Windows에서 `Get-Command remocon -All`, macOS/Linux에서 `type -a remocon`으로 어떤 파일이 실행되는지 확인하세요.
