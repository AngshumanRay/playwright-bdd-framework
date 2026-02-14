---
name: playwright-bdd-cucumber
description: Convention and patterns for building and extending the Playwright BDD Cucumber automation framework
---

# Playwright BDD Cucumber Framework — SKILL Reference

## Quick Start (3 Steps)

```bash
# 1. Install everything
npm run setup

# 2. Run all tests
npm test

# 3. View reports
npx playwright show-report
open test-results/reports/dashboard.html
```

---

## Project Structure

```
features/
  ├── api/              # API feature files (no browser)
  └── ui/               # UI feature files (browser-based)
steps/
  ├── api/
  │   ├── api.fixtures.ts   # ApiClient fixture
  │   └── api.steps.ts      # Generic CRUD step definitions
  └── ui/
      ├── ui.fixtures.ts    # Page object fixtures
      ├── login.steps.ts    # SauceDemo login steps
      ├── inventory.steps.ts
      └── playwright_docs.steps.ts
src/
  ├── api/
  │   ├── client/ApiClient.ts     # HTTP client wrapper
  │   └── helpers/ApiValidator.ts  # Response assertion helpers
  ├── core/
  │   ├── config/env.config.ts         # Environment settings
  │   ├── config/test-data.config.ts   # Centralized test data
  │   └── utils/                       # Logger, auto-heal, metrics
  ├── ui/pages/                   # Page Object Model classes
  └── reporting/custom-reporter.ts
```

---

## Adding Your Own Application

### Step 1: Create a Page Object

```typescript
// src/ui/pages/MyAppPage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyAppPage extends BasePage {
  readonly usernameInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page, 'MyAppPage');
    this.usernameInput = page.getByLabel('Username');
    this.submitButton  = page.getByRole('button', { name: 'Submit' });
  }

  async navigate(): Promise<void> {
    await this.navigateTo('https://myapp.example.com');
  }

  async fillUsername(name: string): Promise<void> {
    await this.fill(this.usernameInput, name, 'Username');
  }

  async submit(): Promise<void> {
    await this.click(this.submitButton, 'Submit button');
  }
}
```

### Step 2: Register the Fixture

```typescript
// In steps/ui/ui.fixtures.ts — add to TestFixtures and the test.extend block
import { MyAppPage } from '../../src/ui/pages/MyAppPage';

type TestFixtures = {
  myAppPage: MyAppPage;
  // ... existing fixtures
};

const test = base.extend<TestFixtures>({
  myAppPage: async ({ page }, use) => { await use(new MyAppPage(page)); },
});
```

### Step 3: Write the Feature

```gherkin
# features/ui/my_app.feature
@ui @smoke
Feature: My Application
  Scenario: User can submit a form
    Given I am on the My App homepage
    When I enter username "testuser"
    And I click the submit button
    Then I should see a success message
```

### Step 4: Write Step Definitions

```typescript
// steps/ui/my_app.steps.ts
import { Given, When, Then } from './ui.fixtures';
import { expect } from '@playwright/test';

Given('I am on the My App homepage', async ({ myAppPage }) => {
  await myAppPage.navigate();
});

When('I enter username {string}', async ({ myAppPage }, name: string) => {
  await myAppPage.fillUsername(name);
});

When('I click the submit button', async ({ myAppPage }) => {
  await myAppPage.submit();
});
```

### Step 5: Run

```bash
npx bddgen && npx playwright test --project=chromium
```

---

## Adding API Tests

The generic API steps in `steps/api/api.steps.ts` work with ANY REST API. Just write a feature file:

```gherkin
@api
Feature: My API
  Scenario: Get a resource
    When I send a GET request to "/resource/1"
    Then the API response status should be 200
    And the API response should contain "name"

  Scenario: Create a resource
    When I send a POST request to "/resource" with body:
      """json
      { "name": "New Item", "type": "widget" }
      """
    Then the API response status should be 201
```

**API Base URL** is configured in `.env` → `API_BASE_URL` and in `playwright.config.ts` → `use.baseURL` for the api project.

---

## Environment Configuration

All settings are in `.env` (loaded automatically by Playwright):

| Variable        | Default                                      | Purpose              |
|-----------------|----------------------------------------------|----------------------|
| `UI_BASE_URL`   | `https://www.saucedemo.com`                  | UI test base URL     |
| `API_BASE_URL`  | `https://jsonplaceholder.typicode.com`       | API test base URL    |
| `HEADLESS`      | `true`                                       | Run headless?        |
| `DEFAULT_TIMEOUT` | `30000`                                    | Action timeout (ms)  |
| `TEST_TIMEOUT`  | `60000`                                      | Test timeout (ms)    |
| `RETRY_COUNT`   | `1`                                          | Retry failed tests   |
| `WORKERS`       | `4`                                          | Parallel workers     |

Override for CI: set environment variables directly (they take precedence over `.env`).

---

## Naming Conventions

| Item          | Convention              | Example                     |
|---------------|-------------------------|-----------------------------|
| Feature file  | `snake_case.feature`    | `user_login.feature`        |
| Step file     | `snake_case.steps.ts`   | `user_login.steps.ts`       |
| Page object   | `PascalCase.ts`         | `UserLoginPage.ts`          |
| Fixture file  | `scope.fixtures.ts`     | `ui.fixtures.ts`            |

---

## Tag Strategy

| Tag            | Purpose                           |
|----------------|-----------------------------------|
| `@ui`          | Runs in browser                   |
| `@api`         | No browser, HTTP requests only    |
| `@smoke`       | Critical path, run frequently     |
| `@regression`  | Full coverage, run on CI          |
| `@mock`        | Uses network interception         |
| `@wip`         | Work in progress, skip in CI      |

**Run by tag:** `npx playwright test --grep "@smoke"`

---

## Data-Driven Testing

Use **Scenario Outline** with **Examples** tables:

```gherkin
Scenario Outline: Login with multiple credentials
  When I login with "<username>" and "<password>"
  Then I should see "<result>"

  Examples:
    | username      | password     | result          |
    | standard_user | secret_sauce | Products        |
    | locked_out    | secret_sauce | locked out      |
    | invalid       | wrong        | do not match    |
```

For dynamic data, use `test-data.config.ts` or read from JSON/CSV files.

---

## API Workflow Chaining

For multi-step API workflows, chain steps sequentially:

```gherkin
Scenario: Create then retrieve a resource
  When I send a POST request to "/posts" with body:
    """json
    { "title": "Chained Test", "body": "Content", "userId": 1 }
    """
  Then the API response status should be 201
  And the API response should contain "id"
  When I send a GET request to "/posts/1"
  Then the API response status should be 200
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-reports
          path: |
            playwright-report/
            test-results/reports/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
e2e-tests:
  image: mcr.microsoft.com/playwright:v1.58.0-noble
  script:
    - npm ci
    - npx playwright install --with-deps
    - npm test
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/reports/
```

---

## Locator Strategy (Priority Order)

1. `getByRole()` — most resilient, accessible
2. `getByLabel()` / `getByPlaceholder()` — form fields
3. `getByText()` — visible text content
4. `getByTestId()` — explicit test identifiers
5. CSS / XPath — last resort only

---

## Troubleshooting FAQ

| Problem                        | Solution                                      |
|--------------------------------|-----------------------------------------------|
| `bddgen` errors               | Check feature/step file paths in config       |
| Tests timeout                  | Increase `DEFAULT_TIMEOUT` in `.env`          |
| Element not found              | Auto-heal logs show alternatives tried        |
| API 403/blocked                | Check if API requires auth or is Cloudflare'd |
| WebKit route intercept fails   | Known limitation — skip with `$testInfo.skip` |
| `Cannot find module` errors    | Check `tsconfig.json` path aliases            |
| Flaky tests                    | Add `await` before assertions, use `waitFor`  |
| Wrong base URL                 | Check `.env` and `playwright.config.ts`       |

---

## Available NPM Scripts

| Command             | Action                                |
|----------------------|---------------------------------------|
| `npm test`           | Full suite (all projects/browsers)    |
| `npm run test:ui`    | UI tests only (all browsers)          |
| `npm run test:api`   | API tests only                        |
| `npm run test:chrome`| UI on Chromium only                   |
| `npm run test:smoke` | Smoke tests only (`@smoke` tag)       |
| `npm run report`     | Open HTML report                      |
| `npm run setup`      | Install deps + browsers               |
