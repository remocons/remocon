import { createHash } from 'node:crypto'
import { readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { root, stage, name, checkRuntime, run } from './sea-common.mjs'

checkRuntime()
const windows = process.platform === 'win32'
const archive = path.join(root, 'dist', name + (windows ? '.zip' : '.tar.gz'))
await rm(archive, { force: true })
if (windows) {
  // Paths are data in environment variables, not PowerShell source strings.
  run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    'Compress-Archive -LiteralPath $env:REMOCON_STAGE -DestinationPath $env:REMOCON_ARCHIVE -CompressionLevel Optimal'],
    { env: { ...process.env, REMOCON_STAGE: stage, REMOCON_ARCHIVE: archive } })
} else {
  run('tar', ['-czf', archive, '-C', path.dirname(stage), name], { env: { ...process.env, COPYFILE_DISABLE: '1' } })
}
const hash = createHash('sha256').update(await readFile(archive)).digest('hex')
await writeFile(archive + '.sha256', `${hash}  ${path.basename(archive)}\n`)
console.log(`Package: ${archive}\nSHA256: ${hash}`)
