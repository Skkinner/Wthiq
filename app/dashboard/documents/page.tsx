"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { storage } from "@/lib/storage"
import {
  updateDocumentStatuses,
  getDaysUntilExpiry,
  getStatusBadgeColor,
  calculateDocumentStatus,
} from "@/lib/document-utils"
import type { Document, Employee } from "@/lib/types"
import {
  Search,
  FileText,
  Calendar,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  User,
  File,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { v4 as uuidv4 } from "uuid"
import { useToast } from "@/hooks/use-toast"
import { useLocale } from "@/contexts/locale-context"
import { useTranslations, formatDate } from "@/lib/i18n"

interface EmployeeDocuments {
  employee: Employee
  documents: Document[]
  expiredCount: number
  expiringSoonCount: number
}

export default function DocumentsPage() {
  const { user } = useAuth()
  const { locale } = useLocale()
  const { t } = useTranslations(locale)
  const { toast } = useToast()
  const [documents, setDocuments] = useState<Document[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "valid" | "expiring_soon" | "expired">("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    employeeId: "",
    documentType: "",
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
    notes: "",
    passportLocation: "",
    visaType: "",
    responsibleAuthority: "",
  })

  useEffect(() => {
    loadDocuments()

    const handleDataChange = () => {
      loadDocuments()
    }

    window.addEventListener("dataChanged", handleDataChange)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDocuments()
      }
    }

    const handleFocus = () => {
      loadDocuments()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      window.removeEventListener("dataChanged", handleDataChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [user])

  const loadDocuments = async () => {
    try {
      const [docs, emps] = await Promise.all([
        storage.documents.getAll(),
        storage.employees.getAll()
      ])
      const updatedDocuments = updateDocumentStatuses(docs)
      setDocuments(updatedDocuments)
      setEmployees(emps)
    } catch (error) {
      console.error("Error loading documents:", error)
    }
  }

  const groupedDocuments: EmployeeDocuments[] = (() => {
    return employees
      .map((employee) => {
        const employeeDocs = documents.filter((doc) => doc.employeeId === employee.id)

        const filteredDocs = employeeDocs.filter((doc) => {
          const matchesSearch =
            doc.documentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.nameEn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.nameAr.toLowerCase().includes(searchQuery.toLowerCase())

          const matchesFilter = filterStatus === "all" || doc.status === filterStatus

          return matchesSearch && matchesFilter
        })

        const expiredCount = filteredDocs.filter((doc) => doc.status === "expired").length
        const expiringSoonCount = filteredDocs.filter((doc) => doc.status === "expiring_soon").length

        return {
          employee,
          documents: filteredDocs,
          expiredCount,
          expiringSoonCount,
        }
      })
      .filter((group) => group.documents.length > 0)
  })()

  const isAdmin = user?.role === "admin" || user?.role === "employee"

  const toggleEmployee = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees)
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId)
    } else {
      newExpanded.add(employeeId)
    }
    setExpandedEmployees(newExpanded)
  }

  useEffect(() => {
    if (searchQuery || filterStatus !== "all") {
      const allEmployeeIds = new Set(groupedDocuments.map((g) => g.employee.id))
      setExpandedEmployees(allEmployeeIds)
    }
  }, [searchQuery, filterStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const allDocuments = await storage.documents.getAll()
    const status = calculateDocumentStatus(formData.expiryDate)

    const documentData: any = {
      employeeId: formData.employeeId,
      documentType: formData.documentType,
      documentNumber: formData.documentType === "Passport" ? formData.documentNumber : "",
      issueDate: formData.issueDate,
      expiryDate: formData.expiryDate,
      notes: formData.notes,
      status,
    }

    if (formData.documentType === "Passport" && formData.passportLocation) {
      documentData.passportLocation = formData.passportLocation
    }
    if (formData.documentType === "Visa" && formData.visaType) {
      documentData.visaType = formData.visaType
    }
    if (formData.documentType === "Permit" && formData.responsibleAuthority) {
      documentData.responsibleAuthority = formData.responsibleAuthority
    }

    if (selectedFile) {
      documentData.attachmentName = selectedFile.name
      documentData.attachmentUrl = URL.createObjectURL(selectedFile)
    }

    if (editingDocument) {
      const updatedDocuments = allDocuments.map((doc) =>
        doc.id === editingDocument.id
          ? {
              ...doc,
              ...documentData,
              updatedAt: new Date().toISOString(),
            }
          : doc,
      )
      await storage.documents.save(updatedDocuments)
      toast({
        title: t("documentUpdated"),
        description: t("documentUpdatedDesc"),
      })
    } else {
      const newDocument: Document = {
        id: uuidv4(),
        ...documentData,
        reminderDays: [90, 60, 30, 7, 1],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.id || "",
      }
      allDocuments.push(newDocument)
      await storage.documents.save(allDocuments)
      toast({
        title: t("documentAdded"),
        description: t("documentAddedDesc"),
      })
    }

    loadDocuments()
    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (doc: Document) => {
    setEditingDocument(doc)
    setFormData({
      employeeId: doc.employeeId,
      documentType: doc.documentType,
      documentNumber: doc.documentNumber,
      issueDate: doc.issueDate,
      expiryDate: doc.expiryDate,
      notes: doc.notes || "",
      passportLocation: doc.passportLocation || "",
      visaType: doc.visaType || "",
      responsibleAuthority: doc.responsibleAuthority || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    await storage.documents.delete(id)
    loadDocuments()
    toast({
      title: t("documentDeleted"),
      description: t("documentDeletedDesc"),
    })
  }

  const resetForm = () => {
    setFormData({
      employeeId: user?.role === "employee" ? user.employeeId || "" : "",
      documentType: "",
      documentNumber: "",
      issueDate: "",
      expiryDate: "",
      notes: "",
      passportLocation: "",
      visaType: "",
      responsibleAuthority: "",
    })
    setEditingDocument(null)
    setSelectedFile(null)
  }

  const handleOpenDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t("documentsTitle")}</h1>
              <p className="text-muted-foreground mt-1">
                {isAdmin ? t("documentsSubtitleAdmin") : t("documentsSubtitleEmployee")}
              </p>
            </div>
            {isAdmin && (
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open)
                  if (!open) resetForm()
                }}
              >
                <DialogTrigger asChild>
                  <Button onClick={handleOpenDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("addDocument")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingDocument ? t("editDocument") : t("addNewDocument")}</DialogTitle>
                    <DialogDescription>
                      {editingDocument ? t("updateDocumentInfo") : t("enterDocumentDetails")}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="employeeId">{t("employee")} *</Label>
                        <Select
                          value={formData.employeeId}
                          onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectEmployee")} />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {locale === "ar" ? emp.nameAr : emp.nameEn || emp.nameAr} ({emp.employeeNumber})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="documentType">{t("documentType")} *</Label>
                        <Select
                          value={formData.documentType}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              documentType: value,
                              passportLocation: "",
                              visaType: "",
                              responsibleAuthority: "",
                            })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectType")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Passport">{t("passport")}</SelectItem>
                            <SelectItem value="Visa">{t("visa")}</SelectItem>
                            <SelectItem value="Permit">{locale === "ar" ? "تصريح" : "Permit"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.documentType === "Passport" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="documentNumber">
                              {locale === "ar" ? "رقم جواز السفر" : "Passport Number"} *
                            </Label>
                            <Input
                              id="documentNumber"
                              value={formData.documentNumber}
                              onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                              placeholder={locale === "ar" ? "أدخل رقم جواز السفر" : "Enter passport number"}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="passportLocation">{t("passportLocation")} *</Label>
                            <Input
                              id="passportLocation"
                              value={formData.passportLocation}
                              onChange={(e) => setFormData({ ...formData, passportLocation: e.target.value })}
                              placeholder={locale === "ar" ? "أدخل موقع جواز السفر" : "Enter passport location"}
                              required
                            />
                          </div>
                        </>
                      )}

                      {formData.documentType === "Visa" && (
                        <div className="space-y-2">
                          <Label htmlFor="visaType">{t("visaType")} *</Label>
                          <Select
                            value={formData.visaType}
                            onValueChange={(value) => setFormData({ ...formData, visaType: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={locale === "ar" ? "اختر نوع التأشيرة" : "Select visa type"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="US">US</SelectItem>
                              <SelectItem value="UK">UK</SelectItem>
                              <SelectItem value="UR">UR</SelectItem>
                              <SelectItem value="JP">JP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {formData.documentType === "Permit" && (
                        <div className="space-y-2">
                          <Label htmlFor="responsibleAuthority">{t("responsibleAuthority")} *</Label>
                          <Input
                            id="responsibleAuthority"
                            value={formData.responsibleAuthority}
                            onChange={(e) => setFormData({ ...formData, responsibleAuthority: e.target.value })}
                            placeholder={locale === "ar" ? "أدخل الجهة المسؤولة" : "Enter responsible authority"}
                            required
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="issueDate">{t("issueDate")} *</Label>
                          <Input
                            id="issueDate"
                            type="date"
                            value={formData.issueDate}
                            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="expiryDate">{t("expiryDate")} *</Label>
                          <Input
                            id="expiryDate"
                            type="date"
                            value={formData.expiryDate}
                            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="file">
                          {locale === "ar" ? "رفع المستند (PDF، اختياري)" : "Upload Document (PDF, optional)"}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="file"
                            type="file"
                            accept=".pdf"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className="cursor-pointer"
                          />
                          {selectedFile && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <File className="h-4 w-4" />
                              <span>{selectedFile.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">
                          {t("notes")} ({t("optional")})
                        </Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder={t("addAdditionalNotes")}
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">
                        {editingDocument ? t("update") : t("add")} {t("documentsTitle")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("searchDocuments")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={filterStatus === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus("all")}
                  >
                    {t("all")}
                  </Button>
                  <Button
                    variant={filterStatus === "valid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus("valid")}
                  >
                    {t("valid")}
                  </Button>
                  <Button
                    variant={filterStatus === "expiring_soon" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus("expiring_soon")}
                  >
                    {t("expiringSoon")}
                  </Button>
                  <Button
                    variant={filterStatus === "expired" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus("expired")}
                  >
                    {t("expired")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {groupedDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">{t("noDocumentsFound")}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchQuery || filterStatus !== "all"
                      ? locale === "ar"
                        ? "حاول تعديل البحث أو الفلاتر"
                        : "Try adjusting your search or filters"
                      : locale === "ar"
                        ? "لم تتم إضافة أي مستندات بعد"
                        : "No documents have been added yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedDocuments.map((group) => {
                    const isExpanded = expandedEmployees.has(group.employee.id)
                    return (
                      <div key={group.employee.id} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleEmployee(group.employee.id)}
                          className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div className="text-left">
                              <div className="font-semibold">
                                {locale === "ar"
                                  ? group.employee.nameAr
                                  : group.employee.nameEn || group.employee.nameAr}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {t("employeeNumber")}: {group.employee.employeeNumber} • {group.documents.length}{" "}
                                {locale === "ar" ? "مستند" : "document"}
                                {group.documents.length !== 1 ? (locale === "ar" ? "ات" : "s") : ""}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {group.expiredCount > 0 && (
                              <Badge variant="destructive">
                                {group.expiredCount} {t("expired")}
                              </Badge>
                            )}
                            {group.expiringSoonCount > 0 && (
                              <Badge className="bg-yellow-500 hover:bg-yellow-600">
                                {group.expiringSoonCount} {t("expiringSoon")}
                              </Badge>
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 space-y-3 bg-background">
                            {group.documents.map((doc) => {
                              const daysUntilExpiry = getDaysUntilExpiry(doc.expiryDate)
                              return (
                                <Card
                                  key={doc.id}
                                  className="border-l-4"
                                  style={{ borderLeftColor: getStatusColor(doc.status) }}
                                >
                                  <CardContent className="p-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                      <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h3 className="font-semibold">
                                            {locale === "ar"
                                              ? doc.documentType === "Passport"
                                                ? "جواز السفر"
                                                : doc.documentType === "Visa"
                                                  ? "التأشيرة"
                                                  : "تصريح"
                                              : doc.documentType}
                                          </h3>
                                          <Badge className={getStatusBadgeColor(doc.status)}>
                                            {doc.status === "expired"
                                              ? t("expired")
                                              : doc.status === "expiring_soon"
                                                ? t("expiringSoon")
                                                : t("valid")}
                                          </Badge>
                                        </div>
                                        <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                                          {doc.documentType === "Passport" && doc.documentNumber && (
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium">
                                                {locale === "ar" ? "رقم جواز السفر" : "Passport #"}:
                                              </span>
                                              <span>{doc.documentNumber}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span className="font-medium">{t("issueDate")}:</span>
                                            <span>{formatDate(doc.issueDate, locale)}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span className="font-medium">{t("expiryDate")}:</span>
                                            <span>{formatDate(doc.expiryDate, locale)}</span>
                                          </div>
                                        </div>
                                        {doc.notes && (
                                          <div className="flex items-start gap-2 text-sm">
                                            <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                            <span className="text-muted-foreground">{doc.notes}</span>
                                          </div>
                                        )}
                                        {doc.documentType === "Passport" && doc.passportLocation && (
                                          <div className="flex items-start gap-2 text-sm">
                                            <File className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                            <span className="text-muted-foreground">
                                              {t("passportLocation")}: {doc.passportLocation}
                                            </span>
                                          </div>
                                        )}
                                        {doc.documentType === "Visa" && doc.visaType && (
                                          <div className="flex items-start gap-2 text-sm">
                                            <File className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                            <span className="text-muted-foreground">
                                              {t("visaType")}: {doc.visaType}
                                            </span>
                                          </div>
                                        )}
                                        {doc.documentType === "Permit" && doc.responsibleAuthority && (
                                          <div className="flex items-start gap-2 text-sm">
                                            <File className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                            <span className="text-muted-foreground">
                                              {t("responsibleAuthority")}: {doc.responsibleAuthority}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <div className="text-2xl font-bold">
                                            {daysUntilExpiry < 0 ? (
                                              <span className="text-red-600 dark:text-red-400">{t("expired")}</span>
                                            ) : (
                                              <span
                                                className={
                                                  daysUntilExpiry <= 30
                                                    ? "text-red-600 dark:text-red-400"
                                                    : daysUntilExpiry <= 90
                                                      ? "text-yellow-600 dark:text-yellow-400"
                                                      : "text-green-600 dark:text-green-400"
                                                }
                                              >
                                                {daysUntilExpiry}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm text-muted-foreground">
                                            {daysUntilExpiry < 0 ? t("daysAgo") : t("daysRemaining")}
                                          </p>
                                        </div>
                                        {isAdmin && (
                                          <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(doc)}>
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

function getStatusColor(status: string): string {
  switch (status) {
    case "valid":
      return "#10b981"
    case "expiring_soon":
      return "#f59e0b"
    case "expired":
      return "#ef4444"
    default:
      return "#6b7280"
  }
}
