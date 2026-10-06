# Environment sync in the dev-all YAML

`.engineering/dev.yaml` owns both the local service stack and optional `envSync` configuration. `calmcraft dev-all` starts local services; `calmcraft env-sync` reads the same YAML to set variables on a selected remote service. Starting the local stack never syncs remote secrets.

The CLI supports Vercel project variables and GitHub Actions environment secrets. Other services require another provider adapter; configuration cannot invoke arbitrary endpoints or commands.

## Sources and destinations

Sources have names independent of destination environments. A project can have separate development, preview and production items, share one item between environments, or configure only the environments it uses. Nothing falls back to production or infers an item from an environment name.

Add this section alongside `version`, `project`, `ports` and `services` in the existing dev-all YAML:

```yaml
envSync:
  sources:
    development:
      account: calmcompliance.1password.eu
      vault: Engineering
      item: Halcyon Development Env
    preview:
      account: calmcompliance.1password.eu
      vault: Engineering
      item: Halcyon Preview Env
    production:
      account: calmcompliance.1password.eu
      vault: Engineering
      item: Halcyon Production Env
  targets:
    vercel:
      provider: vercel
      project: your-vercel-project-id-or-name
      team: calmtech
      tokenEnv: VERCEL_TOKEN
      environments:
        development: development
        preview: preview
        production: production
```

Omit `variables` to sync all fields whose labels are valid environment variable names (`API_KEY`, `DATABASE_URL`, etc.). Item metadata, notes and fields with other labels are ignored. New environment fields added to the item are included on the next apply, without editing YAML. Set the project identity before use. `account` is optional when the installed `op` CLI already selects the correct account. Vault and item names containing `/`, `?` or `#` need the template form with complete secret references instead.

An optional `variables` list selects a subset. Names match exactly; `*` matches any number of characters, including none. Patterns match the whole label and are case-sensitive. Overlapping selectors include each field once:

```yaml
variables: ["*"]                         # explicit equivalent of omitting the list
```

```yaml
variables: ["DATABASE_URL", "API_*"]
```

Use `exclude` to omit names or `*` patterns from any source, including templates. Exclusions take precedence over `variables` and `--var`, and apply before selected values are validated or written. For example, a preview source can preserve credentials restricted to production and database variables managed by a provider integration:

```yaml
exclude: ["OPEN_ROUTER_API_KEY", "FIRECRAWL_API_KEY", "DATABASE_URL*"]
```

Dry runs show exclusions alongside the inclusion selectors.

Wildcard sources discover fields with `op item get` on apply. Selected values come from that item response and retain their original newlines. Exact-name-only lists continue to use `op read` references. A requested name or pattern with no matching fields fails before writes. Duplicate selected labels across sections are ambiguous and fail; use a template with section-specific references for those items. `--var KEY` narrows either form to one configured variable.

To share a source, map both destination environments to the same source name. To omit an environment, leave it out of the target's `environments` map. For example:

```yaml
environments:
  development: development
  preview: development
  production: production
```

The source is shared by an explicit choice. Provider policies may still require distinct production values.

## Reuse calm-app's existing templates

Instead of listing item fields in YAML, use a template source. It preserves the existing variable selection, per-field 1Password references and public values:

```yaml
envSync:
  sources:
    vercel-preview:
      account: calmcompliance.1password.eu
      template: devops/.env.vercel-preview.tpl
    vercel-production:
      account: calmcompliance.1password.eu
      template: devops/.env.vercel-production.tpl
    github-preview:
      account: calmcompliance.1password.eu
      template: devops/.env.github-preview.tpl
    github-production:
      account: calmcompliance.1password.eu
      template: devops/.env.github-production.tpl
  targets:
    vercel:
      provider: vercel
      project: your-vercel-project-id-or-name
      team: calmtech
      tokenEnv: VERCEL_TOKEN
      environments:
        preview: vercel-preview
        production: vercel-production
    github:
      provider: github
      repo: calmtechltd/halcyon
      environments:
        Preview: github-preview
        Production: github-production
```

Template paths are relative to the project working directory, including with `--config`. They must remain beneath that directory after resolving symlinks. Choose either `template` or `vault`/`item` with an optional `variables` list for a source.

Templates use dotenv syntax with active `KEY=value` lines. Values beginning with `op://` are secret references resolved with `op read --no-newline`; quotes, embedded `=` and multiline quoted values are supported. Comments are ignored, including references in comments. A reference must occupy the complete value; interpolation inside other text is unsupported. Literal template values must be public configuration: they are sent to Vercel as plain variables. GitHub targets accept only secret values from item sources or template references. Templates and YAML must never contain literal secrets. Template sources select their variables through the template itself and do not accept a `variables` list.

Vercel rejects item values and secret references whose names begin with common browser-public prefixes: `NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `REACT_APP_`, `GATSBY_`, `VUE_APP_` or `NUXT_PUBLIC_`. Frameworks can expose these values in browser bundles regardless of provider storage type. Exclude or rename those fields; intentional public values can use literal template entries. Projects with custom public prefixes must keep credentials out of those variables too.

calm-app's GitHub templates refer to separate GitHub secret items. Keep those sources separate from the Vercel sources. Its development item feeds local `.env` setup today; mapping that source to Vercel development is an explicit additional choice. Do not publish a local template containing developer credentials merely because the destination is named development.

## Command

Run from the project root. A target and destination environment are required:

```sh
# Plan only: names/selectors and destinations, no secret reads or network requests.
calmcraft env-sync --target vercel --env preview

# Resolve 1Password values and set the selected destination variables.
calmcraft env-sync --target vercel --env preview --apply

# Sync one variable across all environments configured on this target.
calmcraft env-sync --target vercel --env all --var OPEN_ROUTER_API_KEY --apply

# GitHub environment names keep their configured case.
calmcraft env-sync --target github --env Preview --apply
```

`--config path/to/dev.yaml` selects another stack YAML. `--dry-run` makes the default explicit. The default config path is `.engineering/dev.yaml`. The config still needs its local stack declaration. To invoke an unpublished source checkout, build Calm Craft's CLI and call its `dist/cli/index.js env-sync` from the project root, as with dev-all.

GitHub treats destination environment names as case-insensitive. Configuration rejects aliases such as `Preview` and `preview`, while retaining the spelling of distinct environments. Secret names starting with `GITHUB_` are reserved and rejected before writes, including names discovered from wildcard sources. Use exclusions or rename those source fields.

For wildcard item sources, a dry run shows selectors rather than discovered field names: listing item fields would also retrieve secret values. Applying discovers and shows the selected names before remote writes. Neither mode prints values.

Vercel authentication comes from the named process environment variable (`tokenEnv`, default `VERCEL_TOKEN`); the YAML stores only its name. GitHub uses the installed `gh` CLI's authentication. 1Password uses the installed `op` CLI and its current desktop or service-account authentication. The runner does not install tools, sign in, or pull provider values back into local files.

## Writes and recovery

The command validates all selected sources and variable filters before applying. A requested variable must exist in every selected source. Before Vercel writes, it reads environment metadata without requesting decrypted values and refuses selected variables whose existing record spans multiple environments. Split those scopes in Vercel before retrying; the runner does not silently change shared scopes. Branch-specific preview overrides are left in place; sync targets the default preview scope.

All selected secrets are resolved before remote writes begin. Missing, unreadable or whitespace-only 1Password values fail the run at this stage. Resolved values retain their original whitespace and newlines. Once resolution succeeds, variables are written sequentially; a provider error stops the run with the failed key and count of confirmed writes. The error identifies the current unconfirmed write as potentially applied, even if its response was lost or unreadable. Check provider state before retrying rather than assuming that request made no change. Earlier writes are retained; the command does not attempt a rollback with unavailable previous secret values.

Vercel uses its [project environment-variable upsert API](https://vercel.com/docs/rest-api/projects/create-one-or-more-environment-variables); it does not delete and recreate variables. Secret references use the sensitive type with secret visibility in preview and production; development uses the encrypted type because Vercel does not allow sensitive variables there, and public literals use the plain type with config visibility, following [Vercel's variable classifications](https://vercel.com/docs/environment-variables/sensitive-environment-variables). GitHub uses [`gh secret set`](https://cli.github.com/manual/gh_secret_set), which encrypts values for GitHub's API, with secret input on stdin. Resolved secrets never appear in command arguments, printed output, saved state or scratch files. Raw provider and subprocess responses are suppressed because they can contain values.

Only selected variables are set; keys removed from configuration or the source item are not deleted remotely. The command does not compare hidden remote secret values, promise a no-op when unchanged, create deployment environments, redeploy services or automatically refresh local `.env` files. Existing deployments may need redeployment to use the new values.
