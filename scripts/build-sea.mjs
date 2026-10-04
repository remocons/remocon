import { build } from 'esbuild'
import { inject } from 'postject'
import { builtinModules } from 'node:module'
import { mkdir, rm, readFile, writeFile, copyFile, chmod, readdir } from 'node:fs/promises'
import path from 'node:path'
import { root, stage, executable, pkg, nodeVersion, target, checkRuntime, run } from './sea-common.mjs'

checkRuntime()
const work = path.join(root, '.sea', target)
await rm(work, { recursive: true, force: true })
await rm(stage, { recursive: true, force: true })
await mkdir(work, { recursive: true })
await mkdir(stage, { recursive: true })
const bundle = path.join(work, 'main.cjs')
const result = await build({
  entryPoints: [path.join(root, 'packaging/sea/entry.js')],
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', target: 'node22',
  metafile: true, legalComments: 'inline',
  // ws has portable JS implementations; do not ship ABI-specific optional addons.
  define: { 'process.env.WS_NO_BUFFER_UTIL': '"1"', 'process.env.WS_NO_UTF_8_VALIDATE': '"1"' }
})
const builtins = new Set([...builtinModules, ...builtinModules.map(v => `node:${v}`)])
for (const output of Object.values(result.metafile.outputs)) {
  for (const dependency of output.imports) {
    if (dependency.external && !builtins.has(dependency.path)) throw new Error(`외부 파일 의존성이 남았습니다: ${dependency.path}`)
  }
}
await writeFile(path.join(work, 'metafile.json'), JSON.stringify(result.metafile, null, 2))
const config = path.join(work, 'sea-config.json')
const blob = path.join(work, 'sea.blob')
await writeFile(config, JSON.stringify({ main: bundle, output: blob, disableExperimentalSEAWarning: true, useSnapshot: false, useCodeCache: false }))
run(process.execPath, ['--experimental-sea-config', config])
const binary = executable('remocon')
await copyFile(process.execPath, binary)
await chmod(binary, 0o755)
if (process.platform === 'darwin') run('codesign', ['--remove-signature', binary])
await inject(binary, 'NODE_SEA_BLOB', await readFile(blob), {
  sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  ...(process.platform === 'darwin' ? { machoSegmentName: 'NODE_SEA' } : {})
})
if (process.platform === 'darwin') {
  run('codesign', ['--force', '--sign', '-', binary])
  run('codesign', ['--verify', '--strict', binary])
}
await copyFile(binary, executable('remote'))
await chmod(executable('remote'), 0o755)
await writeFile(path.join(stage, 'README.md'), (await readFile(path.join(root, 'README.md'), 'utf8')).replaceAll('packaging/sea/INSTALL.md', 'INSTALL.md'))
await copyFile(path.join(root, 'packaging/sea/INSTALL.md'), path.join(stage, 'INSTALL.md'))
await copyFile(path.join(root, 'packaging/sea/LICENSE.node'), path.join(stage, 'LICENSE.node'))
await copyFile(path.join(root, 'LICENSE'), path.join(stage, 'LICENSE'))

// Retain installed production package notices (also covers dependencies already
// inlined by upstream distributions), without optional native acceleration code.
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
const notices = []
for (const [location, info] of Object.entries(lock.packages)) {
  if (!location || info.dev || info.optional) continue
  const directory = path.join(root, location)
  const metadata = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'))
  notices.push(`\n=== ${metadata.name} ${metadata.version} (${metadata.license || 'see upstream'}) ===\n`)
  if (metadata.author) notices.push(`Author: ${typeof metadata.author === 'string' ? metadata.author : metadata.author.name}\n`)
  if (metadata.repository) notices.push(`Source: ${typeof metadata.repository === 'string' ? metadata.repository : metadata.repository.url}\n`)
  for (const filename of await readdir(directory)) {
    if (/^(licen[cs]e|copying|notice)(\.|$)/iu.test(filename)) notices.push(await readFile(path.join(directory, filename), 'utf8'))
  }
}
await writeFile(path.join(stage, 'THIRD_PARTY_NOTICES.txt'), notices.join('\n'))
await writeFile(path.join(stage, 'build-info.json'), JSON.stringify({
  version: pkg.version, node: nodeVersion, target,
  signing: process.platform === 'darwin' ? 'ad-hoc (not notarized)' : 'unsigned',
  builtAt: new Date().toISOString()
}, null, 2) + '\n')
console.log(`SEA build: ${stage}`)
