"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { storage } from "@/lib/storage"
import type { Task, TaskStatus, TaskPriority, User as UserType } from "@/lib/types"
import { Plus, Search, Edit, Trash2, CheckSquare, Clock, AlertCircle, CheckCircle2, User } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useLocale } from "@/contexts/locale-context"
import { useTranslations, formatDate } from "@/lib/i18n"

export default function TasksPage() {
  const { user } = useAuth()
  const { locale } = useLocale()
  const { t } = useTranslations(locale)
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newUpdate, setNewUpdate] = useState("")

  const { toast } = useToast()

  const [formData, setFormData] = useState({
    taskLabel: "",
    description: "",
    status: "pending" as TaskStatus,
    priority: "medium" as TaskPriority,
    receiptDate: new Date().toISOString().split("T")[0],
    deadline: "",
    notes: "",
  })

  useEffect(() => {
    if (!user) return

    loadTasks()
    loadUsers()

    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadTasks()
        loadUsers()
      }
    }

    const handleFocus = () => {
      if (user) {
        loadTasks()
        loadUsers()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [user])

  const loadTasks = async () => {
    if (!user) return

    try {
      const tasks = await storage.tasks.getAll()

      if (user.role === "employee") {
        const myTasks = tasks.filter((task) => task.assignedToId === user.id)
        setTasks(myTasks)
      } else {
        setTasks(tasks)
      }
    } catch (error) {
      console.error("Error loading tasks:", error)
    }
  }

  const loadUsers = async () => {
    try {
      const users = await storage.users.getAll()
      setUsers(users)
    } catch (error) {
      console.error("Error loading users:", error)
    }
  }

  const getDaysRemaining = (deadline: string): number => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(deadline)
    deadlineDate.setHours(0, 0, 0, 0)
    const diffTime = deadlineDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
      case "medium":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "low":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const taskLabel = (task.taskLabel || "").toLowerCase()
    const description = (task.description || "").toLowerCase()
    const search = searchQuery.toLowerCase()

    const matchesSearch = taskLabel.includes(search) || description.includes(search)

    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const groupedTasks = filteredTasks.reduce(
    (acc, task) => {
      const userId = task.assignedToId || "unassigned"
      if (!acc[userId]) {
        acc[userId] = []
      }
      acc[userId].push(task)
      return acc
    },
    {} as Record<string, Task[]>,
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: locale === "ar" ? "خطأ" : "Error",
        description: locale === "ar" ? "لم يتم العثور على المستخدم" : "User not found",
        variant: "destructive",
      })
      return
    }

    const allTasks = await storage.tasks.getAll()

    if (editingTask) {
      const updatedTasks = allTasks.map((task) =>
        task.id === editingTask.id
          ? {
              ...task,
              ...formData,
              updatedAt: new Date().toISOString(),
            }
          : task,
      )
      await storage.tasks.save(updatedTasks)
      toast({
        title: t("taskUpdated"),
        description: t("taskUpdatedDesc"),
      })
    } else {
      const newTask: Task = {
        id: uuidv4(),
        ...formData,
        assignedToId: user.id,
        updates: [locale === "ar" ? "تم إنشاء المهمة" : "Task created"],
        createdById: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      allTasks.push(newTask)
      await storage.tasks.save(allTasks)

      toast({
        title: t("taskCreated"),
        description: t("taskCreatedDesc"),
      })
    }

    loadTasks()
    resetForm()
    setIsDialogOpen(false)
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      taskLabel: task.taskLabel,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      receiptDate: task.receiptDate,
      deadline: task.deadline,
      notes: task.notes || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    await storage.tasks.delete(id)
    loadTasks()
    toast({
      title: t("taskDeleted"),
      description: t("taskDeletedDesc"),
    })
  }

  const handleMarkComplete = async (task: Task) => {
    const allTasks = await storage.tasks.getAll()
    const updatedTasks = allTasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            status: "completed" as TaskStatus,
            actualDeliveryDate: new Date().toISOString().split("T")[0],
            updates: [...t.updates, "Task marked as completed"],
            updatedAt: new Date().toISOString(),
          }
        : t,
    )
    storage.tasks.save(updatedTasks)
    loadTasks()
    toast({
      title: t("taskCompleted"),
      description: t("taskCompletedDesc"),
    })
  }

  const handleAddUpdate = () => {
    if (!selectedTask || !newUpdate.trim()) return

    const allTasks = storage.tasks.getAllSync()
    const updatedTasks = allTasks.map((task) =>
      task.id === selectedTask.id
        ? {
            ...task,
            updates: [...task.updates, newUpdate],
            updatedAt: new Date().toISOString(),
          }
        : task,
    )
    storage.tasks.save(updatedTasks)
    loadTasks()
    setNewUpdate("")
    setIsUpdateDialogOpen(false)
    toast({
      title: t("updateAdded"),
      description: t("updateAddedDesc"),
    })
  }

  const resetForm = () => {
    setFormData({
      taskLabel: "",
      description: "",
      status: "pending",
      priority: "medium",
      receiptDate: new Date().toISOString().split("T")[0],
      deadline: "",
      notes: "",
    })
    setEditingTask(null)
  }

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter((t) => t.status !== "completed" && getDaysRemaining(t.deadline) < 0).length,
  }

  const isEmployee = user?.role === "employee"
  const isAdmin = user?.role === "admin"

  const getUserName = (userId: string) => {
    const taskUser = users.find((u) => u.id === userId)
    return taskUser ? taskUser.name || taskUser.email : t("unknown")
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t("tasksTitle")}</h1>
              <p className="text-muted-foreground mt-1">{t("tasksSubtitle")}</p>
            </div>
            {isEmployee && (
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
                    {t("addTask")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingTask ? t("editTask") : t("createNewTask")}</DialogTitle>
                    <DialogDescription>{editingTask ? t("updateTaskInfo") : t("createTask")}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="taskLabel">{t("taskName")} *</Label>
                        <Input
                          id="taskLabel"
                          value={formData.taskLabel}
                          onChange={(e) => setFormData({ ...formData, taskLabel: e.target.value })}
                          required
                          placeholder={t("enterTaskName")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">{t("taskDetails")}</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder={t("describeTask")}
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="status">{t("status")} *</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value as TaskStatus })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">{t("pending")}</SelectItem>
                              <SelectItem value="in_progress">{t("inProgress")}</SelectItem>
                              <SelectItem value="completed">{t("completed")}</SelectItem>
                              <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priority">{t("priority")} *</Label>
                          <Select
                            value={formData.priority}
                            onValueChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">{t("low")}</SelectItem>
                              <SelectItem value="medium">{t("medium")}</SelectItem>
                              <SelectItem value="high">{t("high")}</SelectItem>
                              <SelectItem value="urgent">{t("urgent")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="receiptDate">{t("receiptDate")} *</Label>
                          <Input
                            id="receiptDate"
                            type="date"
                            value={formData.receiptDate}
                            onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deadline">{t("deadline")} *</Label>
                          <Input
                            id="deadline"
                            type="date"
                            value={formData.deadline}
                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">{t("notes")}</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder={t("additionalNotes")}
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">
                        {editingTask ? t("update") : t("create")} {t("tasksTitle")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">{t("totalTasks")}</h3>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">{t("pending")}</h3>
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">{t("inProgress")}</h3>
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">{t("completed")}</h3>
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium">{t("overdue")}</h3>
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("searchTasks")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus | "all")}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={t("status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allStatus")}</SelectItem>
                      <SelectItem value="pending">{t("pending")}</SelectItem>
                      <SelectItem value="in_progress">{t("inProgress")}</SelectItem>
                      <SelectItem value="completed">{t("completed")}</SelectItem>
                      <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={priorityFilter}
                    onValueChange={(value) => setPriorityFilter(value as TaskPriority | "all")}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={t("priority")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("allPriority")}</SelectItem>
                      <SelectItem value="low">{t("low")}</SelectItem>
                      <SelectItem value="medium">{t("medium")}</SelectItem>
                      <SelectItem value="high">{t("high")}</SelectItem>
                      <SelectItem value="urgent">{t("urgent")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(groupedTasks).length === 0 ? (
                <div className="text-center text-muted-foreground py-8">{t("noTasksFound")}</div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedTasks).map(([userId, userTasks]) => (
                    <div key={userId} className="space-y-3">
                      <div className="flex items-center gap-2 border-b pb-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">{getUserName(userId)}</h3>
                        <Badge variant="outline" className="ml-2">
                          {userTasks.length} {userTasks.length === 1 ? "task" : "tasks"}
                        </Badge>
                      </div>

                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-semibold">{t("taskName")}</TableHead>
                              <TableHead className="font-semibold">{t("status")}</TableHead>
                              <TableHead className="font-semibold">{t("priority")}</TableHead>
                              <TableHead className="font-semibold">{t("receiptDate")}</TableHead>
                              <TableHead className="font-semibold">{t("deadline")}</TableHead>
                              <TableHead className="font-semibold">{t("daysRemaining")}</TableHead>
                              <TableHead className="text-end font-semibold">{t("actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userTasks.map((task) => {
                              const daysRemaining = getDaysRemaining(task.deadline)
                              const isOverdue = task.status !== "completed" && daysRemaining < 0

                              return (
                                <TableRow key={task.id}>
                                  <TableCell className="font-medium max-w-[200px]">
                                    <div className="space-y-1">
                                      <p className="font-medium">{task.taskLabel}</p>
                                      {task.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={getStatusColor(task.status)}>
                                      {task.status === "pending"
                                        ? t("pending")
                                        : task.status === "in_progress"
                                          ? t("inProgress")
                                          : task.status === "completed"
                                            ? t("completed")
                                            : t("cancelled")}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={getPriorityColor(task.priority)}>
                                      {task.priority === "low"
                                        ? t("low")
                                        : task.priority === "medium"
                                          ? t("medium")
                                          : task.priority === "high"
                                            ? t("high")
                                            : t("urgent")}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{formatDate(task.receiptDate, locale)}</TableCell>
                                  <TableCell>{formatDate(task.deadline, locale)}</TableCell>
                                  <TableCell>
                                    <span
                                      className={
                                        isOverdue
                                          ? "text-red-600 dark:text-red-400 font-semibold"
                                          : daysRemaining <= 7
                                            ? "text-yellow-600 dark:text-yellow-400 font-semibold"
                                            : ""
                                      }
                                    >
                                      {task.status === "completed"
                                        ? t("completed")
                                        : isOverdue
                                          ? `${Math.abs(daysRemaining)} ${t("daysOverdue")}`
                                          : `${daysRemaining} ${t("days")}`}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-end">
                                    <div className="flex justify-end gap-2">
                                      {isAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedTask(task)
                                            setIsDetailsDialogOpen(true)
                                          }}
                                        >
                                          {t("details")}
                                        </Button>
                                      )}
                                      {!isAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedTask(task)
                                            setIsUpdateDialogOpen(true)
                                          }}
                                        >
                                          {t("updates")}
                                        </Button>
                                      )}
                                      {isEmployee && task.status !== "completed" && (
                                        <Button variant="ghost" size="sm" onClick={() => handleMarkComplete(task)}>
                                          {t("complete")}
                                        </Button>
                                      )}
                                      {isEmployee && (
                                        <>
                                          <Button variant="ghost" size="icon" onClick={() => handleEdit(task)}>
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}>
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Updates Dialog */}
          <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("addUpdate")}</DialogTitle>
                <DialogDescription>{selectedTask?.taskLabel}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Task Summary */}
                <div className="rounded-md border p-4 bg-muted/50 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">{t("status")}</Label>
                      <div className="mt-1">
                        <Badge className={selectedTask ? getStatusColor(selectedTask.status) : ""}>
                          {selectedTask?.status === "pending"
                            ? t("pending")
                            : selectedTask?.status === "in_progress"
                              ? t("inProgress")
                              : selectedTask?.status === "completed"
                                ? t("completed")
                                : t("cancelled")}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("priority")}</Label>
                      <div className="mt-1">
                        <Badge className={selectedTask ? getPriorityColor(selectedTask.priority) : ""}>
                          {selectedTask?.priority === "low"
                            ? t("low")
                            : selectedTask?.priority === "medium"
                              ? t("medium")
                              : selectedTask?.priority === "high"
                                ? t("high")
                                : t("urgent")}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("deadline")}</Label>
                      <p className="mt-1">{selectedTask?.deadline ? formatDate(selectedTask.deadline, locale) : "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("daysRemaining")}</Label>
                      <p className="mt-1">
                        {selectedTask && selectedTask.status !== "completed"
                          ? getDaysRemaining(selectedTask.deadline) >= 0
                            ? `${getDaysRemaining(selectedTask.deadline)} ${t("days")}`
                            : `${Math.abs(getDaysRemaining(selectedTask.deadline))} ${t("daysOverdue")}`
                          : t("completed")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Update History */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("updateHistory")}</Label>
                  <div className="rounded-md border p-4 max-h-[200px] overflow-y-auto space-y-2 bg-muted/30">
                    {selectedTask?.updates && selectedTask.updates.length > 0 ? (
                      selectedTask.updates.map((update, index) => (
                        <div key={index} className="text-sm border-b pb-2 last:border-0">
                          <p>{update}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("noUpdates")}</p>
                    )}
                  </div>
                </div>

                {/* Add New Update */}
                <div className="space-y-2">
                  <Label htmlFor="newUpdate">{t("addNewUpdate")} *</Label>
                  <Textarea
                    id="newUpdate"
                    value={newUpdate}
                    onChange={(e) => setNewUpdate(e.target.value)}
                    placeholder={t("enterUpdateMessage")}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsUpdateDialogOpen(false)
                    setNewUpdate("")
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button onClick={handleAddUpdate} disabled={!newUpdate.trim()}>
                  {t("addUpdate")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Details Dialog */}
          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("viewTaskDetails")}</DialogTitle>
                <DialogDescription>{selectedTask?.taskLabel}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Task Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">{t("taskInformation")}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">{t("taskName")}</Label>
                      <p className="font-medium">{selectedTask?.taskLabel}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">{t("status")}</Label>
                      <div>
                        <Badge className={selectedTask ? getStatusColor(selectedTask.status) : ""}>
                          {selectedTask?.status === "pending"
                            ? t("pending")
                            : selectedTask?.status === "in_progress"
                              ? t("inProgress")
                              : selectedTask?.status === "completed"
                                ? t("completed")
                                : t("cancelled")}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">{t("priority")}</Label>
                      <div>
                        <Badge className={selectedTask ? getPriorityColor(selectedTask.priority) : ""}>
                          {selectedTask?.priority === "low"
                            ? t("low")
                            : selectedTask?.priority === "medium"
                              ? t("medium")
                              : selectedTask?.priority === "high"
                                ? t("high")
                                : t("urgent")}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">{t("assignedTo")}</Label>
                      <p className="font-medium">
                        {selectedTask?.assignedToId ? getUserName(selectedTask.assignedToId) : t("unknown")}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">{t("receiptDate")}</Label>
                      <p>{selectedTask?.receiptDate ? formatDate(selectedTask.receiptDate, locale) : "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">{t("deadline")}</Label>
                      <p>{selectedTask?.deadline ? formatDate(selectedTask.deadline, locale) : "-"}</p>
                    </div>
                    {selectedTask?.actualDeliveryDate && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">{t("actualDeliveryDate")}</Label>
                        <p>{formatDate(selectedTask.actualDeliveryDate, locale)}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">{t("createdBy")}</Label>
                      <p className="font-medium">
                        {selectedTask?.createdById ? getUserName(selectedTask.createdById) : t("unknown")}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">{t("createdOn")}</Label>
                      <p>{selectedTask?.createdAt ? formatDate(selectedTask.createdAt, locale) : "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">{t("lastUpdated")}</Label>
                      <p>{selectedTask?.updatedAt ? formatDate(selectedTask.updatedAt, locale) : "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("description")}</Label>
                  <div className="rounded-md border p-4 bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap">{selectedTask?.description || t("noDescription")}</p>
                  </div>
                </div>

                {/* Notes Section */}
                {selectedTask?.notes && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t("notes")}</Label>
                    <div className="rounded-md border p-4 bg-muted/50">
                      <p className="text-sm whitespace-pre-wrap">{selectedTask.notes}</p>
                    </div>
                  </div>
                )}

                {/* Update History Section */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t("updateHistory")}</Label>
                  <div className="rounded-md border p-4 max-h-[200px] overflow-y-auto space-y-2">
                    {selectedTask?.updates && selectedTask.updates.length > 0 ? (
                      selectedTask.updates.map((update, index) => (
                        <div key={index} className="text-sm border-b pb-2 last:border-0">
                          <p>{update}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("noUpdates")}</p>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                  {t("close")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
