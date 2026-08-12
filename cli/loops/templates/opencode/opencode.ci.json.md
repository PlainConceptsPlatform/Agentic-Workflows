# Ownership: opencode.ci.json

Managed by @plainconceptsplatform/workflows. Source:
`loops/templates/opencode/opencode.ci.json`. Update with
`workflows update --force --template opencode.ci.json`; consumer edits may be
overwritten.

JSON (RFC 8259) does not permit comments, so the ownership header is documented
here instead of inline in `opencode.ci.json`.

## Template contents

This template provides a standalone OpenCode CI configuration for consumer
repositories running agentic workflows in GitHub Actions. It is copied to the
repository root as `opencode.ci.json`.

### Provider

- **plainconcepts** at `http://172.30.0.30:10000` with apiKey `awf-openai-proxy`.
- Two models registered: `glm-5-2` ("GLM 5.2") and `glm-5-1` ("GLM 5.1").
- Default model: `plainconcepts/glm-5-2`.

### Agent

- **ci-workflow-agent** in `primary` mode with the output discipline directive:
  no narration, no prose between tool calls, stop immediately after the final
  Safe Outputs command.

### LSP

- `csharp`, `fsharp`, and `razor` LSP servers are disabled. Consumers not
  working with .NET can remove the `lsp` block entirely.

### Consumer edits

After copying, edit the file directly for repository-specific needs:

- Change the model or add providers.
- Adjust agent prompt rules or permissions.
- Remove the `lsp` block if LSP is not needed or add other language servers.
- Add MCP servers or plugins as required.
