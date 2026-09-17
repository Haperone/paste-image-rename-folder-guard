# Development

This document is for maintainers and is not included in the installation package.

Use Node.js 22.13+ and npm:

```sh
npm ci
npm run check
npm run package
```

- `npm run dev`: rebuild the runtime bundle when source files change.
- `npm run check`: official Obsidian ESLint rules, TypeScript checks, regression tests, production build and release-file validation.
- `npm run package`: run all checks and prepare `dist/paste-image-rename-folder-guard/` with runtime files, the license and user documentation only.

The build has no bundled runtime dependencies. Obsidian provides the `obsidian` module. See [Testing](TESTING.md) for validation and [Releasing](RELEASING.md) for publication.

## Integration

The guard wraps `startRenameProcess` on the loaded Paste image rename instance and reads Obsidian's internal plugin registry because no public API exposes other plugin instances. These interfaces can change. The dependency interface was inspected at version 1.6.1; automated tests use an API-compatible test double.

Connection is checked at load, when the workspace becomes ready and once per second afterward. Unload restores the original handler if still owned; a wrapper retained by another extension becomes a pass-through.

Settings retain the original helper's `excludedFolders` format. New installations and missing or invalid settings use an empty exclusion list. Previously saved exclusions are preserved.
