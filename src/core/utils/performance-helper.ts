/**
 * ============================================================================
 * 📁 performance-helper.ts — Performance & Accessibility Metrics Collector
 * ============================================================================
 *
 * PURPOSE:
 * Collects performance metrics (page load times, resource counts, etc.) and
 * accessibility data from web pages during tests. This data feeds into the
 * rich reports with charts, graphs, and benchmarks.
 *
 * WHAT IT MEASURES:
 *   🕐 Performance:
 *      - Page load time (how long until the page is fully loaded)
 *      - DOM Content Loaded time (when the HTML structure is ready)
 *      - First Contentful Paint (when the first visual content appears)
 *      - Largest Contentful Paint (when the biggest element renders)
 *      - Total resource count & size (images, scripts, CSS, etc.)
 *
 *   ♿ Accessibility:
 *      - Missing alt text on images
 *      - Color contrast issues
 *      - Missing ARIA labels
 *      - Heading structure validation
 *
 * FOR BEGINNERS:
 * Performance data tells you "is the app fast enough?"
 * Accessibility data tells you "can everyone use the app, including
 * people using screen readers or who have visual impairments?"
 * ============================================================================
 */

import { Page } from '@playwright/test';
import { Logger } from './logger';

/** Logger for this module */
const log = new Logger('Performance');

/**
 * Holds all the performance numbers collected from a page.
 * Each field is measured in milliseconds unless otherwise noted.
 */
export interface PerformanceMetrics {
  /** Full URL of the page measured */
  url: string;
  /** When the measurement was taken */
  timestamp: string;

  // ─── Navigation Timing ─────────────────────────────────────────────
  /** Time from navigation start to DOM Content Loaded event (ms) */
  domContentLoaded: number;
  /** Time from navigation start to full page load (ms) */
  pageLoadTime: number;
  /** Time the server took to send back the first byte (ms) */
  timeToFirstByte: number;

  // ─── Resource Metrics ──────────────────────────────────────────────
  /** Total number of resources loaded (scripts, images, CSS, etc.) */
  totalResources: number;
  /** Total size of all resources in kilobytes */
  totalResourceSizeKB: number;

  // ─── Web Vitals (Modern Performance Indicators) ────────────────────
  /** First Contentful Paint — when the first text/image appears (ms) */
  firstContentfulPaint: number | null;
  /** Largest Contentful Paint — when the biggest element renders (ms) */
  largestContentfulPaint: number | null;
}

/**
 * Holds accessibility scan results for a page.
 */
export interface AccessibilityResult {
  /** Full URL of the page scanned */
  url: string;
  /** When the scan was performed */
  timestamp: string;
  /** Total number of issues found */
  totalIssues: number;
  /** Breakdown of issues by severity */
  issuesByCategory: {
    /** Missing alt text on images */
    missingAltText: number;
    /** Missing ARIA labels on interactive elements */
    missingAriaLabels: number;
    /** Empty links or buttons */
    emptyInteractiveElements: number;
    /** Heading hierarchy problems (e.g., h1 followed by h3) */
    headingIssues: number;
    /** Missing form labels */
    missingFormLabels: number;
  };
  /** Detailed list of each issue found */
  issues: AccessibilityIssue[];
}

/**
 * A single accessibility issue found on the page.
 */
export interface AccessibilityIssue {
  /** What type of issue this is */
  category: string;
  /** The HTML element that has the issue */
  element: string;
  /** A human-readable description of what's wrong */
  description: string;
  /** How severe the issue is */
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
}

/**
 * Collects performance metrics from the current page.
 *
 * HOW IT WORKS:
 * It uses the browser's built-in Performance API (window.performance) to
 * get timing data. This is the same API that Chrome DevTools uses when
 * you look at the "Performance" tab.
 *
 * @param page - The Playwright Page to measure
 * @returns A PerformanceMetrics object with all the numbers
 *
 * USAGE:
 *   const metrics = await collectPerformanceMetrics(page);
 *   console.log(`Page loaded in ${metrics.pageLoadTime}ms`);
 */
export async function collectPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  log.info(`Collecting performance metrics for: ${page.url()}`);

  // ── Use the browser's Performance API to get timing data ──────────
  const timing = await page.evaluate(() => {
    const perf = window.performance;
    const navigation = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = perf.getEntriesByType('resource') as PerformanceResourceTiming[];

    // Calculate total resource size (in bytes, converted to KB later)
    const totalResourceSize = resources.reduce(
      (sum, r) => sum + (r.transferSize || 0),
      0,
    );

    // Get First Contentful Paint (if available)
    const paintEntries = perf.getEntriesByType('paint');
    const fcp = paintEntries.find((e) => e.name === 'first-contentful-paint');

    return {
      domContentLoaded: navigation
        ? navigation.domContentLoadedEventEnd - navigation.startTime
        : 0,
      pageLoadTime: navigation
        ? navigation.loadEventEnd - navigation.startTime
        : 0,
      timeToFirstByte: navigation
        ? navigation.responseStart - navigation.requestStart
        : 0,
      totalResources: resources.length,
      totalResourceSizeKB: Math.round(totalResourceSize / 1024),
      firstContentfulPaint: fcp ? fcp.startTime : null,
    };
  });

  // ── Try to get Largest Contentful Paint ────────────────────────────
  // LCP requires a special PerformanceObserver, so we handle it separately
  let lcp: number | null = null;
  try {
    lcp = await page.evaluate(() => {
      return new Promise<number | null>((resolve) => {
        // If the observer API isn't available, return null
        if (!('PerformanceObserver' in window)) {
          resolve(null);
          return;
        }
        const observer = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry ? lastEntry.startTime : null);
          observer.disconnect();
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        // Timeout after 3 seconds if no LCP data is available
        setTimeout(() => resolve(null), 3000);
      });
    });
  } catch {
    log.debug('LCP measurement not available for this page.');
  }

  const metrics: PerformanceMetrics = {
    url: page.url(),
    timestamp: new Date().toISOString(),
    domContentLoaded: Math.round(timing.domContentLoaded),
    pageLoadTime: Math.round(timing.pageLoadTime),
    timeToFirstByte: Math.round(timing.timeToFirstByte),
    totalResources: timing.totalResources,
    totalResourceSizeKB: timing.totalResourceSizeKB,
    firstContentfulPaint: timing.firstContentfulPaint
      ? Math.round(timing.firstContentfulPaint)
      : null,
    largestContentfulPaint: lcp ? Math.round(lcp) : null,
  };

  log.info(`Performance: Load=${metrics.pageLoadTime}ms, TTFB=${metrics.timeToFirstByte}ms, ` +
    `FCP=${metrics.firstContentfulPaint ?? 'N/A'}ms, Resources=${metrics.totalResources}`);

  return metrics;
}

/**
 * Performs a basic accessibility scan on the current page.
 *
 * NOTE: This is NOT a replacement for proper tools like Axe or Lighthouse.
 * It catches common issues quickly during test runs. For full compliance
 * testing, use dedicated accessibility tools.
 *
 * @param page - The Playwright Page to scan
 * @returns An AccessibilityResult with all found issues
 *
 * USAGE:
 *   const a11y = await runAccessibilityCheck(page);
 *   console.log(`Found ${a11y.totalIssues} accessibility issues`);
 */
export async function runAccessibilityCheck(page: Page): Promise<AccessibilityResult> {
  log.info(`Running accessibility check on: ${page.url()}`);

  const issues: AccessibilityIssue[] = await page.evaluate(() => {
    const found: AccessibilityIssue[] = [];

    // ── Check 1: Images without alt text ──────────────────────────────
    document.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('alt') || img.getAttribute('alt')?.trim() === '') {
        found.push({
          category: 'missingAltText',
          element: img.outerHTML.substring(0, 100),
          description: 'Image is missing alt text, making it invisible to screen readers.',
          severity: 'serious',
        });
      }
    });

    // ── Check 2: Interactive elements without ARIA labels ─────────────
    document.querySelectorAll('button, [role="button"]').forEach((btn) => {
      const hasText = btn.textContent?.trim();
      const hasAriaLabel = btn.getAttribute('aria-label');
      const hasAriaLabelledBy = btn.getAttribute('aria-labelledby');
      if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
        found.push({
          category: 'missingAriaLabels',
          element: btn.outerHTML.substring(0, 100),
          description: 'Button has no text or ARIA label.',
          severity: 'critical',
        });
      }
    });

    // ── Check 3: Empty links ──────────────────────────────────────────
    document.querySelectorAll('a').forEach((link) => {
      const hasText = link.textContent?.trim();
      const hasAriaLabel = link.getAttribute('aria-label');
      if (!hasText && !hasAriaLabel) {
        found.push({
          category: 'emptyInteractiveElements',
          element: link.outerHTML.substring(0, 100),
          description: 'Link has no text or ARIA label.',
          severity: 'serious',
        });
      }
    });

    // ── Check 4: Form inputs without labels ───────────────────────────
    document.querySelectorAll('input, select, textarea').forEach((input) => {
      const id = input.getAttribute('id');
      const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : false;
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
      const hasPlaceholder = input.getAttribute('placeholder');
      const inputType = input.getAttribute('type');

      // Skip hidden inputs and submit buttons
      if (inputType === 'hidden' || inputType === 'submit') return;

      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasPlaceholder) {
        found.push({
          category: 'missingFormLabels',
          element: input.outerHTML.substring(0, 100),
          description: 'Form input has no associated label.',
          severity: 'serious',
        });
      }
    });

    // ── Check 5: Heading hierarchy ────────────────────────────────────
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1 && lastLevel > 0) {
        found.push({
          category: 'headingIssues',
          element: `<${heading.tagName.toLowerCase()}>${heading.textContent?.substring(0, 50)}</${heading.tagName.toLowerCase()}>`,
          description: `Heading level skipped: jumped from h${lastLevel} to h${level}.`,
          severity: 'moderate',
        });
      }
      lastLevel = level;
    });

    return found;
  });

  // ── Categorize the issues ──────────────────────────────────────────
  const result: AccessibilityResult = {
    url: page.url(),
    timestamp: new Date().toISOString(),
    totalIssues: issues.length,
    issuesByCategory: {
      missingAltText: issues.filter((i) => i.category === 'missingAltText').length,
      missingAriaLabels: issues.filter((i) => i.category === 'missingAriaLabels').length,
      emptyInteractiveElements: issues.filter((i) => i.category === 'emptyInteractiveElements').length,
      headingIssues: issues.filter((i) => i.category === 'headingIssues').length,
      missingFormLabels: issues.filter((i) => i.category === 'missingFormLabels').length,
    },
    issues,
  };

  if (result.totalIssues > 0) {
    log.warn(`Accessibility: Found ${result.totalIssues} issues on ${page.url()}`);
  } else {
    log.info(`Accessibility: No issues found on ${page.url()} ✅`);
  }

  return result;
}
