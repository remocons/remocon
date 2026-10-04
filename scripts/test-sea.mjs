import { mkdtemp, cp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { root, stage, extension, pkg, checkRuntime, run } from './sea-common.mjs'

checkRuntime()
// Copy out of the checkout: neither source, node_modules nor a node on PATH
// may be required by the downloadable executable.
const temporary = await mkdtemp(path.join(tmpdir(), 'remocon-sea-'))
try {
  await cp(stage, temporary, { recursive: true })
  const env = { ...process.env, PATH: '', NODE_PATH: '', NODE_OPTIONS: '' }
  for (const command of ['remocon', 'remote']) {
    const binary = path.join(temporary, command + extension)
    const version = run(binary, ['--version'], { cwd: temporary, env, stdio: 'pipe', encoding: 'utf8' })
    assert.equal(version.stdout.trim(), pkg.version)
    const help = run(binary, ['--help'], { cwd: temporary, env, stdio: 'pipe', encoding: 'utf8' })
    assert.match(help.stdout, new RegExp(`Usage: ${command} `))
  }
  run(process.execPath, ['--test', '--test-timeout=20000', 'test/integration.test.js'], {
    env: { ...process.env, REMOCON_TEST_BIN_DIR: temporary }
  })
  console.log('SEA checks passed: isolated executable, no Node.js on PATH, real WS/TCP integration.')
} finally {
  await rm(temporary, { recursive: true, force: true })
}
