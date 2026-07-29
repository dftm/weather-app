"use client";

import { useTheme } from "./ThemeProvider";
import { useUnit } from "./UnitProvider";
import styles from "./SiteHeader.module.css";

export default function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  const { unit, toggleUnit } = useUnit();

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.toggle}
        onClick={toggleTheme}
        aria-label="Toggle light/dark mode"
      >
        {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
      </button>
      <button
        type="button"
        className={styles.toggle}
        onClick={toggleUnit}
        aria-label="Toggle Celsius/Fahrenheit"
      >
        °{unit === "F" ? "F" : "C"}
      </button>
    </header>
  );
}
