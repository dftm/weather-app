const BASE_URL = "https://api.openweathermap.org";

// Typed error for upstream/config failures. Messages never include the
// request URL (which contains the API key).
// code: "config" (missing key), "http" (non-OK upstream status),
// "timeout" (no response within FETCH_TIMEOUT_MS), "network" (fetch rejected),
// "bad_response" (body unreadable, malformed JSON or missing fields).
export class OpenWeatherError extends Error {
  constructor(message, { status = null, code = "http" } = {}) {
    super(message);
    this.name = "OpenWeatherError";
    this.status = status;
    this.code = code;
  }
}

const FETCH_TIMEOUT_MS = 5000;

async function owFetch(url, revalidate) {
  try {
    return await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate },
    });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    throw new OpenWeatherError(
      timedOut ? "OpenWeather request timed out" : "OpenWeather request failed",
      { code: timedOut ? "timeout" : "network" },
    );
  }
}

// Read and parse the JSON body. The abort signal also covers the body read, so
// a stalled body surfaces here as TimeoutError; map everything to typed errors.
async function readJson(res) {
  try {
    return await res.json();
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new OpenWeatherError("OpenWeather response timed out", { code: "timeout" });
    }
    throw new OpenWeatherError("OpenWeather returned an unreadable response", {
      code: "bad_response",
    });
  }
}

function badResponse() {
  return new OpenWeatherError("OpenWeather returned an unexpected response", {
    code: "bad_response",
  });
}

// Copy for upstream failures, shared by the page. (error.js cannot use this:
// Next strips server error messages in production.)
export function describeUpstreamError(error) {
  if (error?.status === 429) {
    return {
      title: "Service busy",
      message: "The weather service is receiving too many requests. Please try again in a minute.",
    };
  }
  return {
    title: "Forecast unavailable",
    message: "We couldn\u2019t load the forecast right now. Please try again later.",
  };
}

function requireApiKey() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new OpenWeatherError("OPENWEATHER_API_KEY is not set", { code: "config" });
  }
  return apiKey;
}

// OpenWeather's forecast endpoint wants lat/lon, not a zip code directly,
// so we look up coordinates first via their Geocoding API.
export async function getCoordsForZip(zip) {
  const apiKey = requireApiKey();
  const url = `${BASE_URL}/geo/1.0/zip?zip=${zip},US&appid=${apiKey}`;

  const res = await owFetch(url, 86400); // zip -> coords never changes

  if (res.status === 404) {
    return null; // zip code not recognized
  }
  if (!res.ok) {
    throw new OpenWeatherError(`Geocoding request failed with status ${res.status}`, {
      status: res.status,
    });
  }

  const data = await readJson(res);
  if (!data || typeof data.lat !== "number" || typeof data.lon !== "number") {
    throw badResponse();
  }
  return { lat: data.lat, lon: data.lon, name: data.name };
}

// NOTE (F6): the API key is part of the fetch URL, so it is part of Next's
// server-side Data Cache key. It is never sent to clients; do not enable
// `logging.fetches.fullUrl` in next.config.
// Known limitation: city.timezone is one fixed UTC offset, so a forecast window
// that crosses a DST change shifts labels/grouping by 1h after the change.
// 5 day / 3 hour forecast for a given coordinate pair.
export async function getForecast(lat, lon) {
  const apiKey = requireApiKey();
  const url = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;

  const res = await owFetch(url, 900);

  if (!res.ok) {
    throw new OpenWeatherError(`Forecast request failed with status ${res.status}`, {
      status: res.status,
    });
  }

  const data = await readJson(res);
  if (!data || !Array.isArray(data.list) || typeof data.city?.timezone !== "number") {
    throw badResponse();
  }
  return data;
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

// A full day has 8 three-hour slots; the first and last buckets of the
// forecast window are usually shorter.
export function isPartialDay(entries) {
  return entries.length < 8;
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
