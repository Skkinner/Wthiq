"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { storage } from "@/lib/storage"
import { updateDocumentStatuses, getDaysUntilExpiry } from "@/lib/document-utils"
import { generateNotifications } from "@/lib/notification-service"
import type { Document, Employee } from "@/lib/types"
import { Bell, Calendar, AlertTriangle, CheckCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useLocale } from "@/contexts/locale-context"
import { useTranslations } from "@/lib/i18n"

export default function NotificationsPage() {
  const { user } = useAuth()
  const { locale } = useLocale()
  const { t } = useTranslations(locale)
  const [notifications, setNotifications] = useState<
    Array<{
      id: string
      type: "expired" | "expiring_soon"
      document: Document
      employee: Employee
      daysUntilExpiry: number
      message: string
    }>
  >([])

  useEffect(() => {
    loadNotifications()
  }, [user, locale])

  const loadNotifications = async () => {
    try {
      const [docs, emps, settings] = await Promise.all([
        storage.documents.getAll(),
        storage.employees.getAll(),
        storage.settings.get()
      ])
      
      const allDocuments = updateDocumentStatuses(docs)
      const employees = emps

      // Generate notifications
      const generatedNotifications = generateNotifications(allDocuments, employees, settings.defaultReminderDays)

      // Convert to display format
      const notificationList = allDocuments
        .filter((doc) => doc.status === "expired" || doc.status === "expiring_soon")
        .map((doc) => {
          const employee = employees.find((e) => e.id === doc.employeeId)
          if (!employee) return null // Skip if employee not found

          const daysUntilExpiry = getDaysUntilExpiry(doc.expiryDate)
          const notification = generatedNotifications.find((n) => n.documentId === doc.id)

          return {
            id: doc.id,
            type: doc.status === "expired" ? ("expired" as const) : ("expiring_soon" as const),
            document: doc,
            employee,
            daysUntilExpiry,
            message: locale === "ar" ? notification?.messageAr || "" : notification?.message || "",
          }
        })
        .filter((n): n is NonNullable<typeof n> => n !== null) // Remove null entries
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

      setNotifications(notificationList)
    } catch (error) {
      console.error("Error loading notifications:", error)
    }
  }

  const expiredCount = notifications.filter((n) => n.type === "expired").length
  const expiringSoonCount = notifications.filter((n) => n.type === "expiring_soon").length

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("notificationsTitle")}</h1>
            <p className="text-muted-foreground mt-1">{t("notificationsSubtitle")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("expiredDocuments")}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{expiredCount}</div>
                <p className="text-xs text-muted-foreground mt-1">{t("requireImmediateAttention")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("expiringSoon")}</CardTitle>
                <Bell className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{expiringSoonCount}</div>
                <p className="text-xs text-muted-foreground mt-1">{t("within90Days")}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("activeAlerts")}</CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-600 dark:text-green-400" />
                  <h3 className="mt-4 text-lg font-semibold">{t("allClear")}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{t("noDocumentsRequireAttention")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`border-l-4 ${
                        notification.type === "expired"
                          ? "border-l-red-600 dark:border-l-red-400"
                          : "border-l-yellow-600 dark:border-l-yellow-400"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              {notification.type === "expired" ? (
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                              ) : (
                                <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              )}
                              <h3 className="font-semibold">{notification.document.documentType}</h3>
                              <Badge
                                className={
                                  notification.type === "expired"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                }
                              >
                                {notification.type === "expired" ? t("expired") : t("expiringSoon")}
                              </Badge>
                            </div>
                            {notification.message && (
                              <p className="text-sm text-muted-foreground">{notification.message}</p>
                            )}
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>
                                <span className="font-medium">{t("employee")}:</span>{" "}
                                {locale === "ar" ? notification.employee.nameAr : notification.employee.nameEn}
                              </p>
                              <p>
                                <span className="font-medium">{t("documentNumber")}:</span>{" "}
                                {notification.document.documentNumber}
                              </p>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">{t("expiryDate")}:</span>
                                <span>{new Date(notification.document.expiryDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-2xl font-bold ${
                                notification.type === "expired"
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-yellow-600 dark:text-yellow-400"
                              }`}
                            >
                              {notification.type === "expired"
                                ? Math.abs(notification.daysUntilExpiry)
                                : notification.daysUntilExpiry}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {notification.type === "expired" ? t("daysAgo") : t("daysLeft")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
