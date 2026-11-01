"use client";

import styles from "./page.module.css";

// Fallback boundary for unexpected failures. Known upstream failures (429,
// 401, config) are rendered with distinct copy in page.js, because Next
// strips error messages from server errors in production builds.
export default function Error({ reset }) {
  return (
    <main className={styles.main}>
      <h1>Forecast unavailable</h1>
      <p>Something went wrong loading the forecast.</p>
      <button type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
