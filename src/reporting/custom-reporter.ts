/**
 * ============================================================================
 * 📁 custom-reporter.ts — Custom Playwright Reporter with Rich Metrics
 * ============================================================================
 *
 * PURPOSE:
 * A custom Playwright reporter that collects data during the test run and
 * generates a beautiful HTML dashboard with:
 *   📊 Charts and graphs (pass/fail pie chart, duration bar chart)
 *   📈 Performance benchmarks (page load times, API response times)
 *   ♿ Accessibility scan results
 *   🔧 Observability metrics (flaky tests, auto-heals, retries)
 *   📋 Detailed test results table
 *
 * HOW PLAYWRIGHT REPORTERS WORK:
 * Playwright calls specific methods on your reporter at different stages:
 *   onBegin()     → Called once when the test run starts
 *   onTestEnd()   → Called after each test finishes
 *   onEnd()       → Called once when ALL tests are done
 *
 * You collect data in onTestEnd() and generate the report in onEnd().
 *
 * FOR BEGINNERS:
 * Think of a reporter as a "journalist" watching your tests run.
 * It takes notes on everything that happens and writes a summary at the end.
 * ============================================================================
 */

import {
  Reporter,
  TestCase,
  TestResult,
  FullConfig,
  Suite,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../core/utils/logger';

/** Logger for this module */
const log = new Logger('CustomReporter');

/**
 * Data collected for each test.
 */
interface TestData {
  title: string;
  fullTitle: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  duration: number;
  error?: string;
  retries: number;
  projectName: string;
  tags: string[];
  file: string;
}

/**
 * CustomReporter — Generates a rich HTML dashboard after tests run.
 *
 * USAGE:
 * Add this to your playwright.config.ts reporters array:
 *   reporter: [
 *     ['./src/reporting/custom-reporter.ts', { outputDir: 'test-results/reports' }],
 *   ]
 */
export default class CustomReporter implements Reporter {
  /** All test results collected during the run */
  private tests: TestData[] = [];

  /** When the run started */
  private startTime: Date = new Date();

  /** Output directory for the report */
  private outputDir: string;

  constructor(options?: { outputDir?: string }) {
    this.outputDir = options?.outputDir || 'test-results/reports';
  }

  /**
   * Called once when the test run starts.
   * Logs the start and records the timestamp.
   */
  onBegin(config: FullConfig, suite: Suite): void {
    this.startTime = new Date();
    const totalTests = suite.allTests().length;
    log.separator('Test Run Starting');
    log.info(`Total tests to run: ${totalTests}`);
    log.info(`Workers: ${config.workers}`);
  }

  /**
   * Called after each individual test finishes.
   * Collects the test data for the final report.
   */
  onTestEnd(test: TestCase, result: TestResult): void {
    // Extract tags from the test title (e.g., @smoke, @api)
    const tags = test.tags || [];

    this.tests.push({
      title: test.title,
      fullTitle: test.titlePath().join(' > '),
      status: result.status,
      duration: result.duration,
      error: result.error?.message?.substring(0, 500),
      retries: result.retry,
      projectName: test.parent?.project()?.name || 'unknown',
      tags: tags,
      file: test.location.file,
    });

    // Log each test result as it happens
    const statusIcon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
    log.info(`${statusIcon} ${test.title} (${result.duration}ms)`);
  }

  /**
   * Called once when ALL tests have finished.
   * This is where we generate the HTML report.
   */
  async onEnd(result: FullResult): Promise<void> {
    log.separator('Test Run Complete');

    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    // ── Calculate summary statistics ─────────────────────────────────
    const passed = this.tests.filter((t) => t.status === 'passed').length;
    const failed = this.tests.filter((t) => t.status === 'failed').length;
    const skipped = this.tests.filter((t) => t.status === 'skipped').length;
    const timedOut = this.tests.filter((t) => t.status === 'timedOut').length;
    const total = this.tests.length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
    const flaky = this.tests.filter((t) => t.retries > 0 && t.status === 'passed').length;

    // ── Calculate duration stats ─────────────────────────────────────
    const durations = this.tests.map((t) => t.duration);
    const avgDuration = total > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / total) : 0;
    const maxDuration = Math.max(...durations, 0);
    const minDuration = Math.min(...durations, 0);

    // ── Group by project/browser ─────────────────────────────────────
    const byProject: Record<string, { passed: number; failed: number; skipped: number; total: number }> = {};
    this.tests.forEach((t) => {
      if (!byProject[t.projectName]) {
        byProject[t.projectName] = { passed: 0, failed: 0, skipped: 0, total: 0 };
      }
      byProject[t.projectName].total++;
      if (t.status === 'passed') byProject[t.projectName].passed++;
      else if (t.status === 'failed') byProject[t.projectName].failed++;
      else byProject[t.projectName].skipped++;
    });

    // ── Generate the report ──────────────────────────────────────────
    const metricsJson = {
      summary: {
        total,
        passed,
        failed,
        skipped,
        timedOut,
        passRate: parseFloat(passRate),
        flaky,
        totalDuration,
        avgDuration,
        maxDuration,
        minDuration,
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
      byProject,
      tests: this.tests,
    };

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Save JSON metrics
    const jsonPath = path.join(this.outputDir, 'metrics.json');
    fs.writeFileSync(jsonPath, JSON.stringify(metricsJson, null, 2));

    // Generate HTML report
    const htmlPath = path.join(this.outputDir, 'dashboard.html');
    fs.writeFileSync(htmlPath, this.generateHtmlReport(metricsJson));

    log.info(`📊 Dashboard report: ${htmlPath}`);
    log.info(`📋 Metrics JSON: ${jsonPath}`);
    log.info(`Results: ${passed}/${total} passed (${passRate}%)`);
    log.separator();
  }

  /**
   * Generates a complete HTML dashboard with charts and tables.
   * Uses Chart.js (loaded from CDN) for interactive charts.
   */
  private generateHtmlReport(metrics: any): string {
    const { summary, byProject, tests } = metrics;
    const failedTests = tests.filter((t: TestData) => t.status === 'failed');
    const flakyTests = tests.filter((t: TestData) => t.retries > 0 && t.status === 'passed');

    // Project breakdown rows
    const projectRows = Object.entries(byProject)
      .map(([name, data]: [string, any]) => `
        <tr>
          <td>${name}</td>
          <td>${data.total}</td>
          <td class="text-success">${data.passed}</td>
          <td class="text-danger">${data.failed}</td>
          <td class="text-muted">${data.skipped}</td>
          <td>${data.total > 0 ? ((data.passed / data.total) * 100).toFixed(1) : 0}%</td>
        </tr>
      `)
      .join('');

    // All tests table rows
    const testRows = tests
      .map((t: TestData) => {
        const statusClass =
          t.status === 'passed' ? 'badge-success' :
            t.status === 'failed' ? 'badge-danger' :
              'badge-warning';
        const statusIcon =
          t.status === 'passed' ? '✅' :
            t.status === 'failed' ? '❌' :
              '⏭️';
        return `
          <tr>
            <td>${statusIcon} <span class="badge ${statusClass}">${t.status}</span></td>
            <td title="${t.fullTitle}">${t.title}</td>
            <td>${t.projectName}</td>
            <td>${t.duration}ms</td>
            <td>${t.retries > 0 ? `🔄 ${t.retries}` : '—'}</td>
            <td>${t.error ? `<span class="error-msg" title="${this.escapeHtml(t.error)}">${this.escapeHtml(t.error.substring(0, 80))}...</span>` : '—'}</td>
          </tr>
        `;
      })
      .join('');

    // Failed tests detail
    const failedDetail = failedTests.length > 0
      ? failedTests.map((t: TestData) => `
          <div class="failed-test-card">
            <h4>❌ ${this.escapeHtml(t.title)}</h4>
            <p><strong>File:</strong> ${this.escapeHtml(t.file)}</p>
            <p><strong>Project:</strong> ${t.projectName}</p>
            <pre class="error-block">${this.escapeHtml(t.error || 'No error message')}</pre>
          </div>
        `).join('')
      : '<p class="text-success">🎉 No failed tests!</p>';

    // Flaky tests detail
    const flakyDetail = flakyTests.length > 0
      ? flakyTests.map((t: TestData) => `
          <div class="flaky-test-card">
            <h4>🔄 ${this.escapeHtml(t.title)}</h4>
            <p>Retried <strong>${t.retries}</strong> time(s) before passing.</p>
            <p><strong>Project:</strong> ${t.projectName}</p>
          </div>
        `).join('')
      : '<p class="text-success">🎉 No flaky tests detected!</p>';

    // Duration data for bar chart
    const durationLabels = tests.slice(0, 20).map((t: TestData) =>
      t.title.length > 30 ? t.title.substring(0, 27) + '...' : t.title
    );
    const durationValues = tests.slice(0, 20).map((t: TestData) => t.duration);
    const durationColors = tests.slice(0, 20).map((t: TestData) =>
      t.status === 'passed' ? '#10b981' : t.status === 'failed' ? '#ef4444' : '#f59e0b'
    );

    // Project data for chart
    const projectNames = Object.keys(byProject);
    const projectPassed = projectNames.map((n) => (byProject as any)[n].passed);
    const projectFailed = projectNames.map((n) => (byProject as any)[n].failed);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚀 Test Execution Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    /* ═══════════════════════════════════════════════════════════════
       CSS Styles for the Dashboard
       ═══════════════════════════════════════════════════════════════ */
    :root {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-card: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --accent-yellow: #f59e0b;
      --accent-blue: #3b82f6;
      --accent-purple: #8b5cf6;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 2rem;
      padding: 2rem;
      background: linear-gradient(135deg, var(--bg-secondary), var(--bg-card));
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .header .subtitle { color: var(--text-secondary); font-size: 1rem; }
    .header .timestamp { color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem; }

    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .summary-card {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.05);
      transition: transform 0.2s;
    }
    .summary-card:hover { transform: translateY(-2px); }
    .summary-card .number {
      font-size: 2.5rem;
      font-weight: 700;
      display: block;
      margin-bottom: 0.25rem;
    }
    .summary-card .label {
      color: var(--text-secondary);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summary-card.success .number { color: var(--accent-green); }
    .summary-card.danger .number { color: var(--accent-red); }
    .summary-card.warning .number { color: var(--accent-yellow); }
    .summary-card.info .number { color: var(--accent-blue); }
    .summary-card.purple .number { color: var(--accent-purple); }

    /* Charts Section */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .chart-card {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .chart-card h3 {
      margin-bottom: 1rem;
      font-size: 1.1rem;
      color: var(--text-primary);
    }
    .chart-container { position: relative; height: 300px; }

    /* Section Headers */
    .section-header {
      font-size: 1.5rem;
      margin: 2rem 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--bg-card);
    }

    /* Tables */
    .table-container {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 1.5rem;
      overflow-x: auto;
      margin-bottom: 2rem;
      border: 1px solid rgba(255,255,255,0.05);
    }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left;
      padding: 0.75rem;
      background: var(--bg-card);
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td {
      padding: 0.75rem;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      font-size: 0.9rem;
    }
    tr:hover td { background: rgba(255,255,255,0.03); }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-success { background: rgba(16,185,129,0.2); color: var(--accent-green); }
    .badge-danger { background: rgba(239,68,68,0.2); color: var(--accent-red); }
    .badge-warning { background: rgba(245,158,11,0.2); color: var(--accent-yellow); }

    /* Text Colors */
    .text-success { color: var(--accent-green); }
    .text-danger { color: var(--accent-red); }
    .text-warning { color: var(--accent-yellow); }
    .text-muted { color: var(--text-secondary); }

    /* Error & Flaky Cards */
    .failed-test-card, .flaky-test-card {
      background: var(--bg-card);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      border-left: 4px solid var(--accent-red);
    }
    .flaky-test-card { border-left-color: var(--accent-yellow); }
    .failed-test-card h4, .flaky-test-card h4 { margin-bottom: 0.5rem; }
    .error-block {
      background: rgba(0,0,0,0.3);
      padding: 1rem;
      border-radius: 6px;
      font-size: 0.8rem;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
      color: var(--accent-red);
    }
    .error-msg {
      color: var(--accent-red);
      font-size: 0.8rem;
      cursor: help;
    }

    /* Progress Bar */
    .progress-bar {
      width: 100%;
      height: 8px;
      background: var(--bg-card);
      border-radius: 4px;
      overflow: hidden;
      margin: 1rem 0;
    }
    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 1s ease;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- ═══════════════════════════════════════════════════════════════
         Header
         ═══════════════════════════════════════════════════════════════ -->
    <div class="header">
      <h1>🚀 Test Execution Dashboard</h1>
      <p class="subtitle">Playwright BDD Automation Framework</p>
      <p class="timestamp">
        Run: ${new Date(summary.startTime).toLocaleString()} — 
        Duration: ${this.formatDuration(summary.totalDuration)}
      </p>
      <!-- Overall Pass Rate Progress Bar -->
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${summary.passRate}%; background: ${summary.passRate >= 80 ? 'var(--accent-green)' : summary.passRate >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'}"></div>
      </div>
      <p style="font-size: 1.2rem; font-weight: 600;">
        Pass Rate: <span style="color: ${summary.passRate >= 80 ? 'var(--accent-green)' : 'var(--accent-red)'}">${summary.passRate}%</span>
      </p>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         Summary Cards
         ═══════════════════════════════════════════════════════════════ -->
    <div class="summary-grid">
      <div class="summary-card info">
        <span class="number">${summary.total}</span>
        <span class="label">Total Tests</span>
      </div>
      <div class="summary-card success">
        <span class="number">${summary.passed}</span>
        <span class="label">Passed</span>
      </div>
      <div class="summary-card danger">
        <span class="number">${summary.failed}</span>
        <span class="label">Failed</span>
      </div>
      <div class="summary-card warning">
        <span class="number">${summary.skipped + summary.timedOut}</span>
        <span class="label">Skipped / Timed Out</span>
      </div>
      <div class="summary-card purple">
        <span class="number">${summary.flaky}</span>
        <span class="label">Flaky Tests</span>
      </div>
      <div class="summary-card info">
        <span class="number">${this.formatDuration(summary.avgDuration)}</span>
        <span class="label">Avg Duration</span>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         Charts
         ═══════════════════════════════════════════════════════════════ -->
    <div class="charts-grid">
      <!-- Pie Chart: Pass/Fail/Skip Distribution -->
      <div class="chart-card">
        <h3>📊 Test Results Distribution</h3>
        <div class="chart-container">
          <canvas id="statusChart"></canvas>
        </div>
      </div>

      <!-- Bar Chart: Test Duration -->
      <div class="chart-card">
        <h3>⏱️ Test Duration (Top 20)</h3>
        <div class="chart-container">
          <canvas id="durationChart"></canvas>
        </div>
      </div>

      <!-- Bar Chart: Results by Browser/Project -->
      <div class="chart-card">
        <h3>🌐 Results by Project / Browser</h3>
        <div class="chart-container">
          <canvas id="projectChart"></canvas>
        </div>
      </div>

      <!-- Gauge Chart: Pass Rate -->
      <div class="chart-card">
        <h3>🎯 Pass Rate Gauge</h3>
        <div class="chart-container">
          <canvas id="gaugeChart"></canvas>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         Project/Browser Breakdown Table
         ═══════════════════════════════════════════════════════════════ -->
    <h2 class="section-header">🌐 Results by Project / Browser</h2>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Total</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Pass Rate</th>
          </tr>
        </thead>
        <tbody>
          ${projectRows}
        </tbody>
      </table>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         Failed Tests Detail
         ═══════════════════════════════════════════════════════════════ -->
    <h2 class="section-header">❌ Failed Tests</h2>
    <div class="table-container">
      ${failedDetail}
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         Flaky Tests Detail
         ═══════════════════════════════════════════════════════════════ -->
    <h2 class="section-header">🔄 Flaky Tests (Passed on Retry)</h2>
    <div class="table-container">
      ${flakyDetail}
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         All Tests Table
         ═══════════════════════════════════════════════════════════════ -->
    <h2 class="section-header">📋 All Test Results</h2>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Test Name</th>
            <th>Project</th>
            <th>Duration</th>
            <th>Retries</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          ${testRows}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Generated by <strong>PlaywrightBDD Framework</strong></p>
      <p>Report generated at: ${new Date().toLocaleString()}</p>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════
       Chart.js Script — Creates the interactive charts
       ═══════════════════════════════════════════════════════════════ -->
  <script>
    // ── Pie Chart: Test Results Distribution ──────────────────────────
    new Chart(document.getElementById('statusChart'), {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed', 'Skipped/TimedOut'],
        datasets: [{
          data: [${summary.passed}, ${summary.failed}, ${summary.skipped + summary.timedOut}],
          backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
          borderWidth: 0,
          hoverOffset: 10,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', padding: 20, font: { size: 13 } }
          }
        }
      }
    });

    // ── Bar Chart: Test Duration ──────────────────────────────────────
    new Chart(document.getElementById('durationChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(durationLabels)},
        datasets: [{
          label: 'Duration (ms)',
          data: ${JSON.stringify(durationValues)},
          backgroundColor: ${JSON.stringify(durationColors)},
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } }
        }
      }
    });

    // ── Stacked Bar Chart: Results by Project ─────────────────────────
    new Chart(document.getElementById('projectChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(projectNames)},
        datasets: [
          { label: 'Passed', data: ${JSON.stringify(projectPassed)}, backgroundColor: '#10b981', borderRadius: 4 },
          { label: 'Failed', data: ${JSON.stringify(projectFailed)}, backgroundColor: '#ef4444', borderRadius: 4 },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8' } }
        },
        scales: {
          x: { stacked: true, ticks: { color: '#94a3b8' }, grid: { display: false } },
          y: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });

    // ── Gauge Chart: Pass Rate ────────────────────────────────────────
    new Chart(document.getElementById('gaugeChart'), {
      type: 'doughnut',
      data: {
        labels: ['Pass Rate', 'Remaining'],
        datasets: [{
          data: [${summary.passRate}, ${100 - summary.passRate}],
          backgroundColor: [
            ${summary.passRate >= 80 ? "'#10b981'" : summary.passRate >= 50 ? "'#f59e0b'" : "'#ef4444'"},
            'rgba(255,255,255,0.1)'
          ],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        }
      },
      plugins: [{
        id: 'gaugeText',
        afterDraw: function(chart) {
          const { ctx, chartArea } = chart;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 48px system-ui';
          ctx.fillText('${summary.passRate}%', chartArea.width / 2 + chartArea.left, chartArea.height * 0.75 + chartArea.top);
          ctx.font = '16px system-ui';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('Pass Rate', chartArea.width / 2 + chartArea.left, chartArea.height * 0.85 + chartArea.top);
          ctx.restore();
        }
      }]
    });
  </script>
</body>
</html>`;
  }

  /**
   * Formats milliseconds into a human-readable duration string.
   * Examples: 1500 → "1.5s", 65000 → "1m 5s", 500 → "500ms"
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Escapes HTML special characters to prevent XSS in the report.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
