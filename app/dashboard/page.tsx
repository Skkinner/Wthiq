"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { storage } from "@/lib/storage"
import { updateDocumentStatuses } from "@/lib/document-utils"
import type { DashboardStats, Document } from "@/lib/types"
import { FileText, AlertTriangle, CheckCircle, Clock, Users, UserCheck } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useLocale } from "@/contexts/locale-context"
import { useTranslations, formatDate } from "@/lib/i18n"

export default function DashboardPage() {
  const { user } = useAuth()
  const { locale } = useLocale()
  const { t } = useTranslations(locale)
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    expiredDocuments: 0,
    expiringSoonDocuments: 0,
    validDocuments: 0,
    totalEmployees: 0,
    activeEmployees: 0,
  })
  const [recentDocuments, setRecentDocuments] = useState<(Document & { employeeName: string })[]>([])

  useEffect(() => {
    loadDashboardData()

    const handleDataChange = () => {
      loadDashboardData()
    }

    window.addEventListener("dataChanged", handleDataChange)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboardData()
      }
    }

    const handleFocus = () => {
      loadDashboardData()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      window.removeEventListener("dataChanged", handleDataChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      const [documents, employees] = await Promise.all([
        storage.documents.getAll(),
        storage.employees.getAll()
      ])

      const updatedDocuments = updateDocumentStatuses(documents)

      const dashboardStats: DashboardStats = {
        totalDocuments: updatedDocuments.length,
        expiredDocuments: updatedDocuments.filter((d) => d.status === "expired").length,
        expiringSoonDocuments: updatedDocuments.filter((d) => d.status === "expiring_soon").length,
        validDocuments: updatedDocuments.filter((d) => d.status === "valid").length,
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e) => e.isActive).length,
      }

      setStats(dashboardStats)

      const recent = updatedDocuments
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((doc) => {
          const employee = employees.find((e) => e.id === doc.employeeId)
          return {
            ...doc,
            employeeName: employee?.nameEn || t("unknown"),
          }
        })

      setRecentDocuments(recent)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    }
  }

  const isAdmin = user?.role === "admin" || user?.role === "employee"

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("dashboardTitle")}</h1>
            <p className="text-muted-foreground mt-1">{t("dashboardSubtitle")}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("totalDocuments")}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                <p className="text-xs text-muted-foreground mt-1">{t("allTrackedDocuments")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("expired")}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.expiredDocuments}</div>
                <p className="text-xs text-muted-foreground mt-1">{t("requireImmediateAttention")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("expiringSoon")}</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.expiringSoonDocuments}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("within90Days")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("valid")}</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.validDocuments}</div>
                <p className="text-xs text-muted-foreground mt-1">{t("noActionNeeded")}</p>
              </CardContent>
            </Card>

            {isAdmin && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("totalEmployees")}</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                    <p className="text-xs text-muted-foreground mt-1">{t("allEmployees")}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t("activeEmployees")}</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.activeEmployees}</div>
                    <p className="text-xs text-muted-foreground mt-1">{t("currentlyActive")}</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Recent Documents */}
          <Card>
            <CardHeader>
              <CardTitle>{t("recentDocuments")}</CardTitle>
            </CardHeader>
            <CardContent>
              {recentDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("noDocumentsFound")}</p>
              ) : (
                <div className="space-y-4">
                  {recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{doc.documentType}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.employeeName} • {doc.documentNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {t("expires")}: {formatDate(doc.expiryDate, locale)}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            doc.status === "valid"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : doc.status === "expiring_soon"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {doc.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
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
