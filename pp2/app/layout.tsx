import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import BannedUserInterceptor from "./components/BannedUserInterceptor";
import { AuthProvider } from "../contexts/AuthContext";
import PlayerGifBackground from "./components/PlayerGifBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SportsDeck",
  description: "The Ultimate Hub for Sports Fans",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} relative isolate antialiased`}>
        <PlayerGifBackground />
        <AuthProvider>
          <BannedUserInterceptor>
            <div className="relative z-10 min-h-screen">
              <Navbar />
              {children}
            </div>
          </BannedUserInterceptor>
        </AuthProvider>
      </body>
    </html>
  );
}
