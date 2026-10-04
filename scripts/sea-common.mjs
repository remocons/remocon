import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

export const root = fileURLToPath(new URL('../', import.meta.url))
export const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
export const nodeVersion = (await readFile(path.join(root, 'packaging/sea/node-version'), 'utf8')).trim()
export const platform = { win32: 'windows', darwin: 'macos', linux: 'linux' }[process.platform]
export const target = `${platform}-${process.arch}`
export const name = `remocon-v${pkg.version}-${target}`
export const stage = path.join(root, 'dist', name)
export const extension = process.platform === 'win32' ? '.exe' : ''
export const executable = command => path.join(stage, command + extension)
export function checkRuntime() {
  if (process.versions.node !== nodeVersion) throw new Error(`SEA 빌드는 Node.js ${nodeVersion}이 필요합니다. 현재: ${process.versions.node}`)
  if (!platform || !['x64', 'arm64'].includes(process.arch)) throw new Error(`지원하지 않는 SEA 대상: ${process.platform}-${process.arch}`)
}
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} failed (${result.signal || result.status})`)
  return result
}
