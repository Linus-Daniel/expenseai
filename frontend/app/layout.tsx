import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExpenseAI — Personal Finance",
  description: "AI-powered expense management, forecasting, and financial advice",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-teal-500/30">
        {children}
      </body>
    </html>
  );
}
