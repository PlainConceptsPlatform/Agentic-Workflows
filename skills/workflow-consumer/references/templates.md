# Optional templates

Install templates explicitly. They are consumer-owned copies after installation.

| Template | Select when |
| --- | --- |
| `agentics-checks` | Pull requests must compile locks and lint agentic workflow source |
| `agentics-maintenance` | Repository wants gh-aw maintenance workflow before first compilation |
| `app-ci-dotnet-next` | .NET, SQL Server integration testing, and Next.js match repository |
| `app-ci-node-monorepo` | Node monorepo with supported web, desktop, mobile, and E2E layout matches repository |

Do not install a CI template as a generic starting point. Read its top-level `env:` and job commands. Tailor package names, paths, versions, artifacts, and scanners before enabling it. Remove unused jobs rather than leaving failing assumptions in CI.
