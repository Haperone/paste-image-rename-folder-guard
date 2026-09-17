import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

await build({
  entryPoints: ['tests/subject.ts'],
  outfile: '.test-build/subject.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  alias: { obsidian: './tests/obsidian-mock.mjs' },
  logLevel: 'silent'
});
const result = spawnSync(process.execPath, ['--test', 'tests/guard.test.mjs'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
