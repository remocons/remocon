import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { SHARED } from '../scripts/sync-cli.mjs'

// iosignal-cli/lib is the source of these files; npm run sync:cli copies them here.
const source = new URL('../../iosignal-cli/lib/', import.meta.url)

test('files shared with iosignal-cli are the same as its copy', { skip: !existsSync(source) && 'iosignal-cli is not next to this repository' }, () => {
  for (const name of SHARED) {
    assert.ok(readFileSync(new URL(`../lib/${name}`, import.meta.url)).equals(readFileSync(new URL(name, source))), `lib/${name} differs from iosignal-cli: run npm run sync:cli`)
  }
})
