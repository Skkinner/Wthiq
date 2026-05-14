// Mock data for development without database
import type { User, Employee, Document, Notification, AuditLog, AppSettings, Task } from "./types"
import { v4 as uuidv4 } from "uuid"

const adminUserId = uuidv4()
const employeeUserId = uuidv4()

const emp1Id = uuidv4()
const emp2Id = uuidv4()
const emp3Id = uuidv4()
const emp4Id = uuidv4()

export const mockUsers: User[] = [
  {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    email: "admin@example.com",
    password: "Admin@123",
    role: "admin",
    name: "مدير النظام",
    nameEn: "System Administrator",
    phone: "+966501111111",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: employeeUserId,
    email: "employee@example.com",
    password: "Employee@123",
    role: "employee",
    name: "أحمد حسن محمد",
    nameEn: "Ahmed Hassan",
    phone: "+966501234567",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Initial mock employees with required fields
export const mockEmployees: Employee[] = [
  {
    id: emp1Id,
    employeeNumber: "EMP001",
    nameAr: "أحمد حسن محمد",
    nameEn: "Ahmed Hassan Mohammed",
    nationalId: "1234567890",
    nationality: "Saudi Arabia",
    phone: "+966501234567",
    email: "employee@company.com",
    department: "IT",
    position: "Software Engineer",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: emp2Id,
    employeeNumber: "EMP002",
    nameAr: "فاطمة علي أحمد",
    nameEn: "Fatima Ali Ahmed",
    nationalId: "2345678901",
    nationality: "Egypt",
    phone: "+966507654321",
    email: "fatima@company.com",
    department: "HR",
    position: "HR Manager",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: emp3Id,
    employeeNumber: "EMP003",
    nameAr: "محمد سالم عبدالله",
    nameEn: "Mohammed Salem Abdullah",
    nationalId: "3456789012",
    nationality: "Jordan",
    phone: "+966509876543",
    email: "mohammed@company.com",
    department: "Finance",
    position: "Accountant",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: emp4Id,
    employeeNumber: "EMP004",
    nameAr: "نورة خالد سعيد",
    nationalId: "4567890123",
    nationality: "Saudi Arabia",
    phone: "+966502345678",
    department: "Operations",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Initial mock documents with various expiry statuses
const today = new Date()
const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
const expired = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)

export const mockDocuments: Document[] = [
  {
    id: uuidv4(),
    employeeId: emp1Id,
    documentType: "Passport",
    documentNumber: "P123456789",
    issueDate: "2020-01-15",
    expiryDate: expired.toISOString().split("T")[0],
    reminderDays: [90, 60, 30, 7, 1],
    notes: "Needs renewal urgently",
    status: "expired",
    passportLocation: "Embassy Office - Riyadh",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: adminUserId,
  },
  {
    id: uuidv4(),
    employeeId: emp1Id,
    documentType: "Visa",
    documentNumber: "V987654321",
    issueDate: "2023-06-01",
    expiryDate: in7Days.toISOString().split("T")[0],
    reminderDays: [90, 60, 30, 7, 1],
    status: "expiring_soon",
    visaType: "US",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: adminUserId,
  },
  {
    id: uuidv4(),
    employeeId: emp1Id,
    documentType: "Permit",
    documentNumber: "PM456789123",
    issueDate: "2022-03-10",
    expiryDate: in30Days.toISOString().split("T")[0],
    reminderDays: [90, 60, 30, 7, 1],
    status: "expiring_soon",
    responsibleAuthority: "Ministry of Labor",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: adminUserId,
  },
  {
    id: uuidv4(),
    employeeId: emp2Id,
    documentType: "Passport",
    documentNumber: "P555666777",
    issueDate: "2021-08-20",
    expiryDate: in90Days.toISOString().split("T")[0],
    reminderDays: [90, 60, 30, 7, 1],
    status: "expiring_soon",
    passportLocation: "Home Safe",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: adminUserId,
  },
  {
    id: uuidv4(),
    employeeId: emp2Id,
    documentType: "Visa",
    documentNumber: "V111222333",
    issueDate: "2023-01-15",
    expiryDate: "2026-01-15",
    reminderDays: [90, 60, 30, 7, 1],
    status: "valid",
    visaType: "UK",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: adminUserId,
  },
  {
    id: uuidv4(),
    employeeId: emp3Id,
    documentType: "Passport",
    documentNumber: "P888999000",
    issueDate: "2022-05-10",
    expiryDate: "2027-05-10",
    reminderDays: [90, 60, 30, 7, 1],
    status: "valid",
    passportLocation: "HR Department",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: adminUserId,
  },
  {
    id: uuidv4(),
    employeeId: emp3Id,
    documentType: "Permit",
    documentNumber: "PM789456123",
    issueDate: "2023-09-01",
    expiryDate: in60Days.toISOString().split("T")[0],
    reminderDays: [90, 60, 30, 7, 1],
    status: "expiring_soon",
    responsibleAuthority: "Immigration Department",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: adminUserId,
  },
]

export const mockNotifications: Notification[] = []

export const mockAuditLogs: AuditLog[] = []

export const mockSettings: AppSettings = {
  defaultReminderDays: [90, 60, 30, 7, 1],
  timezone: "Asia/Riyadh",
  defaultLanguage: "en",
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
}

export const mockTasks: Task[] = [
  {
    id: uuidv4(),
    taskLabel: "Complete Q4 Financial Report",
    description:
      "Prepare and submit the quarterly financial report including all department expenses and revenue analysis.",
    status: "in_progress",
    priority: "high",
    assignedToId: employeeUserId,
    receiptDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "Include comparison with Q3 data",
    updates: ["Task assigned - Started data collection", "50% complete - Gathered all department data"],
    createdById: adminUserId,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    taskLabel: "Update Employee Handbook",
    description: "Review and update the employee handbook with new company policies and procedures.",
    status: "pending",
    priority: "medium",
    assignedToId: employeeUserId,
    receiptDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "Focus on remote work policies",
    updates: ["Task assigned - Awaiting review"],
    createdById: adminUserId,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    taskLabel: "System Migration Testing",
    description: "Test the new HR system migration and ensure all employee data is correctly transferred.",
    status: "completed",
    priority: "urgent",
    assignedToId: employeeUserId,
    receiptDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    actualDeliveryDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "Completed ahead of schedule",
    updates: [
      "Task assigned - Started testing phase",
      "Found 3 minor issues - Reported to dev team",
      "All issues resolved - Final testing complete",
      "Task completed successfully",
    ],
    createdById: adminUserId,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: uuidv4(),
    taskLabel: "Prepare Training Materials",
    description: "Create comprehensive training materials for new software implementation.",
    status: "pending",
    priority: "low",
    assignedToId: employeeUserId,
    receiptDate: new Date().toISOString().split("T")[0],
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
    updates: ["Task assigned"],
    createdById: adminUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
