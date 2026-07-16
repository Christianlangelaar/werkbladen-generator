# Agent Notes

## General workflow

- Respect the existing architecture and keep changes scoped to the requested outcome.
- Inspect existing implementations before writing new code.
- Reuse existing components, composables, services, helpers, validation, styling, API patterns, and deployment structure where possible.
- Avoid broad refactors unless they are necessary for the task.
- Make new UI look and behave like it belongs to the current app.
- Keep secrets and API keys server-side; document required environment variables.
- Run lint, typecheck, tests, and build before delivery when the task changes code.
- Commit only intentional, clean changes with clear commit messages.
- Follow the existing deployment procedure and verify the deployed app afterwards.
- For Asana-sourced tasks, add a concise delivery comment and only mark the task complete when implementation, verification, deployment, and handoff are actually done.
- Ask questions only when essential information, credentials, or permissions are missing.

## Node version

This project uses Node `24.13.0`, as defined in `.nvmrc`.

When running project commands from an AI/non-interactive shell, do not rely on the plain `node` on `PATH`; it may resolve to the older system install at `/usr/local/bin/node` (`v14.16.1`).

Use an interactive zsh command that loads `nvm` first:

```sh
zsh -ic 'nvm use && npm run build'
```

The same pattern applies to other npm scripts:

```sh
zsh -ic 'nvm use && npm run type-check'
zsh -ic 'nvm use && npm run build-only'
zsh -ic 'nvm use && npm run dev'
```

Expected versions after `nvm use`:

```sh
node -v # v24.13.0
npm -v  # 11.6.2
```

If checks fail with syntax errors around modern JavaScript features such as `??=`, first verify the active Node version before changing code or dependencies.
