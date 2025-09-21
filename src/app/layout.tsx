import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { MobileProvider } from "@/contexts/MobileContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased`}>
        <ThemeProvider>
          <MobileProvider>
            <WebSocketProvider>
              {children}
            </WebSocketProvider>
          </MobileProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
