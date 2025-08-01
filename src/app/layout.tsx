import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrderBook 3D Visualizer",
  description: "Real-time 3D visualization of cryptocurrency order books with responsive design",
  manifest: "/manifest.json"
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f23" }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // Force dark theme immediately
                document.documentElement.classList.add('dark');
                document.documentElement.style.backgroundColor = '#0a0a0a';
                document.documentElement.style.color = '#ededed';
                if (document.body) {
                  document.body.classList.add('dark');
                  document.body.style.backgroundColor = '#0a0a0a';
                  document.body.style.color = '#ededed';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} dark bg-background text-foreground antialiased`}
        suppressHydrationWarning
        style={{
          backgroundColor: '#0a0a0a',
          color: '#ededed'
        }}
      >
        <ThemeProvider defaultTheme="dark">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
