# LibraryCard Project Prime Commands

These commands run automatically when you type `/project:prime` to get Claude Code up to speed on LibraryCard.

## Git and Project Structure
```bash
git status
git log --oneline -10
git ls-files | head -20
ls -la
find . -name "*.md" -not -path "./node_modules/*" | head -10
```

## Read Key Documentation Files
```
Read: README.md
Read: CLAUDE.md
Read: docs/reference/TODO.md
Read: docs/reference/CHANGELOG.md
Read: docs/development/architecture.md
Read: docs/guides/getting-started.md
```

## Project Configuration
```
Read: package.json
Read: tsconfig.json
Read: next.config.js
Read: wrangler.toml
Read: netlify.toml
```

## Database and Schema
```
Read: schema.sql
ls migrations/
Read: migrations/*.sql (latest 3-4 files)
```

## Key Application Files
```
Read: src/app/layout.tsx
Read: src/app/page.tsx
Read: src/lib/types.ts
Read: workers/index.ts
Read: workers/types/index.ts
```

## Main Components Overview
```bash
ls src/components/
ls src/lib/
ls workers/
```

## Development Environment Check
```bash
node --version
npm --version
cat .env.local.example 2>/dev/null || echo "No .env.local.example found"
```

## Recent Activity Context
```bash
git diff HEAD~5 --name-only
git show --name-only HEAD
```