import "./globals.css";

export const metadata = {
  title: "Weather Forecast",
  description: "5-day, 3-hour-increment weather forecast for any US zip code.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
