# Validation

## Automated checks

Run `npm run check` with Node.js 22.13+.

Local result on 2026-09-17 (Windows, Node.js 22.22.0): **19/19 tests passed**, ESLint completed with zero errors and zero warnings, TypeScript and the production build passed, and release-asset validation passed. Both GitHub Actions YAML files were parsed successfully. The workflows themselves have not run on GitHub.

The Node test runner and an isolated Obsidian API test double cover folder boundaries, path normalization, invalid settings, legacy migration, suppression, transparent forwarding, errors, repeated connections, dependency reload, cleanup, third-party handlers, disabling during asynchronous startup, serialized saves and storage failures.

TypeScript is strict. ESLint includes the official `eslint-plugin-obsidianmd` recommended configuration and type-aware TypeScript rules. The production artifact validator checks metadata consistency, required files, licensing and runtime imports.

These tests exercise the guard's behavior; they do not launch Obsidian or certify that a particular device works.

## Real-device release checklist

Status: **not yet performed**. Use a disposable vault, both plugins, and a few disposable image files. Record app, dependency and OS versions with the results. Test the declared minimum app version 1.8.7 and the current stable version. The dependency source interface was inspected at version 1.6.1.

- [ ] Enable guard before and after the dependency. Confirm the settings status becomes connected.
- [ ] On a fresh installation, confirm the list is empty and no folder is excluded. Add `Telegram/` explicitly for the following exclusion checks.
- [ ] With **Handle all attachments** enabled in Paste image rename, add `Telegram/photo.png` and `Telegram/Sub/photo.png`; neither should be renamed or open a rename prompt.
- [ ] Add an attachment in `Telegram-old/` and an unprotected folder; the dependency should still handle it normally.
- [ ] Verify that a note inside `Telegram/` with an attachment outside that folder is not exempt, and vice versa.
- [ ] Repeat with **Auto rename** on and off. Test actual paste and drag/drop, as well as an importer writing attachments.
- [ ] In a Telegram Sync import, wait for connection, import media, and confirm the filenames and note embeds remain consistent.
- [ ] Change the exclusions while enabled. Clear the list. Confirm the changes take effect immediately.
- [ ] Restart the app. Confirm exclusions persist. Upgrade a copy of the original helper while preserving `data.json`.
- [ ] Disable/re-enable and reload each plugin. Wait up to one second after dependency reload; confirm restoration and reconnection.
- [ ] Confirm manual batch rename commands still work, as documented.
- [ ] Verify the waiting state when the dependency is disabled.
- [ ] Use only the keyboard to reach and edit the textarea. Check visible focus and the accessible name.
- [ ] Check settings in light and dark themes, a narrow window and a popout. Close the popout and confirm detection still works in the main window.
- [ ] Repeat the main file-operation cases on Android and iOS. Check readable text, comfortable touch interaction and no horizontal overflow.

Do not mark these boxes from automated test results. Attach observations from actual app sessions before the public release.
