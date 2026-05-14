"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { storage } from "@/lib/storage"
import type { Employee } from "@/lib/types"
import { Plus, Search, Edit, Trash2, Users } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { useToast } from "@/hooks/use-toast"
import { useLocale } from "@/contexts/locale-context"
import { useTranslations } from "@/lib/i18n"

export default function EmployeesPage() {
  const { locale } = useLocale()
  const { t } = useTranslations(locale)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    nameAr: "",
    nameEn: "",
    nationalId: "",
    nationality: "",
    phone: "",
    email: "",
    department: "",
    position: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      const employees = await storage.employees.getAll()
      setEmployees(employees)
    } catch (error) {
      console.error("Error loading employees:", error)
    }
  }

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.nameAr.includes(searchQuery) ||
      (emp.nameEn && emp.nameEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      emp.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.nationalId.includes(searchQuery) ||
      emp.nationality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const generateEmployeeNumber = async () => {
    const allEmployees = await storage.employees.getAll()
    if (allEmployees.length === 0) return "EMP001"

    const numbers = allEmployees
      .map((emp) => Number.parseInt(emp.employeeNumber.replace("EMP", "")))
      .filter((num) => !isNaN(num))

    const maxNumber = Math.max(...numbers, 0)
    return `EMP${String(maxNumber + 1).padStart(3, "0")}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const allEmployees = await storage.employees.getAll()

    if (editingEmployee) {
      const updatedEmployees = allEmployees.map((emp) =>
        emp.id === editingEmployee.id
          ? {
              ...emp,
              ...formData,
              updatedAt: new Date().toISOString(),
            }
          : emp,
      )
      await storage.employees.save(updatedEmployees)
      toast({
        title: t("employeeUpdated"),
        description: t("employeeUpdatedDesc"),
      })
    } else {
      const newEmployee: Employee = {
        id: uuidv4(),
        employeeNumber: await generateEmployeeNumber(),
        ...formData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      allEmployees.push(newEmployee)
      await storage.employees.save(allEmployees)
      toast({
        title: t("employeeAdded"),
        description: `${t("employeeAddedDesc")} ${newEmployee.employeeNumber}`,
      })
    }

    loadEmployees()
    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      nameAr: employee.nameAr,
      nameEn: employee.nameEn || "",
      nationalId: employee.nationalId,
      nationality: employee.nationality,
      phone: employee.phone,
      email: employee.email || "",
      department: employee.department || "",
      position: employee.position || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    // Delete all documents for this employee
    const allDocuments = await storage.documents.getAll()
    const employeeDocuments = allDocuments.filter((doc) => doc.employeeId === id)

    for (const doc of employeeDocuments) {
      await storage.documents.delete(doc.id)
    }

    // Delete the employee
    await storage.employees.delete(id)
    loadEmployees()
    toast({
      title: t("employeeDeleted"),
      description: t("employeeDeletedDesc"),
    })
  }

  const handleStatusToggle = async (employee: Employee) => {
    const allEmployees = await storage.employees.getAll()
    const updatedEmployees = allEmployees.map((emp) =>
      emp.id === employee.id
        ? {
            ...emp,
            isActive: !emp.isActive,
            updatedAt: new Date().toISOString(),
          }
        : emp,
    )
    await storage.employees.save(updatedEmployees)
    loadEmployees()
    toast({
      title: t("status") + " " + t("update"),
      description: `${t("employee")} ${employee.employeeNumber} ${!employee.isActive ? t("active") : t("inactive")}.`,
    })
  }

  const resetForm = () => {
    setFormData({
      nameAr: "",
      nameEn: "",
      nationalId: "",
      nationality: "",
      phone: "",
      email: "",
      department: "",
      position: "",
    })
    setEditingEmployee(null)
  }

  const stats = {
    total: employees.length,
    active: employees.filter((emp) => emp.isActive).length,
    inactive: employees.filter((emp) => !emp.isActive).length,
  }

  return (
    <ProtectedRoute requireAdmin>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t("employeesTitle")}</h1>
              <p className="text-muted-foreground mt-1">{t("employeesSubtitle")}</p>
            </div>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) resetForm()
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("addEmployee")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingEmployee ? t("editEmployee") : t("addNewEmployee")}</DialogTitle>
                  <DialogDescription>
                    {editingEmployee ? t("updateEmployeeInfo") : t("enterEmployeeDetails")}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nameAr">{t("nameAr")} *</Label>
                      <Input
                        id="nameAr"
                        value={formData.nameAr}
                        onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                        required
                        dir="rtl"
                        placeholder="الاسم الكامل بالعربي"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nameEn">{t("nameEn")}</Label>
                      <Input
                        id="nameEn"
                        value={formData.nameEn}
                        onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                        placeholder={`${t("nameEn")} (${t("optional")})`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nationalId">{t("nationalId")} *</Label>
                        <Input
                          id="nationalId"
                          value={formData.nationalId}
                          onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                          required
                          placeholder="1234567890"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nationality">{t("nationality")} *</Label>
                        <Input
                          id="nationality"
                          value={formData.nationality}
                          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                          required
                          placeholder="Saudi Arabia"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t("phone")} *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                          placeholder="+966501234567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("email")}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder={`${t("email")} (${t("optional")})`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="department">{t("department")}</Label>
                        <Input
                          id="department"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder={`${t("department")} (${t("optional")})`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="position">{t("position")}</Label>
                        <Input
                          id="position"
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          placeholder={`${t("position")} (${t("optional")})`}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">
                      {editingEmployee ? t("update") : t("add")} {t("employee")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">{t("totalEmployees")}</h3>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">{t("active")}</h3>
                <Badge variant="default" className="h-5">
                  {t("active")}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">{t("inactive")}</h3>
                <Badge variant="secondary" className="h-5">
                  {t("inactive")}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.inactive}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("searchEmployees")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">{t("employeeNumber")}</TableHead>
                    <TableHead className="font-semibold">{t("nameAr")}</TableHead>
                    <TableHead className="font-semibold">{t("nameEn")}</TableHead>
                    <TableHead className="font-semibold">{t("nationalId")}</TableHead>
                    <TableHead className="font-semibold">{t("nationality")}</TableHead>
                    <TableHead className="font-semibold">{t("phone")}</TableHead>
                    <TableHead className="font-semibold">{t("status")}</TableHead>
                    <TableHead className="text-end font-semibold">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        {t("noEmployeesFound")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.employeeNumber}</TableCell>
                        <TableCell dir="rtl">{employee.nameAr}</TableCell>
                        <TableCell>{employee.nameEn || "-"}</TableCell>
                        <TableCell>{employee.nationalId}</TableCell>
                        <TableCell>{employee.nationality}</TableCell>
                        <TableCell>{employee.phone}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={employee.isActive}
                              onCheckedChange={() => handleStatusToggle(employee)}
                              aria-label="Toggle employee status"
                            />
                            <Badge
                              variant={employee.isActive ? "default" : "secondary"}
                              className="min-w-[70px] justify-center"
                            >
                              {employee.isActive ? t("active") : t("inactive")}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-end">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(employee.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
