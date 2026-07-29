# 5-Day Weather Forecast

A Next.js (App Router, JavaScript) app that shows a 5-day, 3-hour-increment weather forecast for any US zip code, using the OpenWeather API.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Get a free API key from [OpenWeather](https://openweathermap.org/api). Note: newly created keys can take up to a couple of hours to activate.

3. Create a `.env.local` file in the project root with:

   ```
   OPENWEATHER_API_KEY=your_key_here
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000), enter a zip code, or go directly to a URL like [http://localhost:3000/weather/90210](http://localhost:3000/weather/90210).

## How it works

- `/weather/[zip]` is a dynamic route rendered entirely server-side (no `"use client"`), so the OpenWeather calls happen on the server.
- Since OpenWeather's forecast endpoint takes latitude/longitude rather than a zip code, the app first resolves the zip via OpenWeather's Geocoding API, then requests the 5-day/3-hour forecast for those coordinates.
- Forecast entries are grouped by calendar day (in the zip code's own local time, not the viewer's) and rendered as a grid of 3-hour slots per day.
- Invalid zip formats and zips with no matching US location are handled with a plain message rather than a crash.

## Project structure

- `src/lib/openweather.js` — API calls and formatting helpers.
- `src/app/page.js` — home page with the zip search form (the one client component in the app).
- `src/app/weather/[zip]/page.js` — the forecast page.
