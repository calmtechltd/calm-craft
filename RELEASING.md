# Releasing CalmCraft

Only a Calm Tech Ltd maintainer with npm scope ownership and GitHub release access can perform registry steps. Product releases are built in GitHub Actions, staged through npm trusted publishing, approved with two-factor authentication, tested from the registry, and promoted without rebuilding.

## One-time registry setup

npm cannot configure trusted or staged publishing until a package already exists. An owner of the `@calmcraft` scope must therefore create `@calmcraft/cli` once and record that bootstrap in the release evidence. Do not add a permanent npm token to the repository or retain a token-based publishing workflow.

After the package exists, use npm CLI 11.15 or newer to configure the exact trust relationship:

```sh
npm trust github @calmcraft/cli \
  --repo calmtechltd/calm-craft \
  --file release.yml \
  --environment npm \
  --allow-stage-publish
```

On npmjs.com, require two-factor authentication, disallow token publishing, and confirm that the trusted publisher permits `npm stage publish` but not direct `npm publish`. Protect the GitHub `npm` environment with required reviewers.

## Prepare a version

1. Update `package.json`, `plugin.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, and `src/meta.ts` to one version.
2. Move the release notes in `CHANGELOG.md` from pending to the release date.
3. Run `pnpm install --frozen-lockfile`, `pnpm check-types`, `pnpm lint`, `pnpm test:unit`, `pnpm build`, `pnpm license-check`, `pnpm release:check`, and the packaged browser suite.
4. Review the tarball file list and the complete Git diff. Do not publish from a developer checkout.
5. Create a GitHub prerelease whose tag is exactly `v<package-version>`. Publishing the GitHub release starts `.github/workflows/release.yml` against that tag.

The workflow uses a GitHub-hosted runner, no dependency cache, npm 11.18.0, pnpm 11.10.0, an OIDC identity token, and the protected `npm` environment. The exact package-manager CLIs install with lifecycle scripts disabled, so the OIDC job needs no third-party setup action. It repeats the release gates and submits the tarball with `npm stage publish --tag next`. It has no npm token.

## Approve and test the candidate

Inspect the staged package with `npm stage view` and `npm stage download`, then compare it with the workflow's package report. A maintainer must approve the stage with two-factor authentication before the candidate becomes available under `next`.

Run the `Installed package smoke` workflow with the exact version. Its macOS, Ubuntu, and Windows jobs install that pinned registry version with lifecycle scripts disabled, verify npm signatures and provenance, and open both a local branch review and a private-style remote branch review.

Any failure requires a new version. npm versions and staged tarballs are immutable; never reuse or overwrite one.

## Promote the tested tarball

After every smoke job passes, move the already-tested version to the public channel with an authenticated maintainer session and two-factor authentication:

```sh
npm dist-tag add @calmcraft/cli@0.3.0 latest
npm dist-tag rm @calmcraft/cli next
```

Confirm that `npm view @calmcraft/cli dist-tags --json` maps `latest` to the tested version, then mark the matching GitHub release as stable. Promotion changes only registry tags; it does not rebuild or republish the package.

## Release evidence

Record the staged-package identity, approval, package file report, license gate, six operating-system/runtime smoke results, provenance verification, final dist-tags, GitHub release, and source commit. Do not record repository tokens, private remote URLs, or private spec content.
