/**
 * ============================================================================
 * 📁 metrics-collector.ts — Test Metrics Aggregator
 * ============================================================================
 *
 * PURPOSE:
 * Collects and aggregates metrics from ALL test runs into a single summary.
 * This data powers the charts, graphs, and dashboards in the final report.
 *
 * WHAT IT TRACKS:
 *   📊 Test Execution Metrics:
 *      - Pass/fail/skip counts and percentages
 *      - Total execution time
 *      - Average test duration
 *      - Slowest/fastest tests
 *
 *   🔧 Observability Metrics:
 *      - Flaky test detection (tests that pass on retry)
 *      - Auto-heal activations
 *      - Resource usage patterns
 *
 *   📈 Performance Benchmarks:
 *      - Page load time averages
 *      - API response time averages
 *      - Comparison against thresholds
 *
 * FOR BEGINNERS:
 * This is like a "scorecard" for your test suite. After all tests run, it
 * tells you: "90% passed, 5% failed, 5% skipped. Average test took 3.2s.
 * Your login page loads in 1.5s (under the 3s threshold ✅)."
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { PerformanceMetrics, AccessibilityResult } from './performance-helper';

/** Logger for this module */
const log = new Logger('MetricsCollector');

/**
 * A single test result record.
 */
export interface TestResult {
  /** Name of the test/scenario */
  name: string;
  /** Feature file this test belongs to */
  feature: string;
  /** Whether the test passed, failed, or was skipped */
  status: 'passed' | 'failed' | 'skipped';
  /** How long the test took to run (in ms) */
  duration: number;
  /** If failed, the error message */
  errorMessage?: string;
  /** Tags applied to this scenario (@smoke, @api, etc.) */
  tags: string[];
  /** The browser used (chromium, firefox, webkit) */
  browser: string;
  /** If the test passed on a retry (indicates flakiness) */
  wasRetried: boolean;
  /** Number of auto-heal activations during this test */
  autoHealCount: number;
}

/**
 * The final aggregated metrics summary.
 * This is what gets written to JSON and rendered in reports.
 */
export interface MetricsSummary {
  /** When the test run started */
  runStartTime: string;
  /** When the test run ended */
  runEndTime: string;
  /** Total execution time (ms) */
  totalDuration: number;

  // ─── Counts ────────────────────────────────────────────────────────
  /** Total number of tests executed */
  totalTests: number;
  /** Number of tests that passed */
  passed: number;
  /** Number of tests that failed */
  failed: number;
  /** Number of tests that were skipped */
  skipped: number;
  /** Pass rate as a percentage (e.g., 85.5) */
  passRate: number;

  // ─── Timing ────────────────────────────────────────────────────────
  /** Average test duration (ms) */
  averageDuration: number;
  /** The slowest test */
  slowestTest: { name: string; duration: number } | null;
  /** The fastest test */
  fastestTest: { name: string; duration: number } | null;

  // ─── Quality Indicators ────────────────────────────────────────────
  /** Number of tests that were flaky (passed on retry) */
  flakyTests: number;
  /** Total auto-heal activations across all tests */
  totalAutoHeals: number;

  // ─── Performance Benchmarks ────────────────────────────────────────
  /** Average page load time across all measured pages (ms) */
  avgPageLoadTime: number | null;
  /** Average API response time across all API calls (ms) */
  avgApiResponseTime: number | null;
  /** Performance data for individual pages */
  performanceData: PerformanceMetrics[];
  /** Accessibility scan results */
  accessibilityData: AccessibilityResult[];

  // ─── Breakdown ─────────────────────────────────────────────────────
  /** Results grouped by feature file */
  byFeature: Record<string, { passed: number; failed: number; skipped: number }>;
  /** Results grouped by browser */
  byBrowser: Record<string, { passed: number; failed: number; skipped: number }>;
  /** Results grouped by tag */
  byTag: Record<string, { passed: number; failed: number; skipped: number }>;

  /** Failed test details for the report */
  failedTests: Array<{ name: string; feature: string; error: string }>;
}

/**
 * The MetricsCollector singleton.
 * Only ONE instance exists across the entire test run.
 * All tests add their results to this single collector.
 *
 * USAGE:
 *   // At the end of each test (in hooks):
 *   MetricsCollector.getInstance().addTestResult({ ... });
 *
 *   // At the very end of the run (in global teardown):
 *   MetricsCollector.getInstance().generateSummary();
 *   MetricsCollector.getInstance().saveToFile('metrics.json');
 */
export class MetricsCollector {
  /** The single instance (Singleton Pattern) */
  private static instance: MetricsCollector;

  /** All test results collected so far */
  private results: TestResult[] = [];

  /** All performance measurements collected */
  private performanceData: PerformanceMetrics[] = [];

  /** All accessibility scan results */
  private accessibilityData: AccessibilityResult[] = [];

  /** API response times collected during the run */
  private apiResponseTimes: number[] = [];

  /** When the test run started */
  private runStartTime: Date;

  /**
   * Private constructor — use getInstance() instead.
   * (This is the Singleton Pattern — prevents creating multiple instances)
   */
  private constructor() {
    this.runStartTime = new Date();
    log.info('MetricsCollector initialized — tracking test execution metrics');
  }

  /**
   * Gets the single MetricsCollector instance.
   * Creates it on first call, returns the existing one on subsequent calls.
   *
   * WHY SINGLETON?
   * If each test created its own collector, they couldn't aggregate data.
   * The Singleton ensures ALL tests write to the SAME collector.
   */
  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Records the result of a single test.
   * Call this in your AfterScenario hook.
   */
  addTestResult(result: TestResult): void {
    this.results.push(result);
    log.debug(`Recorded result: ${result.status.toUpperCase()} — ${result.name}`);
  }

  /** Records performance metrics from a page. */
  addPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceData.push(metrics);
  }

  /** Records an accessibility scan result. */
  addAccessibilityResult(result: AccessibilityResult): void {
    this.accessibilityData.push(result);
  }

  /** Records an API response time (in ms). */
  addApiResponseTime(duration: number): void {
    this.apiResponseTimes.push(duration);
  }

  /**
   * Generates the final aggregated summary from all collected data.
   * Call this AFTER all tests have finished.
   *
   * @returns A MetricsSummary object with all the aggregated data
   */
  generateSummary(): MetricsSummary {
    const runEndTime = new Date();
    const totalDuration = runEndTime.getTime() - this.runStartTime.getTime();

    // ── Count results by status ──────────────────────────────────────
    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;
    const total = this.results.length;

    // ── Calculate timing stats ───────────────────────────────────────
    const durations = this.results.map((r) => r.duration);
    const avgDuration = total > 0 ? durations.reduce((a, b) => a + b, 0) / total : 0;

    const sortedByDuration = [...this.results].sort((a, b) => b.duration - a.duration);
    const slowest = sortedByDuration[0] || null;
    const fastest = sortedByDuration[sortedByDuration.length - 1] || null;

    // ── Count flaky tests and auto-heals ─────────────────────────────
    const flakyTests = this.results.filter((r) => r.wasRetried).length;
    const totalAutoHeals = this.results.reduce((sum, r) => sum + r.autoHealCount, 0);

    // ── Calculate performance averages ───────────────────────────────
    const avgPageLoad =
      this.performanceData.length > 0
        ? Math.round(
            this.performanceData.reduce((sum, p) => sum + p.pageLoadTime, 0) /
              this.performanceData.length,
          )
        : null;

    const avgApiResponse =
      this.apiResponseTimes.length > 0
        ? Math.round(
            this.apiResponseTimes.reduce((a, b) => a + b, 0) / this.apiResponseTimes.length,
          )
        : null;

    // ── Group results by feature ─────────────────────────────────────
    const byFeature: Record<string, { passed: number; failed: number; skipped: number }> = {};
    this.results.forEach((r) => {
      if (!byFeature[r.feature]) byFeature[r.feature] = { passed: 0, failed: 0, skipped: 0 };
      byFeature[r.feature][r.status]++;
    });

    // ── Group results by browser ─────────────────────────────────────
    const byBrowser: Record<string, { passed: number; failed: number; skipped: number }> = {};
    this.results.forEach((r) => {
      if (!byBrowser[r.browser]) byBrowser[r.browser] = { passed: 0, failed: 0, skipped: 0 };
      byBrowser[r.browser][r.status]++;
    });

    // ── Group results by tag ─────────────────────────────────────────
    const byTag: Record<string, { passed: number; failed: number; skipped: number }> = {};
    this.results.forEach((r) => {
      r.tags.forEach((tag) => {
        if (!byTag[tag]) byTag[tag] = { passed: 0, failed: 0, skipped: 0 };
        byTag[tag][r.status]++;
      });
    });

    // ── Collect failed test details ──────────────────────────────────
    const failedTests = this.results
      .filter((r) => r.status === 'failed')
      .map((r) => ({
        name: r.name,
        feature: r.feature,
        error: r.errorMessage || 'Unknown error',
      }));

    const summary: MetricsSummary = {
      runStartTime: this.runStartTime.toISOString(),
      runEndTime: runEndTime.toISOString(),
      totalDuration,
      totalTests: total,
      passed,
      failed,
      skipped,
      passRate: total > 0 ? Math.round((passed / total) * 10000) / 100 : 0,
      averageDuration: Math.round(avgDuration),
      slowestTest: slowest ? { name: slowest.name, duration: slowest.duration } : null,
      fastestTest: fastest ? { name: fastest.name, duration: fastest.duration } : null,
      flakyTests,
      totalAutoHeals,
      avgPageLoadTime: avgPageLoad,
      avgApiResponseTime: avgApiResponse,
      performanceData: this.performanceData,
      accessibilityData: this.accessibilityData,
      byFeature,
      byBrowser,
      byTag,
      failedTests,
    };

    log.info(`📊 Metrics Summary: ${passed}/${total} passed (${summary.passRate}%)`);
    return summary;
  }

  /**
   * Saves the metrics summary to a JSON file.
   * This file is consumed by the HTML report generator.
   *
   * @param outputPath - Where to save the JSON file
   */
  saveToFile(outputPath: string): void {
    const summary = this.generateSummary();
    const dir = path.dirname(outputPath);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8');
    log.info(`Metrics saved to: ${outputPath}`);
  }

  /**
   * Resets all collected data. Useful between separate test suite runs.
   */
  reset(): void {
    this.results = [];
    this.performanceData = [];
    this.accessibilityData = [];
    this.apiResponseTimes = [];
    this.runStartTime = new Date();
    log.info('MetricsCollector reset');
  }
}
