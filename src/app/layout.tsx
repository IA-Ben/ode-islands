import type { Metadata, Viewport } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "../stack/client";
import { Manrope } from "next/font/google";
import { ThemeProvider as TokenThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { MobileProvider } from "@/contexts/MobileContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { NotificationProvider } from "@/contexts/NotificationProvider";
import { loadServerTheme, getThemeSSRStyles } from "@/lib/theme/server";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "800"],
});

export const metadata: Metadata = {
  title: "The Ode Islands",
  description: "A bold, boundary-defying performance pushing the edges of contemporary storytelling.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Load server-side theme to prevent FOUC and ensure consistency
  const serverTheme = await loadServerTheme();

  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased bg-slate-900`}><StackProvider app={stackClientApp}><StackTheme>
        <TokenThemeProvider initial={serverTheme}>
          <ThemeProvider>
            <MobileProvider>
              <WebSocketProvider>
                <NotificationProvider>
                  {children}
                </NotificationProvider>
              </WebSocketProvider>
            </MobileProvider>
          </ThemeProvider>
        </TokenThemeProvider>
      </StackTheme></StackProvider></body>
    </html>
  );
}
