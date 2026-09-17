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
