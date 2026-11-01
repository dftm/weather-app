"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

const ZIP_PATTERN = /^\d{5}$/;

export default function Home() {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event) {
    event.preventDefault();
    if (isPending) return;

    if (!ZIP_PATTERN.test(zip)) {
      setError("Enter a 5-digit US zip code.");
      return;
    }

    setError("");
    startTransition(() => {
      router.push(`/weather/${zip}`);
    });
  }

  return (
    <main className={styles.main}>
      <h1>Weather Forecast</h1>
      <p>Enter a US zip code to see the forecast in 3-hour increments.</p>

      <form className={styles.form} onSubmit={handleSubmit} aria-busy={isPending}>
        <input
          className={styles.input}
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="90210"
          value={zip}
          onChange={(event) => setZip(event.target.value)}
          aria-label="US zip code"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "zip-error" : undefined}
        />
        <button className={styles.button} type="submit" aria-disabled={isPending}>
          {isPending ? "Loading..." : "Get forecast"}
        </button>
      </form>

      <p role="status" className={styles.srOnly}>
        {isPending ? "Loading forecast" : ""}
      </p>
      {error && (
        <p id="zip-error" role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </main>
  );
}
