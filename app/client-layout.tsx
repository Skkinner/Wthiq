"use client"

import type React from "react"
import { Suspense, useEffect } from "react"
import { useLocale } from "@/contexts/locale-context"

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale()

  useEffect(() => {
    // Update dir attribute when locale changes
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
    document.documentElement.lang = locale
  }, [locale])

  return <>{children}</>
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  )
}
