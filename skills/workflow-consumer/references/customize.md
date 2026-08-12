# Standalone worker customization

Every installed `agent-*.md` worker is complete at its own top-level `env:`. No `repo-config` exists. Do not add one.

Edit concrete worker defaults after installation when repository differs in:

- labels and lifecycle markers;
- issue context, evidence, and workspace paths;
- prompt rules and required onboarding commands;
- model gateway endpoint and worker budget;
- verification commands and repository-specific policy.

Keep `OPENAI_BASE_URL` explicit and aligned between worker `env:` and `engine.env`. Default is `https://forge.plainconcepts.com/v1`. Keep Git identity values if agent can create commits.

Imports are not configuration inheritance. They may provide shared mechanics, but worker owns its own environment defaults, permissions, engine, model, runner values, Safe Outputs, and timeout. This makes copied workers readable and portable.

When migrating older installation, move each shared configuration value into every worker that uses it, set a concrete default, remove old shared configuration reference, compile, then inspect worker lockfiles for expected resolved values. Preserve consumer changes before forced package update.
