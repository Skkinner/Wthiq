// Utility functions for document management
import type { Document, DocumentStatus } from "./types"

export function calculateDocumentStatus(expiryDate: string): DocumentStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return "expired"
  } else if (diffDays <= 90) {
    return "expiring_soon"
  } else {
    return "valid"
  }
}

export function updateDocumentStatuses(documents: Document[] | null | undefined): Document[] {
  if (!documents || !Array.isArray(documents)) {
    return []
  }

  return documents.map((doc) => ({
    ...doc,
    status: calculateDocumentStatus(doc.expiryDate),
  }))
}

export function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const diffTime = expiry.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function getStatusColor(status: DocumentStatus): string {
  switch (status) {
    case "valid":
      return "text-green-600 dark:text-green-400"
    case "expiring_soon":
      return "text-yellow-600 dark:text-yellow-400"
    case "expired":
      return "text-red-600 dark:text-red-400"
  }
}

export function getStatusBadgeColor(status: DocumentStatus): string {
  switch (status) {
    case "valid":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "expiring_soon":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "expired":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }
}
