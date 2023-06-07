import { readFile } from 'fs/promises';

const json = JSON.parse(
  await readFile(
    new URL('../package.json', import.meta.url)
  )
);

export let version = json.version