import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFolders, isExcluded, readSettings, DEFAULT_SETTINGS,
  RenameGuard, findTarget, TARGET_PLUGIN_ID, FolderGuardPlugin, Notice
} from '../.test-build/subject.mjs';

test('legacy separators, Unicode, slashes and duplicate rules normalize', () => {
  assert.deepEqual(parseFolders(' Telegram/\nImported\\Images\r\n/Архив//Фото/;Telegram, Backup '), {
    folders: ['Telegram', 'Imported/Images', 'Архив/Фото', 'Backup'], invalid: []
  });
});

test('matching respects folder boundaries, vault root and case', () => {
  const rules = ['Telegram', 'Архив/Фото'];
  for (const file of ['Telegram/a.png', '/Telegram/sub/a.png', 'Telegram\\a.png', 'Архив/Фото/a.jpg']) assert(isExcluded(file, rules), file);
  for (const file of ['Telegram-old/a.png', 'Else/Telegram/a.png', 'telegram/a.png', 'Telegram', 'a.png']) assert(!isExcluded(file, rules), file);
});

test('empty and invalid rules cannot accidentally exclude the whole vault', () => {
  assert.deepEqual(parseFolders(' \n,;'), { folders: [], invalid: [] });
  assert.deepEqual(parseFolders('/;.;..;a/../b;C:\\Images;https://example.test/a').folders, []);
  assert.equal(parseFolders('/;.;..;a/../b;C:\\Images;https://example.test/a').invalid.length, 6);
  assert(!isExcluded('a.png', []));
});

test('settings migrate from the original helper without overwriting an empty list', () => {
  assert.deepEqual(readSettings({ excludedFolders: 'Telegram/;Imported/', unrelated: true }), { excludedFolders: 'Telegram/;Imported/' });
  assert.deepEqual(readSettings({ excludedFolders: '' }), { excludedFolders: '' });
  assert.deepEqual(readSettings(null), { excludedFolders: '' });
  for (const data of [null, undefined, [], 'text', 2, { excludedFolders: 4 }]) assert.deepEqual(readSettings(data), DEFAULT_SETTINGS);
  const settings = readSettings(null);
  settings.excludedFolders = 'Imported/';
  assert.equal(DEFAULT_SETTINGS.excludedFolders, '');
});

test('dependency discovery tolerates missing and malformed private API', () => {
  for (const app of [null, {}, { plugins: null }, { plugins: { plugins: 'bad' } }]) assert.equal(findTarget(app), undefined);
  const target = {};
  assert.equal(findTarget({ plugins: { plugins: { [TARGET_PLUGIN_ID]: target } } }), target);
});

test('folder lists preserve literal separators, reject malformed data and copy saved arrays', () => {
  const folders = ['Photos, originals', 'Archive;2026', 'Архив/Фото'];
  const settings = readSettings({ excludedFolders: folders });
  folders.push('Later');
  assert.deepEqual(settings.excludedFolders, ['Photos, originals', 'Archive;2026', 'Архив/Фото']);
  assert.deepEqual(parseFolders(settings.excludedFolders), { folders: settings.excludedFolders, invalid: [] });
  assert(isExcluded('Photos, originals/a.png', parseFolders(settings.excludedFolders).folders));
  assert(!isExcluded('Photos/a.png', parseFolders(settings.excludedFolders).folders));
  assert.deepEqual(readSettings({ excludedFolders: ['Valid', 1] }), DEFAULT_SETTINGS);
  assert.deepEqual(readSettings({ excludedFolders: [] }), { excludedFolders: [] });
});

test('protected attachments skip prompts and automatic renames', async () => {
  let calls = 0;
  const target = { startRenameProcess() { calls++; } };
  const guard = new RenameGuard(path => isExcluded(path, ['Telegram']));
  assert.equal(guard.connect(target), 'active');
  await target.startRenameProcess({ path: 'Telegram/a.png' }, false);
  await target.startRenameProcess({ path: 'Telegram/sub/a.png' }, true);
  assert.equal(calls, 0);
  target.startRenameProcess({ path: 'Telegram-old/a.png' }, true);
  assert.equal(calls, 1);
});

test('allowed calls preserve receiver, extra arguments and exact return value', () => {
  const result = Promise.resolve('renamed');
  let received;
  const target = { startRenameProcess(...args) { received = [this, args]; return result; } };
  const guard = new RenameGuard(() => false);
  guard.connect(target);
  const file = { path: 'Other/a.png' };
  assert.equal(target.startRenameProcess(file, false, 'future argument'), result);
  assert.deepEqual(received, [target, [file, false, 'future argument']]);
});

test('original exceptions and promise rejections remain observable', async () => {
  const error = new Error('rename failed');
  const sync = { startRenameProcess() { throw error; } };
  const asyncTarget = { startRenameProcess() { return Promise.reject(error); } };
  const guard = new RenameGuard(() => false);
  guard.connect(sync);
  assert.throws(() => sync.startRenameProcess({ path: 'a' }), error);
  guard.connect(asyncTarget);
  await assert.rejects(asyncTarget.startRenameProcess({ path: 'a' }), error);
});

test('non-file inputs pass through instead of being swallowed', () => {
  const target = { startRenameProcess(value) { return value; } };
  const guard = new RenameGuard(() => true);
  guard.connect(target);
  for (const input of [null, undefined, 2, {}, { path: 2 }]) assert.equal(target.startRenameProcess(input), input);
});

test('repeated connection is idempotent and own descriptors restore exactly', () => {
  const target = { startRenameProcess() {} };
  const descriptor = Object.getOwnPropertyDescriptor(target, 'startRenameProcess');
  const guard = new RenameGuard(() => true);
  guard.connect(target);
  const wrapped = target.startRenameProcess;
  for (let i = 0; i < 5; i++) assert.equal(guard.connect(target), 'active');
  assert.equal(target.startRenameProcess, wrapped);
  guard.disconnect();
  guard.disconnect();
  assert.deepEqual(Object.getOwnPropertyDescriptor(target, 'startRenameProcess'), descriptor);
});

test('prototype methods restore without leaving an own property', () => {
  class Target { startRenameProcess() {} }
  const target = new Target();
  const guard = new RenameGuard(() => true);
  guard.connect(target);
  guard.disconnect();
  assert(!Object.hasOwn(target, 'startRenameProcess'));
  assert.equal(target.startRenameProcess, Target.prototype.startRenameProcess);
});

test('reload restores the old instance and connects the new one', () => {
  const original = () => 'original';
  const first = { startRenameProcess: original };
  const second = { startRenameProcess: original };
  const guard = new RenameGuard(() => true);
  guard.connect(first);
  assert.equal(guard.connect(second), 'active');
  assert.equal(first.startRenameProcess, original);
  assert.notEqual(second.startRenameProcess, original);
  assert.equal(guard.connect(undefined), 'waiting');
  assert.equal(second.startRenameProcess, original);
});

test('missing, changed and frozen dependency interfaces fail safely', () => {
  const guard = new RenameGuard(() => true);
  assert.equal(guard.connect(undefined), 'waiting');
  for (const target of [{}, { startRenameProcess: 5 }, Object.freeze({ startRenameProcess() {} }), Object.preventExtensions(Object.create({ startRenameProcess() {} }))]) {
    assert.equal(guard.connect(target), 'incompatible');
  }
});

test('third-party wrappers survive unload and stop retaining an active guard', async () => {
  let calls = 0;
  const target = { startRenameProcess() { calls++; return 'ok'; } };
  const guard = new RenameGuard(() => true);
  guard.connect(target);
  const inner = target.startRenameProcess;
  const outer = function (...args) { return inner.apply(this, args); };
  target.startRenameProcess = outer;
  assert.equal(guard.connect(target), 'conflict');
  guard.disconnect();
  assert.equal(target.startRenameProcess, outer);
  assert.equal(await target.startRenameProcess({ path: 'Telegram/a.png' }), 'ok');
  assert.equal(calls, 1);
});

test('even a frozen surviving wrapper becomes inactive on unload', async () => {
  const target = { startRenameProcess() { return 'ok'; } };
  const guard = new RenameGuard(() => true);
  guard.connect(target);
  Object.freeze(target);
  guard.disconnect();
  assert.equal(await target.startRenameProcess({ path: 'Telegram/a.png' }), 'ok');
});

function fixture(target) {
  const callbacks = new Map();
  let ready;
  const app = {
    plugins: { plugins: target ? { [TARGET_PLUGIN_ID]: target } : {} },
    workspace: {
      containerEl: { win: { setInterval(fn) { callbacks.set(1, fn); return 1; }, clearInterval(id) { callbacks.delete(id); } } },
      onLayoutReady(fn) { ready = fn; }
    }
  };
  const plugin = new FolderGuardPlugin(app);
  return { app, plugin, callbacks, ready: () => ready?.() };
}

test('plugin lifecycle handles either load order, reload and timer cleanup', async () => {
  const { plugin, app, callbacks, ready } = fixture();
  await plugin.onload();
  assert.equal(plugin.status, 'waiting');
  const original = () => 'ok';
  const target = { startRenameProcess: original };
  app.plugins.plugins[TARGET_PLUGIN_ID] = target;
  callbacks.get(1)();
  assert.equal(plugin.status, 'active');
  assert.deepEqual(plugin.rules.folders, []);
  assert.equal(await target.startRenameProcess({ path: 'Telegram/a.png' }), 'ok');
  await plugin.updateFolders('Telegram/');
  assert.equal(await target.startRenameProcess({ path: 'Telegram/a.png' }), undefined);
  plugin.unload();
  assert.equal(callbacks.size, 0);
  assert.equal(target.startRenameProcess, original);
  ready();
  assert.equal(target.startRenameProcess, original);
});

test('unload while settings are loading cannot install a late hook or timer', async () => {
  const target = { startRenameProcess() {} };
  const original = target.startRenameProcess;
  const { plugin, callbacks } = fixture(target);
  let finish;
  plugin.loadData = () => new Promise(resolve => { finish = resolve; });
  const loading = plugin.onload();
  plugin.unload();
  finish(null);
  await loading;
  assert.equal(callbacks.size, 0);
  assert.equal(target.startRenameProcess, original);
  assert.equal(plugin.tabs.length, 0);
});

test('settings changes apply immediately and persistence is serialized', async () => {
  const target = { startRenameProcess() { return 'ok'; } };
  const { plugin } = fixture(target);
  await plugin.onload();
  let finish;
  const writes = [];
  plugin.saveData = data => { writes.push(data); return new Promise(resolve => { finish = resolve; }); };
  const first = plugin.updateFolders('Imported/');
  await Promise.resolve();
  const second = plugin.updateFolders('');
  assert.equal(await target.startRenameProcess({ path: 'Telegram/a.png' }), 'ok');
  assert.equal(writes.length, 1);
  finish();
  await first;
  await Promise.resolve();
  assert.equal(writes.length, 2);
  finish();
  await second;
  assert.deepEqual(writes, [{ excludedFolders: 'Imported/' }, { excludedFolders: '' }]);
  plugin.unload();
});

test('read and write failures are reported, and later saves still work', async () => {
  const { plugin } = fixture();
  const originalError = console.error;
  console.error = () => {};
  try {
    plugin.loadData = async () => { throw new Error('read denied'); };
    await plugin.onload();
    assert.deepEqual(plugin.settings, DEFAULT_SETTINGS);
    plugin.saveData = async () => { throw new Error('disk full'); };
    await plugin.updateFolders('Imported/');
    assert.deepEqual(plugin.rules.folders, ['Imported']);
    plugin.saveData = async data => { plugin.persisted.push(data); };
    await plugin.updateFolders('New/');
    assert.deepEqual(plugin.persisted, [{ excludedFolders: 'New/' }]);
    assert(Notice.messages.some(message => message.includes('could not load')));
    assert(Notice.messages.some(message => message.includes('could not be saved')));
  } finally { console.error = originalError; plugin.unload(); }
});

test('queued folder lists are snapshots, and empty selections survive a restart', async () => {
  const { plugin } = fixture();
  await plugin.onload();
  const folders = ['Photos, originals'];
  const saving = plugin.updateFolders(folders);
  folders.push('Unselected');
  plugin.settings.excludedFolders.push('Unselected in saved state');
  await saving;
  assert.deepEqual(plugin.persisted, [{ excludedFolders: ['Photos, originals'] }]);
  assert.deepEqual(plugin.rules.folders, ['Photos, originals']);
  await plugin.updateFolders([]);
  const { plugin: restarted } = fixture();
  restarted.data = plugin.persisted.at(-1);
  await restarted.onload();
  assert.deepEqual(restarted.rules.folders, []);
  plugin.unload();
  restarted.unload();
});
