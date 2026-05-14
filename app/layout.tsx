import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { LocaleProvider } from "@/contexts/locale-context"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import ClientLayout from "./client-layout"
import "./globals.css"

export const metadata: Metadata = {
  title: "وثق - Wthiq",
  description: "Document expiry tracking and management system",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <LocaleProvider>
            <ClientLayout>
              <ThemeProvider>
                <AuthProvider>
                  {children}
                  <Toaster />
                </AuthProvider>
              </ThemeProvider>
            </ClientLayout>
          </LocaleProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
