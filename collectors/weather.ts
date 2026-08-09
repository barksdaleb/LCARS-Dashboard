import { Collector } from "./collector";
import { HistoryWriter } from "@/app/lib/history/writer";

export class WeatherCollector implements Collector {

  readonly name = "Weather";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async collect(): Promise<void> {

    const lat = 33.3062;
    const lon = -111.8413;

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}` +
      `&longitude=${lon}` +
      `&current=temperature_2m` +
      `&temperature_unit=fahrenheit`
    );

    const weather = await response.json();

    HistoryWriter.append(
      "weather",
      "telemetry",
      {
        timestamp: new Date().toISOString(),
        outsideTemp: weather.current.temperature_2m,
      }
    );
  }
}