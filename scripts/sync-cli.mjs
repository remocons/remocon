// Copies the files remocon shares with iosignal-cli from ../iosignal-cli/lib, which is their source.
// Run it after changing them in iosignal-cli: npm run sync:cli. test/shared.test.js fails while they differ.
import { copyFileSync, existsSync, readFileSync } from 'node:fs'

export const SHARED = ['peer-ping.js', 'ping-line.js', 'log.js']
const source = new URL('../../iosignal-cli/lib/', import.meta.url)
const target = new URL('../lib/', import.meta.url)

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(source)) throw new Error('../iosignal-cli is not next to this repository.')
  for (const name of SHARED) {
    const from = new URL(name, source), to = new URL(name, target)
    const same = existsSync(to) && readFileSync(from).equals(readFileSync(to))
    if (!same) copyFileSync(from, to)
    console.log(`${same ? 'same   ' : 'copied '} lib/${name}`)
  }
}
