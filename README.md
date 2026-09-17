# Paste Image Rename Folder Guard

Keep imported attachments in selected folders out of **Paste image rename**'s automatic rename flow. Useful when an importer, such as Telegram Sync, needs attachment filenames to stay stable while it writes links into notes.

**Requires [Paste image rename](https://github.com/reorx/obsidian-paste-image-rename) to be installed and enabled separately.** Folder Guard does not rename, move, delete or rewrite vault files.

[Инструкция на русском](docs/README.ru.md)

## Usage

1. Enable Paste image rename and Folder Guard.
2. Open **Settings → Paste Image Rename Folder Guard**.
3. Enter the folders to exclude, one per line:

   ```text
   Telegram/
   Imported/Images/
   Backups/
   ```

4. Confirm that **Connection status** says the guard is connected before starting an import.

No folders are excluded by default. Add the folders you want to protect. Changes apply immediately and are saved automatically. Clearing the list disables all exclusions without disabling either plugin.

## Matching rules

- Paths are relative to the vault root, and refer to the **attachment's location**, not the note's location.
- Each rule includes all subfolders. `Telegram/` protects `Telegram/photo.png` and `Telegram/Media/photo.png`, but not `Telegram-old/photo.png` or `Notes/Telegram/photo.png`.
- Matching is case-sensitive: use the exact capitalization shown in your vault.
- Leading/trailing slashes and Windows backslashes are normalized. Duplicate rules are ignored.
- Newlines, commas and semicolons separate entries. Folder names containing commas or semicolons cannot be represented.
- Absolute drive paths, URLs, root-only rules, and `.` or `..` path segments are rejected and shown in settings. No wildcards or regular expressions are supported.
- Rules may refer to folders that do not exist yet.

## Scope and compatibility

For excluded attachments, the guard skips both automatic renaming and the automatic rename confirmation dialog. It leaves all other files to Paste image rename unchanged, including its naming templates and extension filters.

**Manual batch rename commands are outside the guard's scope.** Existing files are not scanned or reverted, and operations already started before the guard connected are not cancelled. Other plugins' file operations are not blocked.

After enabling or reloading Paste image rename, connection can take up to one second. **Files created before connection are not protected.** Wait for the connected status before importing. If settings report an incompatibility or conflict, protection cannot be confirmed.

Disabling Folder Guard lets Paste image rename handle all folders as usual.

Requires Obsidian **1.8.7** or later. On 1.13 and later, you can also find the exclusions through settings search.

## Install manually

1. Install and enable **Paste image rename** from Community plugins.
2. Download `main.js`, `manifest.json`, and `styles.css` from a release.
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
