const BASE_URL = "https://api.openweathermap.org";

// OpenWeather's forecast endpoint wants lat/lon, not a zip code directly,
// so we look up coordinates first via their Geocoding API.
export async function getCoordsForZip(zip) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `${BASE_URL}/geo/1.0/zip?zip=${zip},US&appid=${apiKey}`;

  const res = await fetch(url);

  if (res.status === 404) {
    return null; // zip code not recognized
  }
  if (!res.ok) {
    throw new Error(`Geocoding request failed with status ${res.status}`);
  }

  const data = await res.json();
  return { lat: data.lat, lon: data.lon, name: data.name };
}

// 5 day / 3 hour forecast for a given coordinate pair.
export async function getForecast(lat, lon) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Forecast request failed with status ${res.status}`);
  }

  return res.json();
}

// entry.dt is a UTC unix timestamp (seconds). The forecast is for the zip
// code's location, which may not match the viewer's own browser timezone,
// so we shift by the location's UTC offset (city.timezone, also in seconds)
// before reading day/hour back out. Using the UTC getters afterward stops
// the browser from applying a second, local shift on top.
export function shiftToLocationTime(dt, timezoneOffsetSeconds) {
  return new Date((dt + timezoneOffsetSeconds) * 1000);
}

// The API returns a flat list of 40 entries (5 days x 8 three-hour slots).
// Group them by the zip code's local calendar date so the page can render
// one section per day.
export function groupForecastByDay(forecastList, timezoneOffsetSeconds) {
  const byDate = new Map();

  for (const entry of forecastList) {
    const localDate = shiftToLocationTime(entry.dt, timezoneOffsetSeconds);
    const dateKey = localDate.toISOString().slice(0, 10); // YYYY-MM-DD

    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, []);
    }
    byDate.get(dateKey).push(entry);
  }

  return Array.from(byDate, ([date, entries]) => ({ date, entries }));
}

export function formatDayHeading(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatSlotTime(dt, timezoneOffsetSeconds) {
  return shiftToLocationTime(dt, timezoneOffsetSeconds).toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit",
  });
}
