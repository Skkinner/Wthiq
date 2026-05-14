// Core data types for the Document Expiry Tracker

export type UserRole = "admin" | "employee"

export type DocumentStatus = "valid" | "expiring_soon" | "expired"

export type NotificationType = "in_app" | "email" | "sms" | "whatsapp"

export type NotificationStatus = "pending" | "sent" | "failed"

export interface User {
  id: string
  email: string
  password: string // In production, this would be hashed
  role: UserRole
  name?: string // User's name in Arabic (stored directly in user record)
  nameEn?: string // User's name in English (stored directly in user record)
  phone?: string // User's phone (stored directly in user record)
  passwordHistory?: string[] // Store previous passwords to check similarity
  createdAt: string
  updatedAt: string
}

export interface Employee {
  id: string
  employeeNumber: string // Unique employee ID (automatically assigned)
  nameAr: string // Full name in Arabic (required)
  nameEn?: string // Full name in English (optional)
  nationalId: string // National ID / Iqama number (required)
  nationality: string // Nationality (required)
  phone: string // Phone number (required)
  email?: string // Email (optional)
  department?: string // Department (optional)
  position?: string // Position (optional)
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Document {
  id: string
  employeeId: string
  documentType: string
  documentNumber: string
  issueDate: string
  expiryDate: string
  reminderDays: number[]
  attachmentUrl?: string
  attachmentName?: string
  notes?: string
  status: DocumentStatus
  passportLocation?: string // For Passport documents
  visaType?: "US" | "UK" | "UR" | "JP" // For Visa documents
  responsibleAuthority?: string // For Permit documents
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface Notification {
  id: string
  documentId: string
  employeeId: string
  type: NotificationType
  message: string
  messageAr: string
  scheduledFor: string
  sentAt?: string
  status: NotificationStatus
  createdAt: string
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface AppSettings {
  defaultReminderDays: number[]
  timezone: string
  defaultLanguage: "en" | "ar"
  emailEnabled: boolean
  smsEnabled: boolean
  whatsappEnabled: boolean
}

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled"

export type TaskPriority = "low" | "medium" | "high" | "urgent"

export interface Task {
  id: string
  taskLabel: string // Task name
  description?: string // Task details/data
  status: TaskStatus
  priority: TaskPriority
  assignedToId: string // User ID (Administration user, not Staff employee)
  receiptDate: string // Task receipt date
  deadline: string // Deadline date
  actualDeliveryDate?: string // Actual delivery date (when completed)
  notes?: string // Additional notes
  updates: string[] // Array of update messages
  createdById: string // User ID who created the task
  createdAt: string
  updatedAt: string
}

// Dashboard KPI types
export interface DashboardStats {
  totalDocuments: number
  expiredDocuments: number
  expiringSoonDocuments: number
  validDocuments: number
  totalEmployees: number
  activeEmployees: number
}
