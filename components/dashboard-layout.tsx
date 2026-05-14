"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useTheme } from "@/components/theme-provider"
import { useLocale } from "@/contexts/locale-context"
import { useTranslations } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/language-switcher"
import { NotificationBadge } from "@/components/notification-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Users,
  Settings,
  Bell,
  LogOut,
  Moon,
  Sun,
  Menu,
  UserIcon,
  FileStack,
  CheckSquare,
} from "lucide-react"
import { unifyDataWithSupabase } from "@/lib/auto-sync"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { locale } = useLocale()
  const { t } = useTranslations(locale)
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const isAdmin = user?.role === "admin" || user?.role === "employee"
  const isStrictAdmin = user?.role === "admin"

  const navigation = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard, adminOnly: false },
    { name: t("employees"), href: "/dashboard/employees", icon: Users, adminOnly: true },
    { name: t("documents"), href: "/dashboard/documents", icon: FileStack, adminOnly: false },
    { name: t("tasks"), href: "/dashboard/tasks", icon: CheckSquare, adminOnly: false },
    { name: t("notifications"), href: "/dashboard/notifications", icon: Bell, adminOnly: false },
    {
      name: t("administration"),
      href: "/dashboard/administration",
      icon: UserIcon,
      adminOnly: true,
      strictAdminOnly: true,
    },
    { name: t("settings"), href: "/dashboard/settings", icon: Settings, adminOnly: true },
  ]

  const filteredNavigation = navigation.filter((item) => {
    if (item.strictAdminOnly) {
      return isStrictAdmin
    }
    return !item.adminOnly || isAdmin
  })

  useEffect(() => {
    // Run data unification in the background
    unifyDataWithSupabase().catch((error) => {
      console.error("[v0] Failed to unify data:", error)
    })
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-4 px-4 md:px-6">
          {/* Mobile menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={locale === "ar" ? "right" : "left"} className="w-64 p-0">
              <div className="flex h-16 items-center gap-2 border-b px-6">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%D9%88%D8%AB%D9%82%20%D9%85%D9%81%D8%B1%D8%BA-2PF6SsrZ601ChZ8dl2JuWhSc5GiS5A.png"
                  alt="Wthiq Logo"
                  className="h-8 w-8 object-contain"
                />
                <span className="font-semibold">{t("loginTitle")}</span>
              </div>
              <nav className="flex flex-col gap-1 p-4">
                {filteredNavigation.map((item) => (
                  <Button
                    key={item.name}
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      router.push(item.href)
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    <item.icon className={locale === "ar" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                    {item.name}
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%D9%88%D8%AB%D9%82%20%D9%85%D9%81%D8%B1%D8%BA-2PF6SsrZ601ChZ8dl2JuWhSc5GiS5A.png"
              alt="Wthiq Logo"
              className="h-8 w-8 object-contain"
            />
            <span className="hidden font-semibold md:inline-block">{t("loginTitle")}</span>
          </div>

          <div className="flex-1" />

          <NotificationBadge />

          <LanguageSwitcher />

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className={locale === "ar" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                <span>{t("logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-muted/40">
          <nav className="flex flex-col gap-1 p-4">
            {filteredNavigation.map((item) => (
              <Button key={item.name} variant="ghost" className="justify-start" onClick={() => router.push(item.href)}>
                <item.icon className={locale === "ar" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                {item.name}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
