/**
 * sensor-log.ts
 *
 * Appends one daily record to the BHEM Sensor Log.
 *
 * The Sensor Log is the authoritative historical record
 * for all analytics performed by BHEM.
 *
 * One record is written per day.
 */

export interface SensorLogRecord {
  // System
  recordDate: string;
  dayOfWeek: string;
  billingCycle: string;

  // Weather
  outdoorHigh: number;
  outdoorAverage: number;

  // APS
  dailyKWh: number;
  apsPeak4to7: number;
  billingCyclePeak: number;

  // HVAC
  frontRuntimeMinutes: number;
  hallRuntimeMinutes: number;

  // Strategy Flags
  coolDownEnabled: boolean;
  jackeryUsed: boolean;
  teslaCharged: boolean;

  // AI
  notes?: string;
}

export async function appendSensorLog(
  record: SensorLogRecord
) {

}