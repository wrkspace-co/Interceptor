# CLI

Interceptor ships with a CLI for one-off runs and watch mode.

## Commands
```bash
interceptor               # run once
interceptor compile       # run once
interceptor check         # diff-only CI check (no writes)
interceptor watch         # watch and re-run on change
```

## Options
```bash
interceptor --config path/to/interceptor.config.ts
interceptor --cwd path/to/project
interceptor --dry-run
interceptor --diff
interceptor --report reports/interceptor.json
```

## Notes
- The CLI loads `.env` from the current working directory.
- Watch mode uses a debounced file watcher and respects `watcher.debounceMs`.
- `check` exits with code 1 when changes are required.
- `--dry-run` and `check` never write locale files or caches.

## Reports
Use `--report` to write a JSON report for CI systems. The report includes per-locale changes, summary counts, and a timestamp.
