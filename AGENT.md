# AGENT.md — Architecture Guide for AI Assistants & Developers

> This document helps AI coding assistants (and developers) understand, extend, and troubleshoot this Playwright BDD Cucumber framework.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   playwright.config.ts                   │
│  ┌─────────┐  ┌─────────┐  ┌──────┐  ┌──────────────┐  │
│  │Chromium  │  │Firefox  │  │WebKit│  │  API (no     │  │
│  │UI Tests  │  │UI Tests │  │  UI  │  │  browser)    │  │
│  └────┬─────┘  └────┬────┘  └──┬───┘  └──────┬───────┘  │
│       │             │          │              │          │
│       └─────────┬───┘──────────┘              │          │
│                 ▼                              ▼          │
│         features/ui/*.feature        features/api/*.feature│
│                 │                              │          │
│         steps/ui/*.steps.ts          steps/api/*.steps.ts │
│                 │                              │          │
│         ui.fixtures.ts               api.fixtures.ts     │
│                 │                              │          │
│         src/ui/pages/*               src/api/client/*    │
│                 │                              │          │
│              BasePage.ts              ApiClient.ts       │
│                 │                              │          │
│         src/core/ (config, utils, logger, auto-heal)     │
└─────────────────────────────────────────────────────────┘
```

### Key Design Patterns

| Pattern                | Where Used                     | Purpose                                    |
|------------------------|--------------------------------|--------------------------------------------|
| **Page Object Model**  | `src/ui/pages/`                | Encapsulate UI interactions per page        |
| **Fixtures**           | `steps/*/fixtures.ts`          | Dependency injection for test setup         |
| `defineBddProject()`  | `playwright.config.ts`         | Create separate test projects for BDD       |
| **Auto-Healing**       | `src/core/utils/auto-heal.ts`  | Fallback locator strategies                 |
| **Centralized Config** | `src/core/config/`             | Single source for environment + test data   |

---

## How to Adapt This Framework to Any Application

### 1. Configure Environment

Edit `.env` to set your application's URLs:

```env
UI_BASE_URL=https://your-app.example.com
API_BASE_URL=https://api.your-app.example.com
```

### 2. Create Page Objects

Each screen/page of your app gets its own page object extending `BasePage`:

```typescript
// src/ui/pages/YourPage.ts
export class YourPage extends BasePage {
  constructor(page: Page) {
    super(page, 'YourPage');
    // Define locators here using getByRole, getByLabel, etc.
  }
  // Add action methods: navigate(), fillForm(), submit(), etc.
  // Add verification methods: verifySuccess(), verifyError(), etc.
}
```

### 3. Register Fixtures

Add your page object to `steps/ui/ui.fixtures.ts`:

```typescript
yourPage: async ({ page }, use) => { await use(new YourPage(page)); },
```

### 4. Write Features + Steps

- Feature file → `features/ui/your_feature.feature`
- Step definitions → `steps/ui/your_feature.steps.ts`

### 5. Run & Iterate

```bash
npx bddgen && npx playwright test --project=chromium
```

---

## Multi-Environment Configuration

The framework supports multiple environments through `.env` files:

```bash
# Run against staging
UI_BASE_URL=https://staging.myapp.com npm test

# Run against production (read-only tests)
UI_BASE_URL=https://myapp.com npx playwright test --grep "@smoke"
```

Create environment-specific `.env` files:

```
.env              # Default (development)
.env.staging      # Staging config
.env.production   # Production config (smoke tests only)
```

Load them via: `dotenv -e .env.staging -- npx playwright test`

---

## Extension Patterns

### Adding a Custom Hook (Before/After Each Test)

Use Playwright fixtures with auto-use:

```typescript
// In ui.fixtures.ts
const test = base.extend<TestFixtures>({
  // This runs before EVERY test automatically
  autoSetup: [async ({ page }, use) => {
    // Before test: clear cookies, set viewport, etc.
    await page.context().clearCookies();
    await use(undefined);
    // After test: capture screenshot on failure, etc.
  }, { auto: true }],
});
```

### Adding a New Reporter

```typescript
// playwright.config.ts → reporter array
reporter: [
  ['html'],
  ['./src/reporting/custom-reporter.ts', { outputDir: 'test-results/reports' }],
  ['json', { outputFile: 'test-results/results.json' }],
],
```

### Adding Data Factories

```typescript
// src/core/utils/data-factory.ts
export function generateUser() {
  return {
    name: `user_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'SecureP@ss123',
  };
}
```

---

## File-by-File Reference

### Configuration Files

| File                       | Purpose                                                    |
|----------------------------|------------------------------------------------------------|
| `playwright.config.ts`     | Main config: projects, reporters, timeouts, retries        |
| `tsconfig.json`            | TypeScript config with path aliases (`@core/*`, `@ui/*`)   |
| `.env`                     | Environment variables (URLs, timeouts, credentials)        |
| `src/core/config/env.config.ts` | Reads `.env` → typed config object with defaults     |
| `src/core/config/test-data.config.ts` | Centralized test data constants             |

### UI Testing Files

| File                         | Purpose                                              |
|------------------------------|------------------------------------------------------|
| `src/ui/pages/BasePage.ts`   | Base class: navigation, click, fill, assertions      |
| `src/ui/pages/*.ts`          | App-specific page objects                            |
| `steps/ui/ui.fixtures.ts`    | Fixture definitions + `createBdd(test)` export       |
| `steps/ui/*.steps.ts`        | Step definitions linking Gherkin to page objects      |

### API Testing Files

| File                          | Purpose                                             |
|-------------------------------|-----------------------------------------------------|
| `src/api/client/ApiClient.ts` | HTTP client with logging, retries, timing           |
| `src/api/helpers/ApiValidator.ts` | Response validation helper functions            |
| `steps/api/api.fixtures.ts`   | ApiClient fixture + response sharing                |
| `steps/api/api.steps.ts`      | Generic CRUD step definitions (works with any API)  |

### Utilities

| File                                  | Purpose                                    |
|---------------------------------------|--------------------------------------------|
| `src/core/utils/logger.ts`           | Colored, structured logging                |
| `src/core/utils/auto-heal.ts`        | Auto-healing locator fallback strategies   |
| `src/core/utils/metrics-collector.ts` | Aggregates performance/accessibility data  |
| `src/core/utils/performance-helper.ts`| Collects page load and web vitals metrics  |
| `src/reporting/custom-reporter.ts`    | HTML dashboard with charts and tables      |

---

## Troubleshooting Decision Tree

```
Test Failing?
├─ Element not found?
│  ├─ Check locator in page object (use getByRole first)
│  ├─ Check auto-heal logs for alternatives tried
│  └─ Try running headed: HEADLESS=false npm test
├─ Timeout?
│  ├─ Increase DEFAULT_TIMEOUT in .env
│  ├─ Add explicit waitFor() before interaction
│  └─ Check if page is fully loaded (network idle)
├─ API returns unexpected status?
│  ├─ Check API_BASE_URL in .env
│  ├─ Check if API requires auth (API key, token)
│  └─ Test the endpoint manually: curl <url>
├─ bddgen fails?
│  ├─ Check feature/step glob paths in playwright.config.ts
│  ├─ Ensure step definitions use createBdd(test) from fixtures
│  └─ Check for duplicate step definitions
└─ Import errors?
   ├─ Check tsconfig.json path aliases
   └─ Ensure file exists at the relative path
```

---

## Common Operations Quickref

| Task                              | Command / Action                               |
|-----------------------------------|-------------------------------------------------|
| Add a new UI page object          | Create class extending `BasePage` in `src/ui/pages/` |
| Add a new API endpoint            | Just write a feature file — generic steps handle it  |
| Run by tag                        | `npx playwright test --grep "@smoke"`                |
| Run single file                   | `npx playwright test path/to/spec.js`                |
| Debug a test                      | `PWDEBUG=1 npx playwright test --project=chromium`   |
| View trace                        | `npx playwright show-trace <path-to-trace.zip>`      |
| Generate BDD stubs                | `npx bddgen`                                         |
| Switch environment                | Update `.env` or set env vars inline                  |
