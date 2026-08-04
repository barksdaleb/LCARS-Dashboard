export function isWeekday(date: Date): boolean {
  const day = date.getDay();

  // Sunday = 0
  // Saturday = 6

  return day >= 1 && day <= 5;
}

export function isOnPeak(date: Date): boolean {
  if (!isWeekday(date)) return false;

  const hour = date.getHours();

  // APS Demand Window
  // 4:00 PM - 6:59 PM

  return hour >= 16 && hour < 19;
}

export function getAPSStatus(date: Date) {
  const onPeak = isOnPeak(date);

  return {
    status: onPeak ? "ON PEAK" : "OFF PEAK",
    isPeak: onPeak,
    color: onPeak ? "text-red-400" : "text-green-400",
    nextChange: nextOnPeakWindow(date),
  };
}

export function nextOnPeakWindow(date: Date): string {
  if (isOnPeak(date)) {
    return "7:00 PM";
  }

  const tomorrow = new Date(date);

  tomorrow.setDate(date.getDate() + 1);

  return "Tomorrow 4:00 PM";
}