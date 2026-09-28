import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "JobMatch AI", template: "%s | JobMatch AI" },
  description: "Upload your CV, discover relevant jobs, understand your gaps, and tailor your application before you apply.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
