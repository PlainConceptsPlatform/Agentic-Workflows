# Optional templates

Install templates explicitly. They are consumer-owned copies after installation.

| Template | Select when |
|---|---|
| `agentics-checks` | Pull requests must compile locks and lint agentic workflow source |
| `agentics-maintenance` | Repository wants gh-aw maintenance workflow before first compilation |
| `app-ci-dotnet-next` | .NET, SQL Server integration testing, and Next.js match repository |
| `app-ci-node-monorepo` | Node monorepo with supported web, desktop, mobile, and E2E layout matches repository |
| `opencode.ci.json` | Repository needs a standalone OpenCode CI config for agentic workflow runs |

## Install one

```sh
npx @plainconceptsplatform/workflows@latest add --template agentics-checks
```

Or with a project-local dependency:

```sh
pnpm exec workflows add --template agentics-checks
```

Each template copies to `.github/workflows/<template>.yml` (or the repository root for
`opencode.ci.json`). The package does not track or update templates after installation. They are
consumer-owned.

## What each template does

### `agentics-checks`

A pull-request CI workflow that compiles agentic workflow source and validates generated lockfiles.
It runs when `.github/workflows/*.md`, `.github/workflows/shared/*.md`, `.github/workflows/*.yml`,
`.github/aw/*.json`, or `.github/actions/**` change. Use it to enforce that every change to workflow
source ships with a compiled lockfile.

### `agentics-maintenance`

The pre-generated `agentics-maintenance.yml` that `gh aw compile` would produce. Install it only when
the repository does not want to run `gh aw compile` itself but still wants the maintenance operations
(create labels, disable/enable fleet, activity report, forecast, safe_outputs replay).

### `app-ci-dotnet-next`

A full CI pipeline for a .NET + Next.js application. Includes:

- SQL Server service container with Docker
- `dotnet restore`, `dotnet build -c Release`, per-project `dotnet test`
- Coverage gate
- `pnpm install` and `next build` for the frontend
- TruffleHog, Trivy, Semgrep, SBOM security scans

Read the template's `env:` block and job commands before enabling it. Tailor package names, paths,
versions, artifacts, and scanners to the repository.

### `app-ci-node-monorepo`

A full CI pipeline for a Node monorepo with web, desktop, mobile, and E2E testing. Includes:

- `pnpm install --frozen-lockfile`
- Per-package builds
- Vitest, Playwright E2E
- TruffleHog, Trivy, Semgrep, SBOM

Read the template's `env:` block and job commands before enabling it. Tailor workspace paths, package
scripts, and test commands to the repository.

### `opencode.ci.json`

A standalone OpenCode CI configuration for consumer repositories running agentic workflows in
GitHub Actions. It installs to the repository root as `opencode.ci.json`. Includes:

- `plainconcepts` provider at `http://172.30.0.30:10000` with apiKey `awf-openai-proxy`
- `glm-5-2` ("GLM 5.2") and `glm-5-1` ("GLM 5.1") model registrations
- Default model `plainconcepts/glm-5-2`
- `ci-workflow-agent` agent in `primary` mode with the output discipline directive
- LSP disabled for `csharp`, `fsharp`, and `razor` (consumers can remove the `lsp` block)
- `read` permission allow and `/tmp/**` external directory access

Read the file before enabling it. Tailor the provider endpoint, model selection, agent prompt,
permissions, and LSP configuration to the repository. JSON (RFC 8259) does not permit comments, so
the ownership header is documented in a companion `opencode.ci.json.md` file rather than inline.

## What not to do

Do not install a CI template as a generic starting point. Read its top-level `env:` and job commands.
Tailor package names, paths, versions, artifacts, and scanners before enabling it. Remove unused jobs
rather than leaving failing assumptions in CI.

Templates do not receive ownership headers because they are consumer-owned from installation. The
package never updates them. If a newer template version exists, re-run `add --template <name> --force`
to overwrite the local copy.
