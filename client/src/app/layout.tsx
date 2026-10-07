import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { ToastProvider } from "@/components/toast";
import { LoggerProvider } from "@/utils/logger";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EmailHub - Professional Email Management",
  description: "Advanced email sending platform with SMTP rotation and analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <LoggerProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </LoggerProvider>
      </body>
    </html>
  );
}