import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/nav";

export const metadata: Metadata = { title: "Kaaval — Security Guard for AI Agents", description: "Security and control for AI agents." };
export const viewport: Viewport = { themeColor: "#060914", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className="font-sans antialiased"><Shell>{children}</Shell></body></html>
  );
}
