"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const ZIP_PATTERN = /^\d{5}$/;

export default function Home() {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!ZIP_PATTERN.test(zip)) {
      setError("Enter a 5-digit US zip code.");
      return;
    }

    setError("");
    router.push(`/weather/${zip}`);
  }

  return (
    <main className={styles.main}>
      <h1>5-Day Weather Forecast</h1>
      <p>Enter a US zip code to see the forecast in 3-hour increments.</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          inputMode="numeric"
          maxLength={5}
          placeholder="90210"
          value={zip}
          onChange={(event) => setZip(event.target.value)}
          aria-label="US zip code"
        />
        <button className={styles.button} type="submit">
          Get forecast
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}
    </main>
  );
}
