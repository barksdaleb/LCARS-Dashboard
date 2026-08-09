/**
 * ============================================================================
 * BHEM Collector Interface
 * ============================================================================
 *
 * Every external system (APS, Weather, Jackery, Tesla, etc.)
 * implements this interface.
 *
 * A Collector has one responsibility:
 * Collect raw data and persist it to the Historical Store.
 *
 * Collectors DO NOT:
 *   - Perform analytics
 *   - Make recommendations
 *   - Update the dashboard
 *   - Modify existing history
 *
 * They only observe and record.
 * ============================================================================
 */

export interface Collector {
  /** Human-readable collector name */
  readonly name: string;

  /** Is this collector currently available? */
  isAvailable(): Promise<boolean>;

  /** Collect one snapshot of data */
  collect(): Promise<void>;
}