import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { isExcluded, parseFolders, type FolderRules } from './folders';
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
    this.addSettingTab(new FolderGuardSettingTab(this.app, this));
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

  async updateFolders(value: string): Promise<void> {
    this.settings = { excludedFolders: value };
    this.rules = parseFolders(value);
    const snapshot = { ...this.settings };
    // Textarea changes can overlap; persist snapshots in the same order as edits.
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
  constructor(app: App, private readonly guardPlugin: FolderGuardPlugin) {
    super(app, guardPlugin);
  }

  // These definitions add native settings search on 1.13+. The render callbacks
  // use the older public Setting API, also used by display() on earlier versions.
  override getSettingDefinitions() {
    return [
      {
        name: 'Excluded folders',
        desc: 'Enter paths from the vault root, one per line. Subfolders are included. Matching is case-sensitive; an empty list excludes nothing. Commas and semicolons also separate entries.',
        render: (setting: Setting) => this.renderFolders(setting)
      },
      { name: 'Connection status', render: (setting: Setting) => this.renderStatus(setting) },
      {
        name: 'Scope',
        desc: 'Exclusions use the attachment folder, not the note folder. Existing files and manual batch rename commands are unchanged. After enabling or reloading the dependency, allow up to one second for the connection.'
      }
    ];
  }

  // Compatibility fallback: Obsidian 1.13+ renders the definitions instead.
  override display(): void {
    this.containerEl.empty();
    for (const definition of this.getSettingDefinitions()) {
      const setting = new Setting(this.containerEl).setName(definition.name);
      if (definition.desc) setting.setDesc(definition.desc);
      definition.render?.(setting);
    }
  }

  private renderFolders(setting: Setting): void {
    setting.settingEl.addClass('pir-folder-guard', 'pir-folder-guard-folders');
    const feedback = setting.settingEl.createDiv({ cls: 'pir-folder-guard-feedback', attr: { role: 'status' } });
    const updateRules = () => {
      const { folders: paths, invalid } = this.guardPlugin.rules;
      const summary = paths.length ? `${paths.length} folder exclusion${paths.length === 1 ? '' : 's'} active.` : 'No folders excluded.';
      feedback.setText(invalid.length ? `${summary} Ignored invalid paths: ${invalid.join(', ')}. Use vault-relative folders, without . or .. segments.` : summary);
    };
    setting.addTextArea(text => {
      text.setPlaceholder('Enter folder paths')
        .setValue(this.guardPlugin.settings.excludedFolders)
        .onChange(async value => {
          const saved = this.guardPlugin.updateFolders(value);
          updateRules();
          await saved;
        });
      text.inputEl.rows = 6;
      text.inputEl.setAttribute('aria-label', 'Excluded folders');
      text.inputEl.setAttribute('spellcheck', 'false');
    });
    updateRules();
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
    this.guardPlugin.onStatusChange = null;
  }
}
