// Authentication utilities
import type { User } from "./types"
import { storage } from "./storage"
import { v4 as uuidv4 } from "uuid"

export async function login(email: string, password: string): Promise<User | null> {
  // Fetch users directly from Supabase
  const users = await storage.users.getAll()

  const user = users.find((u) => u.email === email && u.password === password)

  if (user) {
    storage.currentUser.save(user)
    return user
  }

  return null
}

export function logout(): void {
  storage.currentUser.clear()
}

export function getCurrentUser(): User | null {
  return storage.currentUser.get()
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}

export function isAdmin(): boolean {
  const user = getCurrentUser()
  return user?.role === "admin" || user?.role === "employee"
}

export async function createUser(email: string, password: string, role: "admin" | "employee", employeeId?: string): Promise<User> {
  const users = await storage.users.getAll()

  const newUser: User = {
    id: uuidv4(),
    email,
    password,
    role,
    employeeId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  users.push(newUser)
  await storage.users.save(users)

  return newUser
}
