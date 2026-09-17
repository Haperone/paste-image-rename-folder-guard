import { copyFile, mkdir, readFile, unlink } from 'node:fs/promises';

const { id, version } = JSON.parse(await readFile('manifest.json', 'utf8'));
const destination = `dist/${id}`;
await mkdir(destination, { recursive: true });
for (const file of ['main.js', 'manifest.json', 'styles.css', 'README.md', 'LICENSE']) {
  await copyFile(file, `${destination}/${file}`);
}
await mkdir(`${destination}/docs`, { recursive: true });
await copyFile('docs/README.ru.md', `${destination}/docs/README.ru.md`);
// Remove maintainer documents copied by earlier versions of this packager.
for (const file of ['DEVELOPMENT.md', 'RELEASING.md', 'TESTING.md', 'release-notes.md']) {
  try {
    await unlink(`${destination}/docs/${file}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
console.log(`Installable ${version} folder prepared at ${destination}`);
