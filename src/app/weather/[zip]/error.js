"use client";

import { startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

// Fallback boundary for unexpected failures. Known upstream failures (429,
// 401, config) are rendered with distinct copy in page.js, because Next
// strips error messages from server errors in production builds.
export default function Error({ reset }) {
  const router = useRouter();

  function retry() {
    // reset() alone only re-renders client side; refresh() refetches the
    // server component.
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <main className={styles.main}>
      <h1>Forecast unavailable</h1>
      <p>Something went wrong loading the forecast.</p>
      <button type="button" onClick={retry}>
        Try again
      </button>
      <p>
        <Link href="/">Search another zip code</Link>
      </p>
    </main>
  );
}
