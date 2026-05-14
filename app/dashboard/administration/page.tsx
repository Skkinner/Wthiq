"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useLocale } from "@/contexts/locale-context"
import { useTranslations } from "@/lib/i18n"
import { storage } from "@/lib/storage"
import type { User } from "@/lib/types"
import { validatePassword } from "@/lib/password-validation"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Search, Plus, Pencil, Trash2, Users, UserCog, Shield, Database } from "lucide-react"
import { formatDate } from "@/lib/i18n"
import { setupDatabase } from "@/lib/database-setup"
import { v4 as uuidv4 } from "uuid"
import { migratePasswordsToSupabase } from "@/lib/migrate-passwords"

export default function AdministrationPage() {
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const { locale } = useLocale()
  const { t, isRTL } = useTranslations(locale)
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    nameAr: "",
    nameEn: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "employee" as "admin" | "employee",
  })
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [isSettingUpDb, setIsSettingUpDb] = useState(false)
  const [showDbSetupDialog, setShowDbSetupDialog] = useState(false)
  const [dbSetupResult, setDbSetupResult] = useState<any>(null)
  const [isMigratingPasswords, setIsMigratingPasswords] = useState(false)
  const [showPasswordMigrationDialog, setShowPasswordMigrationDialog] = useState(false)
  const [passwordMigrationResult, setPasswordMigrationResult] = useState<any>(null)

  useEffect(() => {
    if (currentUser?.role !== "admin") {
      router.push("/dashboard")
    }
  }, [currentUser, router])

  useEffect(() => {
    loadUsers()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUsers()
      }
    }

    const handleFocus = () => {
      loadUsers()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [])

  if (currentUser?.role !== "admin") {
    return null
  }

  const loadUsers = async () => {
    try {
      const users = await storage.users.getAll()
      setUsers(users)
    } catch (error) {
      console.error("Error loading users:", error)
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password })

    if (password) {
      const previousPasswords = editingUser?.passwordHistory ?? []
      const validation = validatePassword(password, previousPasswords)
      setPasswordErrors(validation.errors)
    } else {
      setPasswordErrors([])
    }
  }

  const handleAddUser = async () => {
    if (!formData.nameAr || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      toast({
        title: t("error"),
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t("error"),
        description: t("passwordsMustMatch"),
        variant: "destructive",
      })
      return
    }

    const validation = validatePassword(formData.password, [])
    if (!validation.isValid) {
      toast({
        title: t("error"),
        description: validation.errors.map((err) => t(err as any)).join(" "),
        variant: "destructive",
      })
      return
    }

    const allUsers = await storage.users.getAll()

    if (allUsers.some((u) => u.email === formData.email)) {
      toast({
        title: t("error"),
        description: "Email already exists",
        variant: "destructive",
      })
      return
    }

    const newUser: User = {
      id: uuidv4(),
      email: formData.email,
      password: formData.password,
      role: formData.role,
      name: formData.nameAr,
      nameEn: formData.nameEn || undefined,
      phone: formData.phone,
      passwordHistory: [formData.password],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    allUsers.push(newUser)
    await storage.users.save(allUsers)

    loadUsers()

    toast({
      title: t("userAdded"),
      description: t("userAddedDesc"),
    })

    setIsAddDialogOpen(false)
    setFormData({ nameAr: "", nameEn: "", email: "", phone: "", password: "", confirmPassword: "", role: "employee" })
    setPasswordErrors([])
  }

  const handleEditUser = async () => {
    if (!editingUser || !formData.email) {
      return
    }

    const allUsers = await storage.users.getAll()
    const userIndex = allUsers.findIndex((u) => u.id === editingUser.id)

    if (userIndex === -1) return

    if (
      formData.email !== editingUser.email &&
      allUsers.some((u) => u.email === formData.email && u.id !== editingUser.id)
    ) {
      toast({
        title: t("error"),
        description: "Email already exists",
        variant: "destructive",
      })
      return
    }

    if (formData.password) {
      const previousPasswords = editingUser?.passwordHistory ?? []
      const validation = validatePassword(formData.password, previousPasswords)
      if (!validation.isValid) {
        toast({
          title: t("error"),
          description: validation.errors.map((err) => t(err as any)).join(" "),
          variant: "destructive",
        })
        return
      }
    }

    const updatedPasswordHistory = formData.password
      ? [...(editingUser?.passwordHistory ?? []), formData.password]
      : (editingUser?.passwordHistory ?? [])

    allUsers[userIndex] = {
      ...allUsers[userIndex],
      email: formData.email,
      role: formData.role,
      name: formData.nameAr,
      nameEn: formData.nameEn || undefined,
      phone: formData.phone,
      updatedAt: new Date().toISOString(),
      passwordHistory: updatedPasswordHistory,
      ...(formData.password && { password: formData.password }),
    }

    await storage.users.save(allUsers)
    loadUsers()

    toast({
      title: t("userUpdated"),
      description: t("userUpdatedDesc"),
    })

    setIsEditDialogOpen(false)
    setEditingUser(null)
    setFormData({ nameAr: "", nameEn: "", email: "", phone: "", password: "", confirmPassword: "", role: "employee" })
    setPasswordErrors([])
  }

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: t("error"),
        description: "Cannot delete your own account",
        variant: "destructive",
      })
      return
    }

    // Delete all tasks created by this user
    const allTasks = await storage.tasks.getAll()
    const userTasks = allTasks.filter((t) => t.createdById === userId)

    for (const task of userTasks) {
      await storage.tasks.delete(task.id)
    }

    // Delete the user
    await storage.users.delete(userId)
    loadUsers()

    toast({
      title: t("userDeleted"),
      description: t("userDeletedDesc"),
    })
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setFormData({
      nameAr: user.name || "",
      nameEn: user.nameEn || "", // Load English name when editing
      email: user.email,
      phone: user.phone || "",
      password: "",
      confirmPassword: "",
      role: user.role,
    })
    setPasswordErrors([])
    setIsEditDialogOpen(true)
  }

  const getRoleLabel = (role: "admin" | "employee") => {
    return role === "admin" ? t("admin") : t("employee")
  }

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    employees: users.filter((u) => u.role === "employee").length,
  }

  const handleDatabaseSetup = async () => {
    setIsSettingUpDb(true)
    setShowDbSetupDialog(true)
    setDbSetupResult(null)

    try {
      const result = await setupDatabase()
      setDbSetupResult(result)

      if (result.success) {
        toast({
          title: "Database Setup Successful",
          description: result.message,
        })
      } else {
        toast({
          title: "Database Setup Incomplete",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Database Setup Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSettingUpDb(false)
    }
  }

  const handlePasswordMigration = async () => {
    setIsMigratingPasswords(true)
    setShowPasswordMigrationDialog(true)
    setPasswordMigrationResult(null)

    try {
      const result = await migratePasswordsToSupabase()
      setPasswordMigrationResult(result)

      if (result.success) {
        toast({
          title: "Password Migration Successful",
          description: `Successfully migrated ${result.migrated} user passwords to Supabase`,
        })
      } else {
        toast({
          title: "Password Migration Incomplete",
          description: `Migrated ${result.migrated} passwords, ${result.failed} failed`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Password Migration Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsMigratingPasswords(false)
    }
  }

  return (
    <ProtectedRoute requireAdmin>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("administration")}</h1>
            <p className="text-muted-foreground mt-1">{t("administrationSubtitle")}</p>
          </div>

          <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Setup
                  </CardTitle>
                  <CardDescription>Create all required database tables in Supabase</CardDescription>
                </div>
                <Button onClick={handleDatabaseSetup} disabled={isSettingUpDb} variant="default">
                  {isSettingUpDb ? "Setting up..." : "Setup Database"}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Password Migration
                  </CardTitle>
                  <CardDescription>Sync existing user passwords from localStorage to Supabase</CardDescription>
                </div>
                <Button onClick={handlePasswordMigration} disabled={isMigratingPasswords} variant="default">
                  {isMigratingPasswords ? "Migrating..." : "Migrate Passwords"}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">{t("totalUsers")}</h3>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">{t("admin")}</h3>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.admins}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">{t("employee")}</h3>
                <UserCog className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.employees}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>{t("userManagement")}</CardTitle>
                  <CardDescription>{t("manageSystemUsers")}</CardDescription>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className={isRTL ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                  {t("addUser")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-3 h-4 w-4 text-muted-foreground`} />
                  <Input
                    placeholder={t("searchUsers")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={isRTL ? "pr-9" : "pl-9"}
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">{t("fullNameAr")}</TableHead>
                      <TableHead className="font-semibold">{t("fullNameEn")}</TableHead>
                      <TableHead className="font-semibold">{t("userEmail")}</TableHead>
                      <TableHead className="font-semibold">{t("userPhone")}</TableHead>
                      <TableHead className="font-semibold">{t("userRole")}</TableHead>
                      <TableHead className="font-semibold">{t("dateCreated")}</TableHead>
                      <TableHead className="text-end font-semibold">{t("manage")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          {t("noUsersFound")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name || "-"}</TableCell>
                          <TableCell>{user.nameEn || "-"}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone || "-"}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                              {getRoleLabel(user.role)}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt, locale)}</TableCell>
                          <TableCell className="text-end">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={user.id === currentUser?.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("addNewUser")}</DialogTitle>
                <DialogDescription>{t("enterUserDetails")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="add-name-ar">
                    {t("fullNameArabic")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="add-name-ar"
                    placeholder={t("enterFullNameArabic")}
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-name-en">
                    {t("fullNameEnglish")} <span className="text-muted-foreground text-sm">({t("optional")})</span>
                  </Label>
                  <Input
                    id="add-name-en"
                    placeholder={t("enterFullNameEnglish")}
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-email">
                    {t("email")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="add-email"
                    type="email"
                    placeholder={t("enterEmail")}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-phone">
                    {t("phone")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="add-phone"
                    type="tel"
                    placeholder={t("enterPhoneNumber")}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-password">
                    {t("password")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="add-password"
                    type="password"
                    placeholder={t("enterPassword")}
                    value={formData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t("passwordHelperText")}</p>
                  {passwordErrors.length > 0 && (
                    <div className="space-y-1">
                      {passwordErrors.map((error, index) => (
                        <p key={index} className="text-xs text-red-500">
                          {t(error as any)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-confirm-password">
                    {t("confirmPassword")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="add-confirm-password"
                    type="password"
                    placeholder={t("enterConfirmPassword")}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-role">
                    {t("role")} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "admin" | "employee") => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger id="add-role">
                      <SelectValue placeholder={t("selectRole")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t("admin")}</SelectItem>
                      <SelectItem value="employee">{t("employee")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleAddUser}>{t("add")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("editUser")}</DialogTitle>
                <DialogDescription>{t("updateUserInfo")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name-ar">
                    {t("fullNameArabic")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name-ar"
                    placeholder={t("enterFullNameArabic")}
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name-en">
                    {t("fullNameEnglish")} <span className="text-muted-foreground text-sm">({t("optional")})</span>
                  </Label>
                  <Input
                    id="edit-name-en"
                    placeholder={t("enterFullNameEnglish")}
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">{t("email")}</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder={t("enterEmail")}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password">{t("password")}</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    placeholder={t("enterNewPassword")}
                    value={formData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t("passwordOptional")}</p>
                  <p className="text-xs text-muted-foreground">{t("passwordHelperText")}</p>
                  {passwordErrors.length > 0 && (
                    <div className="space-y-1">
                      {passwordErrors.map((error, index) => (
                        <p key={index} className="text-xs text-red-500">
                          {t(error as any)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">{t("role")}</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "admin" | "employee") => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger id="edit-role">
                      <SelectValue placeholder={t("selectRole")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t("admin")}</SelectItem>
                      <SelectItem value="employee">{t("employee")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleEditUser}>{t("update")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showDbSetupDialog} onOpenChange={setShowDbSetupDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Database Setup Status</DialogTitle>
                <DialogDescription>
                  {isSettingUpDb ? "Checking database..." : "Setup check completed"}
                </DialogDescription>
              </DialogHeader>
              {isSettingUpDb ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : dbSetupResult ? (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-lg ${dbSetupResult.success ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900" : "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900"}`}
                  >
                    <p className="font-semibold">{dbSetupResult.message}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Table Status:</h4>
                    <div className="grid gap-2">
                      {Object.entries(dbSetupResult.details.tablesStatus).map(([table, exists]) => (
                        <div key={table} className="flex justify-between p-2 bg-muted rounded">
                          <span className="capitalize">{table}:</span>
                          <span
                            className={exists ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
                          >
                            {exists ? "✓ Exists" : "✗ Missing"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!dbSetupResult.success && dbSetupResult.details.sqlScript && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">SQL Script to Run:</h4>
                      <div className="relative">
                        <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto">
                          {dbSetupResult.details.sqlScript}
                        </pre>
                        <Button
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            navigator.clipboard.writeText(dbSetupResult.details.sqlScript)
                            toast({
                              title: "Copied!",
                              description: "SQL script copied to clipboard",
                            })
                          }}
                        >
                          Copy SQL
                        </Button>
                      </div>
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                        <p className="text-sm font-semibold mb-2">Instructions:</p>
                        <ol className="text-sm space-y-1 list-decimal list-inside">
                          <li>Click "Copy SQL" button above</li>
                          <li>
                            Go to your{" "}
                            <a
                              href="https://supabase.com/dashboard/project/_/sql"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 underline"
                            >
                              Supabase SQL Editor
                            </a>
                          </li>
                          <li>Paste the SQL script</li>
                          <li>Click "Run" to execute</li>
                          <li>Return here and click "Setup Database" again to verify</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
              <DialogFooter>
                <Button onClick={() => setShowDbSetupDialog(false)} disabled={isSettingUpDb}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showPasswordMigrationDialog} onOpenChange={setShowPasswordMigrationDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Password Migration Status</DialogTitle>
                <DialogDescription>
                  {isMigratingPasswords ? "Migrating passwords..." : "Migration completed"}
                </DialogDescription>
              </DialogHeader>
              {isMigratingPasswords ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : passwordMigrationResult ? (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-lg ${passwordMigrationResult.success ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900" : "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900"}`}
                  >
                    <p className="font-semibold">
                      {passwordMigrationResult.success
                        ? `Successfully migrated ${passwordMigrationResult.migrated} passwords`
                        : `Migrated ${passwordMigrationResult.migrated} passwords, ${passwordMigrationResult.failed} failed`}
                    </p>
                  </div>

                  {passwordMigrationResult.results && passwordMigrationResult.results.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Migration Results:</h4>
                      <div className="grid gap-2 max-h-64 overflow-y-auto">
                        {passwordMigrationResult.results.map((result: any, index: number) => (
                          <div key={index} className="flex justify-between p-2 bg-muted rounded text-sm">
                            <span>{result.email}</span>
                            <span
                              className={
                                result.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              }
                            >
                              {result.success ? "✓ Success" : `✗ ${result.error}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
              <DialogFooter>
                <Button onClick={() => setShowPasswordMigrationDialog(false)} disabled={isMigratingPasswords}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
