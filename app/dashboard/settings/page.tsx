"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { storage } from "@/lib/storage"
import type { AppSettings } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Save, Trash2 } from "lucide-react"
import { useLocale } from "@/contexts/locale-context"
import { useTranslations } from "@/lib/i18n"
import { useAuth } from "@/contexts/auth-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Default settings to prevent null reference during static prerendering
const DEFAULT_SETTINGS: AppSettings = {
  defaultReminderDays: [30, 15, 7, 1],
  timezone: "UTC",
}

export default function SettingsPage() {
  const { toast } = useToast()
  const { locale } = useLocale()
  const { t } = useTranslations(locale)
  const { user } = useAuth()
  // Initialize with defaults to prevent null during prerendering
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [reminderDaysInput, setReminderDaysInput] = useState("30, 15, 7, 1")
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.role === "admin"

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentSettings = await storage.settings.get()
        if (currentSettings) {
          setSettings(currentSettings)
          setReminderDaysInput(
            Array.isArray(currentSettings.defaultReminderDays)
              ? currentSettings.defaultReminderDays.join(", ")
              : "30, 15, 7, 1",
          )
        }
      } catch (error) {
        console.error("Error loading settings:", error)
        // Keep default settings on error, but update timezone if available
        if (typeof window !== "undefined") {
          setSettings(prev => ({
            ...prev,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }))
        }
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    
    // Parse reminder days
    const reminderDays = reminderDaysInput
      .split(",")
      .map((d) => Number.parseInt(d.trim()))
      .filter((d) => !isNaN(d))
      .sort((a, b) => b - a)

    const updatedSettings: AppSettings = {
      ...settings,
      defaultReminderDays: reminderDays,
    }

    await storage.settings.save(updatedSettings)
    setSettings(updatedSettings)

    toast({
      title: t("settingsSaved"),
      description: t("settingsSavedDesc"),
    })
  }

  const handleCleanupOrphanedTasks = async () => {
    const [allTasks, allUsers] = await Promise.all([
      storage.tasks.getAll(),
      storage.users.getAll()
    ])
    const userIds = new Set(allUsers.map((user) => user.id))

    // Find tasks assigned to non-existent users
    const orphanedTasks = allTasks.filter((task) => !userIds.has(task.assignedToId))

    if (orphanedTasks.length === 0) {
      toast({
        title: t("noOrphanedTasksFound"),
        description: t("noOrphanedTasksFoundDesc"),
      })
      return
    }

    // Delete orphaned tasks
    const validTasks = allTasks.filter((task) => userIds.has(task.assignedToId))
    await storage.tasks.save(validTasks)

    toast({
      title: t("orphanedTasksDeleted"),
      description: `${orphanedTasks.length} ${t("orphanedTasksDeletedDesc")}`,
    })
  }

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <DashboardLayout>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t("settingsTitle")}</h1>
              <p className="text-muted-foreground mt-1">{t("settingsSubtitle")}</p>
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading settings...</div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requireAdmin>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("settingsTitle")}</h1>
            <p className="text-muted-foreground mt-1">{t("settingsSubtitle")}</p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("reminderSettings")}</CardTitle>
                <CardDescription>{t("reminderSettingsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reminderDays">{t("defaultReminderDays")}</Label>
                  <Input
                    id="reminderDays"
                    value={reminderDaysInput}
                    onChange={(e) => setReminderDaysInput(e.target.value)}
                    placeholder={t("reminderDaysPlaceholder")}
                  />
                  <p className="text-sm text-muted-foreground">{t("reminderDaysHelp")}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("regionalSettings")}</CardTitle>
                <CardDescription>{t("regionalSettingsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">{t("timezone")}</Label>
                  <Input id="timezone" value={settings.timezone} disabled />
                  <p className="text-sm text-muted-foreground">{t("timezoneDesc")}</p>
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("dataManagement")}</CardTitle>
                  <CardDescription>{t("dataManagementDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("cleanupOrphanedTasks")}</Label>
                    <p className="text-sm text-muted-foreground">{t("cleanupOrphanedTasksDesc")}</p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="mt-2">
                          <Trash2 className="me-2 h-4 w-4" />
                          {t("cleanupOrphanedTasksButton")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("cleanupOrphanedTasks")}</AlertDialogTitle>
                          <AlertDialogDescription>{t("confirmCleanupOrphanedTasks")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCleanupOrphanedTasks}>{t("delete")}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSave}>
                <Save className="me-2 h-4 w-4" />
                {t("saveSettings")}
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
