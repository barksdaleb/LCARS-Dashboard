import energy from "../../data/energy.json";

export interface HomeState {
  currentDemand: number;
  todayUsage: number;
  dayPeakDemand: number;

  outsideTemp: number;
  poolTemp: number;

  houseStatus: string;

  aiHeadline: string;
  aiRecommendation: string;
}

export function getHomeState(): HomeState {

  const demand = energy.energy.currentDemand;

  let houseStatus = "🟢 NORMAL";

  if (demand > 8) {
    houseStatus = "🔴 HIGH DEMAND";
  } else if (demand > 6) {
    houseStatus = "🟡 ELEVATED";
  }

  return {

    currentDemand: demand,

    todayUsage: energy.energy.today,

    dayPeakDemand: energy.energy.dayPeakDemand,

    outsideTemp: energy.systems.weather.temperature,

    poolTemp: 87,

    houseStatus,

    aiHeadline:
      "Everything is operating normally.",

    aiRecommendation:
      "Safe to use high-load appliances at this time.",

  };

}