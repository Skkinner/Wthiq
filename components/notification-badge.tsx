"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { storage } from "@/lib/storage"
import { updateDocumentStatuses } from "@/lib/document-utils"
import { generateNotifications, getUnreadNotificationCount } from "@/lib/notification-service"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export function NotificationBadge() {
  const { user } = useAuth()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    const updateNotifications = async () => {
      try {
        const [docs, employees, settings] = await Promise.all([
          storage.documents.getAll(),
          storage.employees.getAll(),
          storage.settings.get()
        ])

        const documents = updateDocumentStatuses(docs)

        // Generate notifications for documents that need attention
        const notifications = generateNotifications(documents, employees, settings.defaultReminderDays)

        setUnreadCount(getUnreadNotificationCount(notifications))
      } catch (error) {
        // Silently handle errors - notification count will just be 0
        setUnreadCount(0)
      }
    }

    updateNotifications()

    // Update notifications every 2 minutes (less frequent to reduce API calls)
    const interval = setInterval(updateNotifications, 120000)

    return () => clearInterval(interval)
  }, [user])

  return (
    <Button variant="ghost" size="icon" className="relative" onClick={() => router.push("/dashboard/notifications")}>
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-600 dark:bg-red-500">
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </Button>
  )
}
