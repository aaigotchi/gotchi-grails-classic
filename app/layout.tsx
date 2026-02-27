import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pixelar = localFont({
  src: '../public/fonts/Pixelar.ttf',
  display: 'swap',
  variable: '--font-pixelar',
});

export const metadata: Metadata = {
  title: "Gotchi Grails - Aavegotchi Card Generator",
  description: "Generate beautiful cards for your Aavegotchi NFTs on Base",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pixelar.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
