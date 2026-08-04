import { getHomeState } from "./homeState";

export function getAIRecommendation() {
  const state = getHomeState();

  if (state.currentDemand > 8) {
    return {
      level: "warning",
      title: "HIGH POWER DEMAND",
      message:
        "Delay high-power appliances until after 7 PM to reduce APS demand charges.",
    };
  }

  if (state.outsideTemp > 110) {
    return {
      level: "info",
      title: "EXTREME HEAT",
      message:
        "Outside temperatures are very high. Keeping doors closed will reduce HVAC runtime.",
    };
  }

  return {
    level: "normal",
    title: "SYSTEM OPTIMAL",
    message:
      "No action required. Home systems are operating efficiently.",
    };
}