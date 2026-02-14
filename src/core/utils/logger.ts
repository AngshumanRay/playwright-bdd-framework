/**
 * ============================================================================
 * 📁 logger.ts — Framework Logger
 * ============================================================================
 *
 * PURPOSE:
 * Provides structured, color-coded logging throughout the test framework.
 * Instead of using bare `console.log()` everywhere (which creates messy output),
 * this logger:
 *   - Adds timestamps so you know WHEN something happened
 *   - Color-codes by severity (INFO=blue, WARN=yellow, ERROR=red)
 *   - Labels each log with a "context" so you know WHERE it came from
 *   - Can be turned on/off globally
 *
 * FOR BEGINNERS:
 * When your tests run, you'll see clean output like:
 *   [2026-02-14 10:30:15] [INFO] [LoginPage] Navigating to login page
 *   [2026-02-14 10:30:16] [INFO] [LoginPage] Filling username: standard_user
 *   [2026-02-14 10:30:17] [ERROR] [LoginPage] Element not found: #login-button
 *
 * This makes debugging MUCH easier than hunting through raw console output.
 * ============================================================================
 */

/**
 * ANSI color codes for terminal output.
 * These special character sequences tell the terminal to change text color.
 * You don't need to understand these — just know they make the output colorful.
 */
const COLORS = {
  reset: '\x1b[0m',      // Returns text to default color
  red: '\x1b[31m',       // For errors — something went WRONG
  yellow: '\x1b[33m',    // For warnings — something MIGHT be wrong
  blue: '\x1b[34m',      // For info — normal operational messages
  green: '\x1b[32m',     // For success — something went RIGHT
  cyan: '\x1b[36m',      // For debug — detailed technical info
  gray: '\x1b[90m',      // For timestamps and metadata
  magenta: '\x1b[35m',   // For step actions — BDD step execution
} as const;

/** The severity levels available for logging, from most to least severe */
type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'STEP';

/**
 * Creates a formatted timestamp string for the current moment.
 *
 * @returns A string like "2026-02-14 10:30:15"
 */
function getTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Returns the appropriate color code for each log level.
 */
function getColorForLevel(level: LogLevel): string {
  const colorMap: Record<LogLevel, string> = {
    ERROR: COLORS.red,
    WARN: COLORS.yellow,
    INFO: COLORS.blue,
    DEBUG: COLORS.cyan,
    STEP: COLORS.magenta,
  };
  return colorMap[level];
}

/**
 * The Logger class — your framework's voice.
 *
 * USAGE:
 *   // Create a logger for a specific part of your code:
 *   const log = new Logger('LoginPage');
 *
 *   // Use it:
 *   log.info('Navigating to login page');
 *   log.warn('Login button took longer than expected');
 *   log.error('Login button not found!');
 *   log.debug('Button selector: #login-button');
 *   log.step('Given I am on the login page');
 */
export class Logger {
  /** The name of the component using this logger (e.g., 'LoginPage', 'APIClient') */
  private context: string;

  /** Whether logging is enabled. Set to false to silence all output. */
  private static enabled: boolean = true;

  /**
   * Creates a new Logger instance.
   *
   * @param context - A label identifying where logs come from (e.g., 'LoginPage')
   *
   * EXAMPLE:
   *   const log = new Logger('MyPage');
   *   log.info('Hello!');
   *   // Output: [2026-02-14 10:30:15] [INFO] [MyPage] Hello!
   */
  constructor(context: string) {
    this.context = context;
  }

  /**
   * Turns logging on or off globally.
   * Useful when running tests in CI where you want less noise.
   */
  static setEnabled(enabled: boolean): void {
    Logger.enabled = enabled;
  }

  /**
   * The core logging method. All other methods (info, warn, etc.) call this.
   *
   * @param level - The severity level (ERROR, WARN, INFO, DEBUG, STEP)
   * @param message - The main message to log
   * @param data - Optional extra data to include (objects, arrays, etc.)
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // If logging is disabled, do nothing
    if (!Logger.enabled) return;

    // Build the formatted log line with colors
    const color = getColorForLevel(level);
    const timestamp = `${COLORS.gray}[${getTimestamp()}]${COLORS.reset}`;
    const levelTag = `${color}[${level}]${COLORS.reset}`;
    const contextTag = `${COLORS.green}[${this.context}]${COLORS.reset}`;
    const formattedMessage = `${timestamp} ${levelTag} ${contextTag} ${message}`;

    // Print to the appropriate console method
    if (level === 'ERROR') {
      console.error(formattedMessage);
    } else if (level === 'WARN') {
      console.warn(formattedMessage);
    } else {
      console.log(formattedMessage);
    }

    // If extra data was provided, print it too (formatted nicely)
    if (data !== undefined) {
      console.log(`${COLORS.gray}  └─ Data: ${JSON.stringify(data, null, 2)}${COLORS.reset}`);
    }
  }

  /** Log an informational message — normal operations */
  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  /** Log a warning — something unexpected but not fatal */
  warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  /** Log an error — something went wrong */
  error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }

  /** Log debug info — very detailed technical information */
  debug(message: string, data?: any): void {
    this.log('DEBUG', message, data);
  }

  /** Log a BDD step — used when executing Given/When/Then steps */
  step(message: string, data?: any): void {
    this.log('STEP', `▶ ${message}`, data);
  }

  /**
   * Creates a separator line in the logs for visual grouping.
   * Useful at the start/end of test scenarios.
   *
   * @param title - Optional title to center in the separator
   *
   * EXAMPLE:
   *   log.separator('Login Test Starting');
   *   // Output: ════════════ Login Test Starting ════════════
   */
  separator(title?: string): void {
    if (!Logger.enabled) return;
    const line = '═'.repeat(60);
    if (title) {
      const padding = Math.max(0, Math.floor((60 - title.length - 2) / 2));
      const paddedTitle = '═'.repeat(padding) + ` ${title} ` + '═'.repeat(padding);
      console.log(`${COLORS.gray}${paddedTitle}${COLORS.reset}`);
    } else {
      console.log(`${COLORS.gray}${line}${COLORS.reset}`);
    }
  }
}
