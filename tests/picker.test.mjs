import test from 'node:test';
import assert from 'node:assert/strict';
import { AbstractInputSuggest, FolderGuardPlugin, FolderPicker, parseFolders } from '../.test-build/subject.mjs';

// Only model the DOM operations the picker owns. Obsidian's popup/keyboard engine
// is not simulated; its real-device checks are recorded separately.
class Element extends EventTarget {
  children = [];
  classes = new Set();
  value = '';
  textContent = '';
  attrs = {};
  constructor(tag = 'div', parent) { super(); this.tag = tag; this.parent = parent; }
  createEl(tag, options = {}) {
    const el = new Element(tag, this);
    el.textContent = options.text ?? '';
    el.attrs = options.attr ?? {};
    el.addClass(...(options.cls?.split(' ') ?? []));
    this.children.push(el);
    return el;
  }
  createDiv(options) { return this.createEl('div', options); }
  createSpan(options) { return this.createEl('span', options); }
  addClass(...classes) { classes.forEach(value => this.classes.add(value)); }
  empty() { this.children = []; }
  setText(text) { this.textContent = text; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  focus() { this.focused = true; }
  click() { this.dispatchEvent(new Event('click')); }
  all(predicate) { return this.children.flatMap(child => [...(predicate(child) ? [child] : []), ...child.all(predicate)]); }
}

const makeSetting = () => { const settingEl = new Element(); return { settingEl, controlEl: settingEl.createDiv() }; };

function fixture(initial = '') {
  const setting = makeSetting();
  let rules = parseFolders(initial);
  const saved = [];
  const folders = ['Telegram', 'Telegram/Media', 'Imported', 'Photos, originals', 'Archive;2026'];
  const app = { vault: { getAllFolders(includeRoot) {
    assert.equal(includeRoot, false);
    return folders.map(path => ({ path }));
  } } };
  const picker = new FolderPicker(app, setting, () => rules, paths => {
    saved.push(paths);
    rules = parseFolders(paths);
  });
  picker.load();
  return {
    picker, setting, saved, folders, rules: () => rules,
    suggest: AbstractInputSuggest.instances.at(-1),
    input: setting.controlEl.all(el => el.tag === 'input')[0],
    add: setting.controlEl.all(el => el.textContent === 'Add folder')[0],
    chips: () => setting.controlEl.all(el => el.classes.has('pir-folder-guard-chip')),
    feedback: () => setting.controlEl.all(el => el.attrs.role === 'status')[0].textContent
  };
}

test('typing filters live vault folders and selecting creates a chip without duplicates', () => {
  const ui = fixture();
  assert.equal(ui.chips().length, 0);
  assert.equal(ui.feedback(), 'No folders excluded.');
  assert.deepEqual(ui.suggest.getSuggestions('TELE'), ['Telegram', 'Telegram/Media']);
  ui.input.value = 'tele';
  ui.suggest.selectSuggestion('Telegram');
  assert.deepEqual(ui.rules().folders, ['Telegram']);
  assert.equal(ui.input.value, '');
  assert.equal(ui.chips()[0].attrs['aria-label'], 'Remove exclusion: Telegram');
  assert.deepEqual(ui.suggest.getSuggestions('tele'), ['Telegram/Media']);
  ui.suggest.selectSuggestion('Telegram');
  assert.equal(ui.chips().length, 1);
  assert.equal(ui.saved.length, 1);
  ui.folders.push('New folder');
  assert.deepEqual(ui.suggest.getSuggestions('new'), ['New folder']);
  ui.picker.unload();
});

test('chips preserve legacy rules and removal immediately updates suggestions and saved selection', () => {
  const ui = fixture('Telegram/;Missing folder, Imported');
  assert.equal(ui.chips().length, 3);
  ui.chips()[0].click();
  assert.deepEqual(ui.rules().folders, ['Missing folder', 'Imported']);
  assert(ui.suggest.getSuggestions('').includes('Telegram'));
  ui.chips()[0].click();
  ui.chips()[0].click();
  assert.deepEqual(ui.saved.at(-1), []);
  assert.equal(ui.feedback(), 'No folders excluded.');
  assert.equal(ui.input.focused, true);
  ui.picker.unload();
});

test('manual entries support future folders and punctuation without accepting root or absolute paths', () => {
  const ui = fixture();
  for (const invalid of ['/', '../Pictures', 'C:\\Pictures', 'https://example.test']) {
    ui.input.value = invalid;
    ui.add.click();
    assert.match(ui.feedback(), /vault-relative/);
    assert.equal(ui.saved.length, 0);
  }
  for (const path of ['Not created/Images', 'Photos, originals', 'Archive;2026']) {
    ui.input.value = path;
    ui.add.click();
  }
  assert.deepEqual(ui.rules().folders, ['Not created/Images', 'Photos, originals', 'Archive;2026']);
  assert.equal(ui.chips().length, 3);
  ui.picker.unload();
});

test('rerendered chips and a closed picker release their click listeners and popup', () => {
  const ui = fixture('Telegram');
  const removedChip = ui.chips()[0];
  ui.suggest.selectSuggestion('Imported');
  removedChip.click();
  assert.deepEqual(ui.rules().folders, ['Telegram', 'Imported']);
  const currentChip = ui.chips()[0];
  const count = ui.saved.length;
  ui.suggest.closed = false;
  ui.picker.unload();
  assert.equal(ui.suggest.closed, true);
  assert.equal(ui.setting.controlEl.children.length, 0);
  currentChip.click();
  ui.input.value = 'New';
  ui.add.click();
  assert.equal(ui.saved.length, count);
});

test('settings search rerenders, tab hiding and plugin unloading dispose the right picker', async () => {
  const app = {
    vault: { getAllFolders: () => [] },
    workspace: { containerEl: { win: { setInterval: () => 1, clearInterval() {} } }, onLayoutReady() {} }
  };
  const plugin = new FolderGuardPlugin(app);
  await plugin.onload();
  const tab = plugin.tabs[0];
  const first = makeSetting();
  const releaseFirst = tab.getSettingDefinitions()[0].render(first);
  const second = makeSetting();
  tab.getSettingDefinitions()[0].render(second);
  assert.equal(first.controlEl.children.length, 0);
  releaseFirst();
  assert.equal(second.controlEl.children.length, 1);
  tab.hide();
  assert.equal(second.controlEl.children.length, 0);
  const third = makeSetting();
  tab.getSettingDefinitions()[0].render(third);
  plugin.unload();
  assert.equal(third.controlEl.children.length, 0);
});
