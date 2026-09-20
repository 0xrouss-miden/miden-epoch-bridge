import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Miden Epoch Bridge · Testnet",
  description: "Bridge testnet tokens between Sepolia and Miden through Epoch.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
