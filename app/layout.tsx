import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The 5-Ton Challenge",
  description:
    "Move 5,000 kg of total bodyweight volume across pull-ups and dips. One session. One target. No excuses.",
  themeColor: "#050505",
  manifest: "/manifest.webmanifest",
  applicationName: "The 5-Ton Challenge",
  appleWebApp: {
    capable: true,
    title: "The 5-Ton Challenge",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.svg" }],
    icon: [{ url: "/icon-192.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
