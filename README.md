# Paste Image Rename Folder Guard

**An add-on for [Paste image rename](https://github.com/reorx/obsidian-paste-image-rename) that adds folder exclusions.** Choose the folders where Paste image rename must not automatically rename attachments or show rename prompts. It continues working as usual everywhere else.

**Paste image rename must be installed and enabled separately.** Folder Guard needs it to work.

[Инструкция на русском](docs/README.ru.md)

## Usage

1. Enable Paste image rename and Folder Guard.
2. Open **Settings → Paste Image Rename Folder Guard**.
3. In **Excluded folders**, start typing a folder name and select it from the suggestions. It appears as a chip.
4. Confirm that **Connection status** says the guard is connected before starting an import.

Click a chip to remove its exclusion. To exclude a folder that does not exist yet, enter its full path relative to the vault and click **Add folder**.

**No folders are excluded by default.** Changes apply immediately and are saved automatically. Removing all chips clears all exclusions.

For example, exclude `Telegram` to keep the original names of attachments created by Telegram Sync, while Paste image rename continues handling attachments in other folders.

## Matching rules

- Paths are relative to the vault root, and refer to the **attachment's location**, not the note's location.
- Each rule includes all subfolders. `Telegram/` protects `Telegram/photo.png` and `Telegram/Media/photo.png`, but not `Telegram-old/photo.png` or `Notes/Telegram/photo.png`.
- Matching is case-sensitive: use the exact capitalization shown in your vault.
- Leading/trailing slashes and Windows backslashes are normalized. Duplicate rules are ignored.
- Each chip represents one folder. Folder names can contain commas and semicolons.
- Absolute drive paths, URLs, root-only rules, and `.` or `..` path segments are rejected and shown in settings. No wildcards or regular expressions are supported.
- Rules may refer to folders that do not exist yet.

## Scope and compatibility

Folder Guard only controls Paste image rename's automatic processing. It does not rename, move, delete or rewrite files itself, and it does not change the original plugin's settings.

**Manual batch rename commands are outside the guard's scope.** Existing files are not scanned or reverted, and operations already started before the guard connected are not cancelled. Other plugins' file operations are not blocked.

After enabling or reloading Paste image rename, connection can take up to one second. **Files created before connection are not protected.** Wait for the connected status before importing. If settings report an incompatibility or conflict, protection cannot be confirmed.

Disabling Folder Guard lets Paste image rename handle all folders as usual.

Requires Obsidian **1.8.7** or later. On 1.13 and later, you can also find the exclusions through settings search.

## Install manually

1. Install and enable **Paste image rename** from Community plugins.
2. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Haperone/paste-image-rename-folder-guard/releases/latest).
3. In your vault's configuration directory (normally `.obsidian`), create `plugins/paste-image-rename-folder-guard/` and put those three files inside.
4. Reload Obsidian, then enable **Paste Image Rename Folder Guard** in Community plugins.

For the packaged ZIP, extract its `paste-image-rename-folder-guard` folder directly into the configuration directory's `plugins` folder. Avoid nesting it twice.

### Upgrade from the temporary helper

Disable the old helper, replace only `main.js` and `manifest.json`, add `styles.css`, then enable it again. Keep the existing `data.json` to preserve your saved exclusions. Do not install both copies simultaneously.

## Privacy

Folder Guard makes no network requests, sends no telemetry, requires no account or payment, and reads no files outside the vault. It saves only your exclusion settings and does not change Paste image rename's settings.

## License and credits

MIT. See [LICENSE](LICENSE).

Paste image rename is developed by [Reorx](https://github.com/reorx).
