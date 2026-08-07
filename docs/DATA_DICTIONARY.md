# BHEM Data Dictionary

## Purpose

The BHEM Data Dictionary defines every field collected by the Barksdale Home Energy Manager (BHEM).

The goal is to ensure every value has:

- A clear definition
- A known source
- A unit of measure
- A documented purpose

This document is the authoritative reference for the Sensor Log.

---

# Sensor Log

One record is created for each day.

---

## RecordDate

**Description**

The date represented by the Sensor Log record.

**Format**

YYYY-MM-DD

**Source**

System

**Example**

2026-08-06

---

## DayOfWeek

**Description**

Day of the week.

**Example**

Thursday

**Source**

System

---

## BillingCycle

**Description**

APS billing cycle the record belongs to.

**Example**

2026-07

**Source**

APS

---

# Weather

## OutdoorHigh

Highest outdoor temperature.

**Units**

°F

**Source**

ecobee (preferred) or Weather API

---

## OutdoorAverage

Average outdoor temperature.

**Units**

°F

**Source**

ecobee

---

## Outdoor2PM

Outdoor temperature at 2:00 PM.

**Units**

°F

**Source**

ecobee

---

## Outdoor3PM

Outdoor temperature at 3:00 PM.

**Units**

°F

**Source**

ecobee

---

## Outdoor4PM

Outdoor temperature at 4:00 PM.

**Units**

°F

**Source**

ecobee

---

## Outdoor5PM

Outdoor temperature at 5:00 PM.

**Units**

°F

**Source**

ecobee

---

## Outdoor6PM

Outdoor temperature at 6:00 PM.

**Units**

°F

**Source**

ecobee

---

## Outdoor7PM

Outdoor temperature at 7:00 PM.

**Units**

°F

**Source**

ecobee

---

# HVAC

## FrontRuntime2to4

Front HVAC compressor runtime between 2 PM and 4 PM.

**Units**

Minutes

**Source**

ecobee

---

## FrontRuntime4to7

Front HVAC compressor runtime between 4 PM and 7 PM.

**Units**

Minutes

**Source**

ecobee

---

## HallRuntime2to4

Hall HVAC compressor runtime between 2 PM and 4 PM.

**Units**

Minutes

**Source**

ecobee

---

## HallRuntime4to7

Hall HVAC compressor runtime between 4 PM and 7 PM.

**Units**

Minutes

**Source**

ecobee

---

# APS

## DailykWh

Total electrical usage for the day.

**Units**

kWh

**Source**

APS

---

## APSPeak4to7

Highest electrical demand recorded during the APS on-peak window (4 PM–7 PM).

**Units**

kW

**Source**

APS

---

## BillingCyclePeak

Highest electrical demand recorded during the current APS billing cycle.

**Units**

kW

**Source**

APS

---

# Strategy Flags

## CoolDownEnabled

Indicates whether the ecobee pre-cooling strategy was active.

**Values**

Yes / No

---

## JackeryUsed

Indicates whether the Jackery supplied household loads during APS peak hours.

**Values**

Yes / No

---

## TeslaCharging

Indicates whether the Tesla charged during the day.

**Values**

Yes / No

---

## GarageMiniSplit

Indicates whether the garage mini-split was enabled during the APS peak period.

**Values**

On / Off

---

## CookingDuringPeak

Indicates whether major cooking appliances were used during APS peak hours.

**Values**

Yes / No

---

# AI Analysis

## EstimatedSavings

AI estimate of the daily savings produced by the active strategies.

**Units**

USD

---

## Confidence

AI confidence in the Estimated Savings.

**Units**

Percentage

---

## Notes

Additional observations or special events.

**Examples**

- Guests visiting
- Power outage
- Pool party
- HVAC maintenance
- Testing new strategy