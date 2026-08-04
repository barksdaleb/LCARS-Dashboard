import axios from "axios";
import fs from "fs";

export async function updateWeather() {
  const latitude = 33.6839;
  const longitude = -112.074;

  const url =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${latitude}` +
  `&longitude=${longitude}` +
  `&current=temperature_2m` +
  `&temperature_unit=fahrenheit`;

  const response = await axios.get(url);

  const temperature = Math.round(
    response.data.current.temperature_2m
  );

  const energy = JSON.parse(
    fs.readFileSync("data/energy.json", "utf8")
  );

  energy.systems.weather.temperature = temperature;

  fs.writeFileSync(
    "data/energy.json",
    JSON.stringify(energy, null, 2)
  );

  console.log(`Weather updated: ${temperature}°`);
}

