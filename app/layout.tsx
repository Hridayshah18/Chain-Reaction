import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chain Kingdom — Neural Strategy",
  description: "A premium chain-reaction strategy game of energy, territory, and momentum.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
