import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Mind leaderboard",
  description: "Krillion and friends, scored from the daily-mind-challenges chat",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
