# Validation

## Automated checks

Run `npm run check` with Node.js 22.13+.

Local result for 1.0.3 on 2026-10-03 (Windows): **28/28 tests passed**. ESLint passed with zero warnings; TypeScript, the production build and release-file validation passed. The runtime bundle imports only Obsidian, with no Node.js or Electron dependency.

A Chromium browser harness using the actual picker/CSS and mocked Obsidian APIs passed touch, focus, long-path wrapping and cleanup checks in light and dark themes at 320×700, 375×812, 430×932, 768×1024, 844×390 and 375×330. It verified 48 px mobile targets, input text of at least 16 px, no horizontal overflow, chips below the input and no hover highlight on a touch-only device. Representative phone screenshots were inspected. Desktop layout and hover checks also passed at 760 px and 320 px.

These browser contexts emulate touch and viewport dimensions. They do not run iOS WebKit, a real software keyboard, or Obsidian's native suggestion popup. Tests verify that mobile edits blur the input and focus a button without scrolling; actual keyboard dismissal remains a real-device check.

A separate browser check of the support header passed in light and dark themes at 760 px desktop and 320 px mobile widths. It verified the three link labels and destinations, safe external-link attributes, no duplicate links after rerendering, keyboard focus order and indicators, desktop row/mobile column layout, mobile targets of at least 44 px, and no horizontal overflow.

The folder picker adds regression coverage for live folder suggestions, duplicate prevention, removable chips, legacy exclusions, names containing commas and semicolons, saved array snapshots, empty selections after restart, and cleanup on settings rerenders, tab hiding and plugin unloading. The UI tests use an API/DOM test double; Obsidian's native popup and keyboard handling still need the real-device checks below.

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
- [ ] Type part of a folder name and choose a suggestion with the mouse, then with arrow keys and Enter. Check that the selected folder becomes a chip, clears the input and disappears from suggestions. Escape should dismiss the suggestions.
- [ ] Remove chips with the mouse and with the keyboard. Remove the final chip and confirm no folders are excluded after restart.
- [ ] Add a folder containing a comma or semicolon. Confirm the whole path is preserved and only that folder is excluded. Add a future folder with **Add folder**.
- [ ] Check visible keyboard focus and accessible names on the input, add button and remove chips. Close settings with suggestions open; confirm the popup disappears. Repeat through settings search on Obsidian 1.13+.
- [ ] Check settings in light and dark themes, a narrow window and a popout. Close the popout and confirm detection still works in the main window.
- [ ] Repeat the main file-operation cases on Android and iOS. Check readable text, comfortable touch interaction and no horizontal overflow.
- [ ] On Android and iOS, select a folder from suggestions and add a future folder manually. Confirm the keyboard closes after adding, and removing a chip does not reopen it or scroll the settings unexpectedly.
- [ ] Confirm paths are not autocorrected or automatically capitalized. Test long paths, an empty list, portrait/landscape orientation and a visible keyboard. Check that scrolling does not accidentally remove chips.
- [ ] With VoiceOver/TalkBack or an external keyboard, confirm focus remains reachable after adding/removing a chip and the exclusion count is announced.
- [ ] Check the three support buttons with mouse, keyboard, and touch. Confirm each opens its intended external page and the header fits in desktop and mobile settings.

Do not mark these boxes from automated test results. Attach observations from actual app sessions before the public release.
