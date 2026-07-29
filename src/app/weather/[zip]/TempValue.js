"use client";

import { useUnit } from "@/app/UnitProvider";

export default function TempValue({ fahrenheit, className }) {
  const { unit } = useUnit();
  const value = unit === "C" ? ((fahrenheit - 32) * 5) / 9 : fahrenheit;

  return (
    <span className={className}>
      {Math.round(value)}&deg;{unit}
    </span>
  );
}
