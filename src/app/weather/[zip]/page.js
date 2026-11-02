import {
  OpenWeatherError,
  describeUpstreamError,
  getCoordsForZip,
  getForecast,
  groupForecastByDay,
  formatDayHeading,
  formatSlotTime,
  isPartialDay,
} from "@/lib/openweather";
import Link from "next/link";
import styles from "./page.module.css";

// Never cache a rendered failure page (transient 429/timeout would otherwise
// be served from the route cache). Unverified without `next build`.
export const dynamic = "force-dynamic";

const ZIP_PATTERN = /^\d{5}$/;

const searchAgain = (
  <p>
    <Link href="/">Search another zip code</Link>
  </p>
);

export default async function WeatherPage({ params }) {
  const { zip } = await params;

  if (!ZIP_PATTERN.test(zip)) {
    return (
      <main className={styles.main}>
        <h1>Invalid zip code</h1>
        <p>
          &ldquo;{zip}&rdquo; isn&apos;t a 5-digit US zip code. Try{" "}
          <Link href="/weather/90210">90210</Link>.
        </p>
        {searchAgain}
      </main>
    );
  }

  let location;
  let forecast;
  try {
    location = await getCoordsForZip(zip);
    if (location) {
      forecast = await getForecast(location.lat, location.lon);
    }
  } catch (error) {
    if (!(error instanceof OpenWeatherError)) throw error;
    // Next strips error messages from server errors in production, so the
    // distinct copy is rendered here rather than in error.js.
    const { title, message } = describeUpstreamError(error);
    return (
      <main className={styles.main}>
        <h1>{title}</h1>
        <p>{message}</p>
        {searchAgain}
      </main>
    );
  }

  if (!location) {
    return (
      <main className={styles.main}>
        <h1>Zip code not found</h1>
        <p>We couldn&apos;t find a US location for {zip}. Double check the zip and try again.</p>
        {searchAgain}
      </main>
    );
  }

  const timezoneOffsetSeconds = forecast.city.timezone;
  const days = groupForecastByDay(forecast.list, timezoneOffsetSeconds);

  return (
    <main className={styles.main}>
      {searchAgain}
      <h1>
        Forecast for {location.name} ({zip})
      </h1>

      {days.map((day) => (
        <section key={day.date} className={styles.day}>
          <h2 className={styles.dayHeading}>{formatDayHeading(day.date)}
            {isPartialDay(day.entries) && " (partial day)"}
          </h2>
          <div className={styles.slots}>
            {day.entries.map((entry) => (
              <div key={entry.dt} className={styles.slot}>
                <span className={styles.time}>
                  {formatSlotTime(entry.dt, timezoneOffsetSeconds)}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://openweathermap.org/img/wn/${entry.weather[0].icon}.png`}
                  alt={entry.weather[0].description}
                  width={40}
                  height={40}
                />
                <span className={styles.temp}>{Math.round(entry.main.temp)}&deg;F</span>
                <span className={styles.desc}>{entry.weather[0].description}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
