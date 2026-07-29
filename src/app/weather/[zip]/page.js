import {
  getCoordsForZip,
  getForecast,
  groupForecastByDay,
  formatDayHeading,
  formatSlotTime,
} from "@/lib/openweather";
import styles from "./page.module.css";

const ZIP_PATTERN = /^\d{5}$/;

export default async function WeatherPage({ params }) {
  const { zip } = await params;

  if (!ZIP_PATTERN.test(zip)) {
    return (
      <main className={styles.main}>
        <h1>Invalid zip code</h1>
        <p>
          &ldquo;{zip}&rdquo; isn&apos;t a 5-digit US zip code. Try{" "}
          <a href="/weather/90210">90210</a>.
        </p>
      </main>
    );
  }

  const location = await getCoordsForZip(zip);

  if (!location) {
    return (
      <main className={styles.main}>
        <h1>Zip code not found</h1>
        <p>We couldn&apos;t find a US location for {zip}. Double check the zip and try again.</p>
      </main>
    );
  }

  const forecast = await getForecast(location.lat, location.lon);
  const timezoneOffsetSeconds = forecast.city.timezone;
  const days = groupForecastByDay(forecast.list, timezoneOffsetSeconds);

  return (
    <main className={styles.main}>
      <h1>
        5-Day Forecast for {location.name} ({zip})
      </h1>

      {days.map((day) => (
        <section key={day.date} className={styles.day}>
          <h2 className={styles.dayHeading}>{formatDayHeading(day.date)}</h2>
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
