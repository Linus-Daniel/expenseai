import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/layout";

export const metadata: Metadata = {
  title: "ExpenseAI — Personal Finance",
  description: "AI-powered expense management, forecasting, and financial advice",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
