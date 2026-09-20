export function normalizePath(value) {
  return value.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}

export class Notice {
  static messages = [];
  constructor(message) { Notice.messages.push(message); }
}

export class Plugin {
  cleanups = [];
  tabs = [];
  persisted = [];
  data = null;
  constructor(app) { this.app = app; }
  async loadData() { return this.data; }
  async saveData(data) { this.persisted.push(data); }
  register(cleanup) { this.cleanups.push(cleanup); }
  addSettingTab(tab) { this.tabs.push(tab); }
  unload() { this.onunload(); for (const cleanup of this.cleanups) cleanup(); }
}

export class PluginSettingTab {
  constructor(app, plugin) { this.app = app; this.plugin = plugin; }
}

export class App {}
export class Setting {}

export class Component {
  cleanups = [];
  children = [];
  loaded = false;
  onload() {}
  load() { if (!this.loaded) { this.loaded = true; this.onload(); this.children.forEach(child => child.load()); } }
  unload() {
    if (!this.loaded) return;
    this.loaded = false;
    this.children.forEach(child => child.unload());
    this.cleanups.splice(0).forEach(cleanup => cleanup());
  }
  register(cleanup) { this.cleanups.push(cleanup); }
  registerDomEvent(el, type, listener) {
    el.addEventListener(type, listener);
    this.register(() => el.removeEventListener(type, listener));
  }
  addChild(child) { this.children.push(child); if (this.loaded) child.load(); return child; }
  removeChild(child) { child.unload(); this.children = this.children.filter(item => item !== child); return child; }
}

export class AbstractInputSuggest {
  static instances = [];
  closed = false;
  constructor(app, input) { this.app = app; this.input = input; AbstractInputSuggest.instances.push(this); }
  close() { this.closed = true; }
}

export function setIcon(el, icon) { el.icon = icon; }
