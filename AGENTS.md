# Agent Notes

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
