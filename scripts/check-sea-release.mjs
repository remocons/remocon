import { target, pkg, checkRuntime } from './sea-common.mjs'
checkRuntime()
if (process.env.EXPECTED_TARGET && process.env.EXPECTED_TARGET !== target) {
  throw new Error(`Runner target mismatch: expected ${process.env.EXPECTED_TARGET}, got ${target}`)
}
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${pkg.version}`) {
  throw new Error(`Tag must match package.json: v${pkg.version}`)
}
