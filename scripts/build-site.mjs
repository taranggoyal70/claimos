import { cp, mkdir, readdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const output = new URL('public/', root);
await mkdir(output, { recursive: true });
for (const name of await readdir(new URL('prototype/', root))) {
  if (name.endsWith('.html')) await cp(new URL(`prototype/${name}`, root), new URL(name, output));
}
await cp(new URL('prototype/assets/', root), new URL('assets/', output), { recursive: true });
