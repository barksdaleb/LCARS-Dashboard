/**
 * ============================================================================
 * Jackery Collector
 * ============================================================================
 *
 * Purpose
 * -------
 * Collect telemetry from the Jackery Explorer 1000 Plus and persist it into
 * BHEM's Historical Store.
 *
 * This collector NEVER performs analytics or recommendations.
 * It only observes and records.
 *
 * Initial Collection Targets
 * --------------------------
 * • Battery State of Charge (%)
 * • AC Input Watts
 * • AC Output Watts
 * • Solar Input Watts
 * • Current Load
 * • Estimated Runtime
 * • Error Codes
 * • Device Online Status
 *
 * Future Collection Targets
 * -------------------------
 * • Battery Temperature
 * • Charge Cycles
 * • Battery Health
 * • Solar Panel Production
 * • Grid Charging Events
 *
 * 
 * Data Destination
----------------
data/history/jackery/

Streams
-------
telemetry.csv
events.csv
errors.csv

 *
 * Philosophy
 * ----------
 * Observe → Record → Analyze → Recommend
 *
 * Collectors only perform the first two steps.
 * Analytics and recommendations belong elsewhere.
 * ============================================================================
 */