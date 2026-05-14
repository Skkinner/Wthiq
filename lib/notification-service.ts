// Notification service for generating and managing document expiry reminders
import type { Document, Employee, Notification } from "./types"
import { getDaysUntilExpiry } from "./document-utils"
import { v4 as uuidv4 } from "uuid"

export function generateNotifications(
  documents: Document[],
  employees: Employee[],
  reminderDays: number[],
): Notification[] {
  if (!Array.isArray(documents) || !Array.isArray(employees) || !Array.isArray(reminderDays)) {
    return []
  }

  const notifications: Notification[] = []
  const now = new Date()

  for (const doc of documents) {
    if (!doc.expiryDate) continue

    const daysUntil = getDaysUntilExpiry(doc.expiryDate)
    const employee = employees.find((e) => e.id === doc.employeeId)

    if (!employee) continue

    // Check if document is expired
    if (daysUntil < 0) {
      notifications.push(
        createNotification(
          doc,
          employee,
          "in_app",
          `Your ${doc.documentType} has expired ${Math.abs(daysUntil)} days ago`,
          `انتهت صلاحية ${getDocumentTypeArabic(doc.documentType)} الخاصة بك منذ ${Math.abs(daysUntil)} يوم`,
          now,
        ),
      )
    }
    // Check if document is within reminder days
    else if (reminderDays.includes(daysUntil)) {
      notifications.push(
        createNotification(
          doc,
          employee,
          "in_app",
          `Your ${doc.documentType} will expire in ${daysUntil} days`,
          `ستنتهي صلاحية ${getDocumentTypeArabic(doc.documentType)} الخاصة بك خلال ${daysUntil} يوم`,
          now,
        ),
      )
    }
  }

  return notifications
}

function createNotification(
  document: Document,
  employee: Employee,
  type: "in_app" | "email" | "sms" | "whatsapp",
  message: string,
  messageAr: string,
  scheduledFor: Date,
): Notification {
  return {
    id: uuidv4(),
    documentId: document.id,
    employeeId: employee.id,
    type,
    message,
    messageAr,
    scheduledFor: scheduledFor.toISOString(),
    status: "pending",
    createdAt: new Date().toISOString(),
  }
}

function getDocumentTypeArabic(type: string): string {
  const typeMap: Record<string, string> = {
    Passport: "جواز السفر",
    Iqama: "الإقامة",
    "Driving License": "رخصة القيادة",
    "Work Permit": "تصريح العمل",
    Visa: "التأشيرة",
    Insurance: "التأمين",
    Other: "المستند",
  }
  return typeMap[type] || type
}

export function getUnreadNotificationCount(notifications: Notification[]): number {
  return notifications.filter((n) => n.status === "pending").length
}

export function markNotificationAsRead(notificationId: string, notifications: Notification[]): Notification[] {
  return notifications.map((n) => (n.id === notificationId ? { ...n, status: "sent" as const } : n))
}
