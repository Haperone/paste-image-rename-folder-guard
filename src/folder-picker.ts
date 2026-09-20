import { AbstractInputSuggest, App, Component, setIcon, Setting } from 'obsidian';
import { parseFolders, type FolderRules } from './folders';

class FolderSuggest extends AbstractInputSuggest<string> {
  constructor(app: App, input: HTMLInputElement,
    private readonly selected: () => readonly string[],
    private readonly choose: (path: string) => void) {
    super(app, input);
  }

  protected override getSuggestions(query: string): string[] {
    const search = query.trim().toLocaleLowerCase();
    const excluded = new Set(this.selected());
    return this.app.vault.getAllFolders(false)
      .map(folder => folder.path)
      .filter(path => !excluded.has(path) && path.toLocaleLowerCase().includes(search))
      .sort((a, b) => a.localeCompare(b));
  }

  override renderSuggestion(path: string, el: HTMLElement): void {
    el.setText(path);
  }

  override selectSuggestion(path: string): void {
    this.close();
    this.choose(path);
  }
}

/** Own the picker and chip listeners for one settings render, including its popover. */
export class FolderPicker extends Component {
  constructor(private readonly app: App, private readonly setting: Setting,
    private readonly rules: () => FolderRules,
    private readonly onChange: (paths: string[]) => void) {
    super();
  }

  override onload(): void {
    const { setting } = this;
    setting.settingEl.addClass('pir-folder-guard', 'pir-folder-guard-folders');
    const root = setting.controlEl.createDiv({ cls: 'pir-folder-guard-picker' });
    this.register(() => root.remove());
    const entry = root.createDiv({ cls: 'pir-folder-guard-entry' });
    const input = entry.createEl('input', {
      type: 'text', placeholder: 'Search vault folders…',
      attr: { 'aria-label': 'Folder to exclude', spellcheck: 'false' }
    });
    const add = entry.createEl('button', { text: 'Add folder', attr: { type: 'button' } });
    const chips = root.createDiv({ cls: 'pir-folder-guard-chips', attr: { role: 'group', 'aria-label': 'Excluded folders' } });
    const feedback = root.createDiv({ cls: 'pir-folder-guard-feedback', attr: { role: 'status' } });
    let chipEvents = this.addChild(new Component());

    const renderChips = () => {
      this.removeChild(chipEvents);
      chipEvents = this.addChild(new Component());
      chips.empty();
      const { folders, invalid } = this.rules();
      for (const path of folders) {
        const chip = chips.createEl('button', {
          cls: 'pir-folder-guard-chip', attr: { type: 'button', 'aria-label': `Remove exclusion: ${path}`, title: `Remove ${path}` }
        });
        chip.createSpan({ text: path, cls: 'pir-folder-guard-chip-label' });
        setIcon(chip.createSpan({ cls: 'pir-folder-guard-chip-icon', attr: { 'aria-hidden': 'true' } }), 'x');
        chipEvents.registerDomEvent(chip, 'click', () => {
          this.onChange(this.rules().folders.filter(folder => folder !== path));
          renderChips();
          input.focus();
        });
      }
      const summary = folders.length ? `${folders.length} folder exclusion${folders.length === 1 ? '' : 's'} active.` : 'No folders excluded.';
      feedback.setText(invalid.length ? `${summary} Ignored invalid paths: ${invalid.join(', ')}.` : summary);
    };

    const choose = (value: string) => {
      const { folders, invalid } = parseFolders([value]);
      const path = folders[0];
      if (!path || invalid.length) {
        feedback.setText('Enter a vault-relative folder path. Absolute paths, web addresses and dot segments are not allowed.');
        return;
      }
      if (!this.rules().folders.includes(path)) this.onChange([...this.rules().folders, path]);
      input.value = '';
      renderChips();
      input.focus();
    };

    const suggest = new FolderSuggest(this.app, input, () => this.rules().folders, choose);
    this.register(() => suggest.close());
    this.registerDomEvent(add, 'click', () => {
      suggest.close();
      choose(input.value);
    });
    renderChips();
  }
}
