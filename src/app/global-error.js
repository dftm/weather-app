"use client";

// Catches failures in the root layout, which error.js cannot cover. Must
// render its own <html> and <body>.
export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.5rem" }}>
          <h1>Something went wrong</h1>
          <p>The weather app hit an unexpected error.</p>
          <button type="button" onClick={() => reset()}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
