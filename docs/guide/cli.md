# CLI

Interceptor ships with a CLI for one-off runs and watch mode.

## Commands
```bash
interceptor               # run once
interceptor compile       # run once
interceptor watch         # watch and re-run on change
```

## Options
```bash
interceptor --config path/to/interceptor.config.ts
interceptor --cwd path/to/project
```

## Notes
- The CLI loads `.env` from the current working directory.
- Watch mode uses a debounced file watcher and respects `watcher.debounceMs`.
