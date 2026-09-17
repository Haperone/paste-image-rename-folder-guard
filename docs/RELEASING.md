# Release and Community directory submission

The project is prepared locally. Creating a repository, committing, pushing, publishing a release and submitting the directory entry are separate actions; no local build performs them.

## Before the first public release

1. The confirmed public author name is `haperone` in `manifest.json`, `package.json` and `LICENSE`. Add `authorUrl` only when the GitHub account is confirmed.
2. Complete the real-device checklist in [TESTING.md](TESTING.md), including the minimum app version and mobile. If mobile cannot be supported, resolve the issue or adjust `isDesktopOnly` before submission.
3. Create a public GitHub repository with source code, `README.md`, `LICENSE`, `manifest.json`, `versions.json` and the npm lockfile. Enable issues. No repository URL has been invented in this draft.
4. Recheck that the ID and name are available. The legacy official plugin list contained no matching ID or name when inspected on 2026-09-17; the Community directory is authoritative at submission time.
5. Review the integration notes in [DEVELOPMENT.md](DEVELOPMENT.md) and the user-facing limitations in the README. The plugin depends on another plugin and an internal registry; approval is decided by Obsidian's reviewers.

## Prepare release assets

```sh
npm ci
npm run package
```

The installable directory is `dist/paste-image-rename-folder-guard/`.

For a new release, keep the version in `package.json`, `package-lock.json` and `manifest.json` in sync, and add its minimum app version to `versions.json`. Use an `x.y.z` tag such as `1.0.0`, with no `v` prefix. Check and commit changes only after the repository owner has approved the commit.

Attach **individual files** to the GitHub release:

- `main.js`
- `manifest.json`
- `styles.css`

A ZIP may be an additional convenience download, but does not replace those assets. The tag must match `manifest.json.version`. The manifest at the default branch's HEAD must describe the submitted version.

## GitHub Actions releases and attestations

After an approved commit and push, create/push the matching version tag with the owner's approval. Run **Release assets** from the Actions tab with mode `draft`, selecting the release tag as the workflow ref and entering the same tag in the input. The selected ref must contain this workflow. The workflow verifies that the tag points to its source commit, runs the checks and builds the assets, verifies the manifest version, creates GitHub build-provenance attestations, then creates a **draft** release with the three assets. It does not create commits or push tags, and does not publish the draft automatically.

Review the draft and publish it when approved.

### Attest an existing release

For a release uploaded manually, such as `1.0.0`, run **Release assets** with mode `attest-existing` and the existing version as the tag input. Select a branch that contains this workflow and can reproduce that release's files.

The workflow builds from its own source commit, downloads the three published assets to a separate temporary directory, and compares them byte for byte. Only matching rebuilt files are attested. A mismatch stops the workflow; it never replaces published files or moves the release tag. The attestation identifies the source commit of this rebuild, which may be newer than the original tag.

The workflow needs `id-token: write` and `attestations: write` to generate and store provenance; its existing `contents: write` permission is used for draft releases. These permissions belong to the release workflow, not pull-request checks.

Verify the published files after the workflow succeeds:

```sh
gh release download 1.0.0 --repo Haperone/paste-image-rename-folder-guard --dir release-check --pattern main.js --pattern manifest.json --pattern styles.css
gh attestation verify release-check/main.js --repo Haperone/paste-image-rename-folder-guard
gh attestation verify release-check/manifest.json --repo Haperone/paste-image-rename-folder-guard
gh attestation verify release-check/styles.css --repo Haperone/paste-image-rename-folder-guard
```

Then request another release check in the Obsidian Community directory. See [GitHub's attestation documentation](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations).

## Submit

As checked on 2026-09-17, the official submission route is the [Obsidian Community directory](https://community.obsidian.md/), not a new pull request to `community-plugins.json`:

1. Sign in using the maintainer's Obsidian account.
2. Link the GitHub account.
3. Under **Plugins**, select **New plugin**, provide the repository URL and owner, and review the maintainer commitments.
4. Submit for review and address the reported checks. Publish a new version if the review requires code changes.

The maintainer must personally accept account permissions and the commitment to maintain the plugin. Passing local checks does not mean the directory has approved the plugin.

## Official references

- [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)
- [Set up and claim](https://docs.obsidian.md/community-directory/set-up-and-claim)
- [Developer policies](https://docs.obsidian.md/community-directory/developer-policies)
- [Submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)
- [Official ESLint plugin](https://github.com/obsidianmd/eslint-plugin)
