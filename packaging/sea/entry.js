import path from 'node:path'
import { main } from '../../lib/cli.js'

// Both command names share the embedded program. Each archive contains real
// copies named remocon and remote, so neither needs Node.js nor a shell wrapper.
const legacy = /^remote(?:\.exe)?$/iu.test(path.basename(process.execPath))
main(process.argv, legacy).catch(error => {
  console.error(error.message || String(error))
  process.exitCode = 1
})
