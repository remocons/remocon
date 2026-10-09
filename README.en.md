# remocon

[한국어](README.md) | [English](README.en.md)

The remocon package and its IOSignal dependency use version **7.2.0**. The CLI includes server and peer ping handling and improved interactive logs.

Connect to an IOSignal server to run one-shot commands, line input, key input, or interactive commands. Requires Node.js 22.16.0 or later.

## Installation and usage

Install the version published on npm globally:

```sh
npm install -g remocon
```

To install the current repository implementation globally, run this in the repository directory:

```sh
npm install -g .
```

To run directly from the repository or develop and test:

```sh
npm ci
node bin/remocon.js --help
node bin/remocon.js -c ws://localhost:7777 pub demo hello
npm test
```

After global installation, the `remocon` and `remote` commands are available.

```sh
remocon                           # Interactive commands
remocon console                   # Explicit interactive mode
remocon pub demo "hello world"     # Send once and exit
remocon input demo --lines        # Send each line on Enter (default)
remocon input demo --keys         # Send each key without waiting for Enter
```

The default server address remains `wss://io.remocon.kr/ws`. Place common options **before** the subcommand. A server must already be running.

```sh
remocon -c ws://localhost:7777 pub demo hello
remocon -c cong://localhost:8888 input demo --keys
remocon -c ws://localhost:7777 -i uno -k uno-key console
```

| Common option | Description |
| --- | --- |
| `-c, --connect <url>` | WebSocket (`ws://`, `wss://`) or TCP (`cong://`); bare host:port uses WebSocket |
| `-i, --id <id>` / `-k, --key <key>` | Authentication ID and key; supply both |
| `-a, --auth-idKey <id.key>` | Short credential form; a complete `-i`/`-k` pair takes priority |
| `-j, --join-channel <tags>` | Subscribe on startup; comma-separated tags |
| `-t, --timeout <ms>` | Timeout for connection, send confirmation, and service responses; default 10000 ms |
| `-h, --help` / `-V, --version` | Help / version |

Command-line keys may appear in shell history or process listings. The program does not print authentication keys supplied through startup options.

## One-shot commands

```sh
remocon pub demo hello world
remocon signal demo "hello world" ""
remocon call reply echo hello
remote demo hello
```

`pub`, `publish`, `sig`, and `signal` perform the same send operation. Unquoted `hello world` produces two payload arguments; quoting it produces one string. Empty strings and signals without a payload are supported. Arguments after the `pub` tag are passed as payload even if they begin with `--foo`.

`call` waits for a response from a service registered on the server. The `reply` example requires the server's `reply` service. `remote <tag> [payload...]` preserves the original one-shot syntax and uses the same implementation. For `remote`, place arguments starting with a dash after `--`.

The client sends after the connection becomes `ready`. Before exiting, it waits for a short, unique echo to confirm that the server received preceding frames, rather than terminating after a fixed 100 ms. This confirmation is **not an acknowledgment that the receiving device has received or executed the command**. Use a separate response protocol if device processing must be confirmed.

## Continuous line input

```sh
remocon input demo
remocon input demo --lines
```

Pressing Enter sends the entire line as **one string payload**. Leading and trailing spaces, empty lines, and quotes are preserved; line separators are excluded. Strings such as `.quit` are sent unchanged. Stop with `Ctrl+C`. Piped input exits after EOF and send confirmation. A final line without a newline is also sent.

```sh
# macOS/Linux
printf 'first line\nsecond line\n' | remocon input demo
```

```powershell
# Windows PowerShell
"first line", "second line" | remocon input demo
```

## Continuous key input

```sh
remocon input demo --keys
```

In a TTY terminal, each key sends **one string payload** immediately. `--lines` and `--keys` cannot be combined. Use line mode for pipes and files.

| Input | Example payload |
| --- | --- |
| Character | `a`, `A`, `한`, `🙂` |
| Arrow key | `up`, `down`, `left`, `right` |
| Enter / Tab / Backspace / Escape | `enter`, `tab`, `backspace`, `escape` |
| Ctrl+A / Alt+X / Shift+Up | `ctrl+a`, `alt+x`, `shift+up` |
| Function key | `f1`, `f2`, or the key name reported by the terminal |
| Ctrl+C | Exit locally without sending |

Node.js `readline.emitKeypressEvents` and TTY raw mode provide the same processing path on macOS, Linux, and Windows terminals. Raw mode is restored on normal exit, Ctrl+C, SIGTERM, or connection errors.

This mode sends **input events from the current terminal**, rather than installing a system-wide keyboard hook. There are no key-release events; holding a key sends the terminal's repeated input. Shift alone, shortcuts intercepted by the OS, and combinations producing identical control bytes may be indistinguishable. IME characters arrive after composition is committed, and pasted text may become multiple character events. Receivers should note that literal text `up` and the arrow-key name use the same string.

## Interactive commands

As in `iosignal-cli`, command names have no leading dot (`.`). The old `.help`, `.sub`, and `.pub` forms are rejected; use `help`, `sub`, and `pub`. No shell is executed and `$variables` are not expanded. Single or double quotes support spaces and empty arguments. Outside quotes or inside double quotes, a backslash can escape spaces, quotes, and backslashes.

```text
sub demo
pub demo "hello world" ""
call reply echo hello
input demo
```

`input demo` enters interactive line mode and changes the prompt to `[demo]`. In this mode, `.back` returns to command mode and `.quit`/`.exit` exits. Send the literal `.back` with `..back`; when input starts with two dots, the first is removed. Other input is sent unchanged. Select key mode by running `remocon input <tag> --keys` separately.

| Command | Action |
| --- | --- |
| `help` | Show all commands |
| `sub` / `subscribe` / `listen` / `join <tags>` | Subscribe to comma-separated tags; use shared receive output |
| `unsub [tags]` | Cancel selected subscriptions, or all subscriptions |
| `pub` / `publish` / `sig` / `signal <tag> [args...]` | Send |
| `sig_bin <tag> <bytes>` | Send zero-filled binary data, 0–1048576 bytes; server quotas also apply |
| `call <service> <command> [args...]` | Call a service |
| `sudo <command> [args...]` | Call the sudo service; server registration and permission required |
| `auth` / `login <id> <key>` | Set credentials for the next connection / log in using the current server challenge; `id.key` is also supported |
| `id` / `ch` / `quota` | Show connection / subscriptions / limits |
| `ping` / `pong` / `pping <cid>` | Server ping/pong / peer CID ping |
| `echo [text]` / `iam [name]` | Echo / query or set a nickname; quote values containing spaces |
| `encNo` / `encYes` / `encAuto` / `encMode` | Change / inspect encryption mode |
| `hide` / `show` | Hide / show channel and direct-message output |
| `close` / `open [url]` / `connect [url]` | Explicitly close / open the connection |
| `input <tag>` | Enter interactive line mode |
| `quit` / `exit` | Exit |

Commands are case-sensitive. Invalid interactive commands report an error and continue accepting input. `close` does not automatically reconnect; `open` reconnects and restores subscriptions. Restart the program to switch between WS and TCP.

Network or authentication errors, connection timeouts, and interrupted connections report an error and exit with code 1. Automatic reconnection is disabled to avoid silently dropping or replaying input. Ctrl+C, normal EOF, and exit commands end normally; SIGTERM exits with code 143.

## Structure

- `lib/cli.js`: shell options and subcommands
- `lib/commands.js`: shared command executor
- `lib/runtime.js`: one-shot, line, key, and interactive modes; shutdown handling
- `lib/session.js`: connection, authentication, and send confirmation
- `lib/input.js`: interactive argument parser and key normalization

`npm test` uses local WebSocket/TCP servers to check sending, authentication, service calls, EOF, and interactive commands. Input sequences fed to the Node.js keypress decoder verify immediate sending and terminal restoration. Tests do not use external public servers.

Automated tests and real PTY checks have verified immediate key sending and terminal restoration after Ctrl+C and SIGTERM on macOS. Execution on physical Windows and Linux systems has not yet been verified.

## Interactive logs

The interactive prompt uses `›` instead of the CID. Responses are indented, and received messages, connection status, and errors are distinguished. Timestamps are hidden by default; enable them with `--timestamps`.
Set `NO_COLOR=1` to disable colors. Piped output has no decorations or timestamps.

`ping` requests a server response; `ping <cid>` requests a peer response. `pping <cid>` is an alias.
Replies print `pong` or `pong (<cid>)`; unanswered requests time out after 3 seconds.
The CLI automatically responds to peer ping, including when `hide` is enabled.
The Node CLI handles both legacy WebSocket control PONG frames and IOSignal PONG packets.
The browser CLI's default ping requires an IOSignal PONG packet from the server.
