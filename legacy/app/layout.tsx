import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Los Tres Pacos · Portmán", template: "%s · Los Tres Pacos" },
  description: "Café, bar y cocina tradicional murciana en Portmán.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
