"use client";

import { createContext, useContext, useEffect, useState } from "react";

const UNIT_STORAGE_KEY = "tempUnit";

const UnitContext = createContext(null);

export function UnitProvider({ children }) {
  const [unit, setUnit] = useState("F");

  useEffect(() => {
    const stored = localStorage.getItem(UNIT_STORAGE_KEY);
    if (stored === "C" || stored === "F") {
      setUnit(stored);
    }
  }, []);

  function toggleUnit() {
    setUnit((prev) => {
      const next = prev === "F" ? "C" : "F";
      localStorage.setItem(UNIT_STORAGE_KEY, next);
      return next;
    });
  }

  return <UnitContext.Provider value={{ unit, toggleUnit }}>{children}</UnitContext.Provider>;
}

export function useUnit() {
  return useContext(UnitContext);
}
