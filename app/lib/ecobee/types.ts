/**
 * LCARS BHEM
 * Ecobee Import Types
 *
 * Purpose:
 * Defines the normalized Ecobee record used throughout BHEM.
 *
 * Author: Brent Barksdale & ChatGPT
 */

export interface EcobeeRecord {
  timestamp: Date;

  thermostat: string;

  indoorTemp: number;

  outdoorTemp: number;

  coolRuntimeSeconds: number;

  fanRuntimeSeconds: number;

  humidity: number;

  setpoint: number;

  hvacMode: string;

  program: string;

  event: string | null;
}