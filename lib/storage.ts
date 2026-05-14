// Storage layer - uses API routes for Supabase operations
// This avoids client-side env var issues in v0 preview
import type { User, Employee, Document, Notification, AuditLog, AppSettings, Task } from "./types"
import { mockSettings } from "./mock-data"

// Only used for current user session (not data persistence)
const CURRENT_USER_KEY = "doc_tracker_current_user"

export function dispatchDataChangeEvent() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("dataChanged"))
}

// Helper to check if ID is a valid UUID format
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Generic fetch via API route
async function fetchFromAPI<T>(table: string): Promise<T[]> {
  if (typeof window === "undefined") return []

  try {
    const response = await fetch(`/api/data/${table}`)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      console.error(`[v0] API error fetching ${table}:`, error.error || error)
      return []
    }

    return await response.json()
  } catch (error: any) {
    console.error(`[v0] Error fetching ${table}:`, error.message)
    return []
  }
}

// Generic save via API route
async function saveToAPI<T extends Record<string, any>>(table: string, data: T[]): Promise<void> {
  if (typeof window === "undefined") return

  try {
    const response = await fetch(`/api/data/${table}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      console.error(`[v0] API error saving to ${table}:`, error.error || error)
      throw new Error(error.error || "Failed to save")
    }

    dispatchDataChangeEvent()
  } catch (error: any) {
    console.error(`[v0] Error saving to ${table}:`, error.message)
    throw error
  }
}

// Generic delete via API route
async function deleteFromAPI(table: string, id: string): Promise<void> {
  if (typeof window === "undefined") return

  try {
    const response = await fetch(`/api/data/${table}?id=${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      console.error(`[v0] API error deleting from ${table}:`, error.error || error)
      throw new Error(error.error || "Failed to delete")
    }

    dispatchDataChangeEvent()
  } catch (error: any) {
    console.error(`[v0] Error deleting from ${table}:`, error.message)
    throw error
  }
}

// Storage API
export const storage = {
  users: {
    getAll: async (): Promise<User[]> => {
      return await fetchFromAPI<User>("users")
    },
    save: async (users: User[]) => {
      const validUsers = users.filter((user) => isValidUUID(user.id))
      await saveToAPI("users", validUsers)
    },
    delete: async (id: string) => {
      await deleteFromAPI("users", id)
    },
  },

  employees: {
    getAll: async (): Promise<Employee[]> => {
      return await fetchFromAPI<Employee>("employees")
    },
    save: async (employees: Employee[]) => {
      const validEmployees = employees.filter((emp) => isValidUUID(emp.id))
      await saveToAPI("employees", validEmployees)
    },
    delete: async (id: string) => {
      await deleteFromAPI("employees", id)
    },
  },

  documents: {
    getAll: async (): Promise<Document[]> => {
      return await fetchFromAPI<Document>("documents")
    },
    save: async (documents: Document[]) => {
      const validDocs = documents.filter((doc) => isValidUUID(doc.id) && isValidUUID(doc.employeeId))
      await saveToAPI("documents", validDocs)
    },
    delete: async (id: string) => {
      await deleteFromAPI("documents", id)
    },
  },

  notifications: {
    getAll: async (): Promise<Notification[]> => {
      return await fetchFromAPI<Notification>("notifications")
    },
    save: async (notifications: Notification[]) => {
      const validNotifications = notifications.filter((n) => isValidUUID(n.id))
      await saveToAPI("notifications", validNotifications)
    },
  },

  auditLogs: {
    getAll: async (): Promise<AuditLog[]> => {
      return await fetchFromAPI<AuditLog>("audit_logs")
    },
    save: async (logs: AuditLog[]) => {
      const validLogs = logs.filter((log) => isValidUUID(log.id))
      await saveToAPI("audit_logs", validLogs)
    },
  },

  settings: {
    get: async (): Promise<AppSettings> => {
      if (typeof window === "undefined") return mockSettings

      try {
        const data = await fetchFromAPI<any>("settings")
        
        if (!data || data.length === 0) {
          return mockSettings
        }

        const settings = data[0]
        return {
          defaultReminderDays: settings.defaultReminderDays || mockSettings.defaultReminderDays,
          timezone: settings.timezone || mockSettings.timezone,
          defaultLanguage: settings.defaultLanguage || mockSettings.defaultLanguage,
          emailEnabled: settings.emailEnabled ?? mockSettings.emailEnabled,
          smsEnabled: settings.smsEnabled ?? mockSettings.smsEnabled,
          whatsappEnabled: settings.whatsappEnabled ?? mockSettings.whatsappEnabled,
        }
      } catch (error) {
        console.error("[v0] Error loading settings:", error)
        return mockSettings
      }
    },
    save: async (settings: AppSettings) => {
      await saveToAPI("settings", [{
        id: "default",
        defaultReminderDays: settings.defaultReminderDays,
        timezone: settings.timezone,
        defaultLanguage: settings.defaultLanguage,
        emailEnabled: settings.emailEnabled,
        smsEnabled: settings.smsEnabled,
        whatsappEnabled: settings.whatsappEnabled,
        updatedAt: new Date().toISOString(),
      }])
    },
  },

  // Current user session - kept in localStorage for quick access
  currentUser: {
    get: (): User | null => {
      if (typeof window === "undefined") return null
      try {
        const item = localStorage.getItem(CURRENT_USER_KEY)
        return item ? JSON.parse(item) : null
      } catch {
        return null
      }
    },
    save: (user: User | null) => {
      if (typeof window === "undefined") return
      if (user) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(CURRENT_USER_KEY)
      }
    },
    clear: () => {
      if (typeof window === "undefined") return
      localStorage.removeItem(CURRENT_USER_KEY)
    },
  },

  tasks: {
    getAll: async (): Promise<Task[]> => {
      return await fetchFromAPI<Task>("tasks")
    },
    save: async (tasks: Task[]) => {
      const validTasks = tasks.filter((task) => isValidUUID(task.id) && isValidUUID(task.assignedToId))
      await saveToAPI("tasks", validTasks)
    },
    delete: async (id: string) => {
      await deleteFromAPI("tasks", id)
    },
  },
}

// Initialize storage - no longer needed as data is in Supabase
export async function initializeStorage() {
  // No-op - data initialization is handled by database migrations
}

// Legacy function for compatibility
export function clearAllCache() {
  if (typeof window === "undefined") return
  localStorage.removeItem(CURRENT_USER_KEY)
}
