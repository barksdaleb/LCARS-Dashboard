export async function GET() {
  const lat = 33.3062;
  const lon = -111.8413;

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}` +
    `&longitude=${lon}` +
    `&current=temperature_2m` +
    `&temperature_unit=fahrenheit`;

  const response = await fetch(url, {
    next: { revalidate: 300 }, // cache for 5 minutes
  });

  const weather = await response.json();

  return Response.json({
    outsideTemp: weather.current.temperature_2m,
  });
}