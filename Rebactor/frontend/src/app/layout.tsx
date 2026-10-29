import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rebactor | AI-Powered DevOps Failure Assistant",
  description: "Automated root-cause analysis, GitHub Webhook ingestion, and organizational RAG incident memories.",
  icons: {
    icon: "/rebactor-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased bg-black text-[#e2e8f0] selection:bg-[#00f5d4]/20 selection:text-[#00f5d4] min-h-screen"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
