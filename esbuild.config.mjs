import { context } from 'esbuild';

const watch = process.argv.includes('--watch');
const build = await context({
  entryPoints: ['src/main.ts'],
  outfile: 'main.js',
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2018',
  external: ['obsidian'],
  sourcemap: watch ? 'inline' : false,
  minify: false,
  treeShaking: true,
  logLevel: 'info',
  banner: { js: '/* Paste Image Rename Folder Guard | MIT license | Built from src/main.ts */' }
});
if (watch) {
  await build.watch();
} else {
  await build.rebuild();
  await build.dispose();
}
