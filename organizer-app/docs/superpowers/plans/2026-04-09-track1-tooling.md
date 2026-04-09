# Track 1: Tooling & CI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `make lint` pass and have GitHub Actions run lint + test + build on every push.

**Architecture:** ESLint v8 with `.eslintrc.js` extending `@nuxtjs/eslint-config-typescript`. GitHub Actions workflow in `.github/workflows/ci.yml` with three sequential jobs: lint → test → build.

**Tech Stack:** ESLint 8, @nuxtjs/eslint-config-typescript, eslint-plugin-vue, GitHub Actions, Node 20

**Working directory for all commands:** `organizer-app/`

---

## Task 1: Create ESLint config

**Files:**
- Create: `organizer-app/.eslintrc.js`

- [ ] **Step 1: Write `.eslintrc.js`**

```js
module.exports = {
  root: true,
  extends: [
    '@nuxtjs/eslint-config-typescript',
  ],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    '.nuxt/',
    '.output/',
    'dist/',
    'coverage/',
  ],
}
```

- [ ] **Step 2: Run lint to see what errors exist**

```bash
cd organizer-app && npm run lint 2>&1 | head -80
```

- [ ] **Step 3: Auto-fix fixable errors**

```bash
cd organizer-app && npm run lint:fix 2>&1 | tail -20
```

- [ ] **Step 4: Run lint again to see remaining errors**

```bash
cd organizer-app && npm run lint 2>&1 | grep "error\|warning" | head -50
```

- [ ] **Step 5: Fix remaining lint errors manually**

Common patterns to fix:
- Unused imports: remove them
- Missing type annotations on function parameters: add `: unknown` or correct type
- `any` types: replace with `unknown` or proper type from `types/` directory
- `vue/no-unused-vars`: remove unused template vars

For each error reported, open the file and fix it inline.

- [ ] **Step 6: Verify lint passes cleanly**

```bash
cd organizer-app && npm run lint
```

Expected output: no errors (warnings are acceptable).

- [ ] **Step 7: Commit**

```bash
cd organizer-app && git add .eslintrc.js && git add -u && git commit -m "feat(tooling): add ESLint config and fix all lint errors

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 2: Create GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml` (at repo root — one level up from `organizer-app/`)

Note: The `.github/` directory goes at the **repository root** (`/Users/timmeeuwissen/organizer/.github/`), not inside `organizer-app/`.

- [ ] **Step 1: Create the workflow directory**

```bash
mkdir -p /Users/timmeeuwissen/organizer/.github/workflows
```

- [ ] **Step 2: Write the CI workflow**

Create `/Users/timmeeuwissen/organizer/.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

defaults:
  run:
    working-directory: organizer-app

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: organizer-app/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: organizer-app/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    env:
      NUXT_PUBLIC_FIREBASE_API_KEY: dummy
      NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN: dummy.firebaseapp.com
      NUXT_PUBLIC_FIREBASE_PROJECT_ID: dummy
      NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET: dummy.appspot.com
      NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000'
      NUXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:000000000000'
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: organizer-app/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
```

- [ ] **Step 3: Verify the workflow file is valid YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('/Users/timmeeuwissen/organizer/.github/workflows/ci.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 4: Commit**

```bash
cd /Users/timmeeuwissen/organizer && git add .github/workflows/ci.yml && git commit -m "feat(ci): add GitHub Actions CI workflow (lint, test, build)

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Task 3: Verify CI readiness locally

- [ ] **Step 1: Run full local CI sequence**

```bash
cd organizer-app && npm run lint && npm run test && echo "CI PASS"
```

Expected: `CI PASS` at the end.

- [ ] **Step 2: Check build (skip if it needs Firebase env)**

```bash
cd organizer-app && npm run build 2>&1 | tail -20
```

If build fails with missing env vars, that's expected locally. The CI workflow provides dummy env values.

---

## Done

Track 1 complete when:
- `npm run lint` exits 0
- `npm run test` exits 0
- `.github/workflows/ci.yml` exists and is valid
