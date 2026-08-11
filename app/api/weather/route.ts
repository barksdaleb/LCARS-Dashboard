import { WeatherCollector } from "@/collectors/weather";

export async function GET() {

console.log("TEST ENV:", process.env.WATERGURU_EMAIL);
console.log(
  "TEST PASSWORD:",
  process.env.WATERGURU_PASSWORD ? "***FOUND***" : "MISSING"
);


  const lat = 33.3062;
  const lon = -111.8413;

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}` +
    `&longitude=${lon}` +
    `&current=temperature_2m` +
    `&temperature_unit=fahrenheit`;

  const response = await fetch(url, {
    next: { revalidate: 300 },
  });

  const weather = await response.json();

  const collector = new WeatherCollector();
  await collector.collect();

  return Response.json({
    outsideTemp: weather.current.temperature_2m,
  });
}