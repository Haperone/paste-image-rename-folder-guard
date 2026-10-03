import { App, Notice, Plugin, PluginSettingTab, setIcon, Setting } from 'obsidian';
import { isExcluded, parseFolders, type FolderRules } from './folders';
import { FolderPicker } from './folder-picker';
import { findTarget, RenameGuard, type GuardStatus } from './integration';
import { DEFAULT_SETTINGS, readSettings, type GuardSettings } from './settings';

const STATUS_TEXT: Record<GuardStatus, string> = {
  waiting: 'Waiting for Paste image rename. Install and enable it separately; then the guard connects automatically.',
  active: 'Connected to Paste image rename. Excluded folders are protected from its automatic rename prompts and renaming.',
  incompatible: 'This version of Paste image rename cannot be connected. Folder exclusions are not active.',
  conflict: 'Another extension changed the rename handler. Protection cannot be confirmed. Disable the conflicting extension, then reload this guard.'
};

export default class FolderGuardPlugin extends Plugin {
  override settings: GuardSettings = { ...DEFAULT_SETTINGS };
  rules: FolderRules = parseFolders(this.settings.excludedFolders);
  status: GuardStatus = 'waiting';
  onStatusChange: (() => void) | null = null;
  private stopped = false;
  private guard = new RenameGuard(path => isExcluded(path, this.rules.folders));
  private saveQueue: Promise<void> = Promise.resolve();

  override async onload(): Promise<void> {
    this.stopped = false;
    try {
      const data: unknown = await this.loadData();
      this.settings = readSettings(data);
    } catch (error) {
      console.error('Folder guard: could not load settings.', error);
      new Notice('Folder guard could not load saved settings. No folders are excluded; review your settings.');
    }
    // Loading data may finish after the user has disabled the plugin.
    if (this.stopped) return;
    this.rules = parseFolders(this.settings.excludedFolders);
    const settingsTab = new FolderGuardSettingTab(this.app, this);
    this.addSettingTab(settingsTab);
    this.register(() => settingsTab.hide());
    this.refresh();
    this.app.workspace.onLayoutReady(() => { if (!this.stopped) this.refresh(); });
    // There is no public plugin-enabled event. Poll only a single registry entry.
    // Own the timer on the main workspace window, so closing a popout cannot stop it.
    const timerWindow = this.app.workspace.containerEl.win;
    const timer = timerWindow.setInterval(() => this.refresh(), 1000);
    this.register(() => timerWindow.clearInterval(timer));
  }

  refresh(): void {
    if (this.stopped) return;
    this.status = this.guard.connect(findTarget(this.app));
    this.onStatusChange?.();
  }

  async updateFolders(value: string | string[]): Promise<void> {
    this.settings = readSettings({ excludedFolders: value });
    this.rules = parseFolders(value);
    const snapshot = readSettings(this.settings);
    // Rapid additions/removals can overlap; save snapshots in the order of edits.
    this.saveQueue = this.saveQueue.then(async () => {
      try {
        await this.saveData(snapshot);
      } catch (error) {
        console.error('Folder guard: could not save settings.', error);
        new Notice('Folder exclusions are active for this session, but could not be saved. Check vault storage and try again.');
      }
    });
    await this.saveQueue;
  }

  override onunload(): void {
    this.stopped = true;
    this.onStatusChange = null;
    this.guard.disconnect();
  }
}

class FolderGuardSettingTab extends PluginSettingTab {
  private folderPicker: FolderPicker | null = null;

  constructor(app: App, private readonly guardPlugin: FolderGuardPlugin) {
    super(app, guardPlugin);
  }

  // These definitions add native settings search on 1.13+. The render callbacks
  // use the older public Setting API, also used by display() on earlier versions.
  override getSettingDefinitions() {
    return [
      { name: 'Support links', searchable: false, render: (setting: Setting) => this.renderSupportLinks(setting) },
      {
        name: 'Excluded folders',
        desc: 'Choose folders where Paste image rename must skip automatic renaming and rename prompts. Subfolders are included. Click or tap a chip to remove an exclusion.',
        render: (setting: Setting) => this.renderFolders(setting)
      },
      { name: 'Connection status', render: (setting: Setting) => this.renderStatus(setting) },
      {
        name: 'Scope',
        desc: 'Exclusions use the attachment folder, not the note folder. Existing files and manual batch rename commands are unchanged. After enabling or reloading the dependency, allow up to one second for the connection.'
      }
    ];
  }

  private renderSupportLinks(setting: Setting): void {
    setting.settingEl.empty();
    setting.settingEl.addClass('pir-folder-guard-support-setting');
    const links = setting.settingEl.createDiv({
      cls: 'pir-folder-guard-support-links', attr: { role: 'group', 'aria-label': 'Support links' }
    });
    const addLink = (href: string, icon: string, label: string, variant: string) => {
      const link = links.createEl('a', {
        cls: `pir-folder-guard-support-link ${variant}`,
        href,
        attr: { target: '_blank', rel: 'noopener noreferrer' }
      });
      setIcon(link.createSpan({ attr: { 'aria-hidden': 'true' } }), icon);
      link.createSpan({ text: label });
    };
    addLink('https://buymeacoffee.com/haperone', 'coffee', 'Buy me a coffee', 'pir-folder-guard-support-link--coffee');
    addLink('https://ko-fi.com/haperone', 'heart', 'Ko-fi', 'pir-folder-guard-support-link--kofi');
    addLink('https://t.me/supp_fold_guard_bot', 'send', 'Support', 'pir-folder-guard-support-link--telegram');
  }

  // Compatibility fallback: Obsidian 1.13+ renders the definitions instead.
  override display(): void {
    this.hide();
    this.containerEl.empty();
    for (const definition of this.getSettingDefinitions()) {
      const setting = new Setting(this.containerEl).setName(definition.name);
      if (definition.desc) setting.setDesc(definition.desc);
      definition.render?.(setting);
    }
  }

  private renderFolders(setting: Setting): () => void {
    this.folderPicker?.unload();
    const picker = new FolderPicker(this.app, setting,
      () => this.guardPlugin.rules,
      paths => { void this.guardPlugin.updateFolders(paths); });
    this.folderPicker = picker;
    picker.load();
    return () => {
      picker.unload();
      if (this.folderPicker === picker) this.folderPicker = null;
    };
  }

  private renderStatus(status: Setting): () => void {
    status.descEl.setAttribute('role', 'status');
    let previous = '';
    const updateStatus = () => {
      const message = STATUS_TEXT[this.guardPlugin.status];
      if (message !== previous) { status.setDesc(message); previous = message; }
    };
    this.guardPlugin.onStatusChange = updateStatus;
    this.guardPlugin.refresh();
    return () => {
      if (this.guardPlugin.onStatusChange === updateStatus) this.guardPlugin.onStatusChange = null;
    };
  }

  override hide(): void {
    this.folderPicker?.unload();
    this.folderPicker = null;
    this.guardPlugin.onStatusChange = null;
  }
}
