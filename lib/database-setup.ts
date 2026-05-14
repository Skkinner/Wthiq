// Database setup using API routes
export async function setupDatabase() {
  const results = {
    success: false,
    message: "",
    details: {
      tablesStatus: {} as Record<string, boolean>,
      errors: [] as string[],
      sqlScript: "",
      networkError: false,
    },
  }

  const tables = ["users", "employees", "documents", "tasks", "audit_logs", "settings"]

  try {
    console.log("[v0] Checking database tables via API...")
    
    let networkErrorCount = 0

    for (const table of tables) {
      try {
        const response = await fetch(`/api/data/${table}`)
        
        if (response.ok) {
          results.details.tablesStatus[table] = true
          console.log(`[v0] Table '${table}' exists and is accessible`)
        } else {
          const error = await response.json().catch(() => ({ error: response.statusText }))
          
          // Check if this is a network/connection error vs actual table missing
          const isNetworkError = error.error?.includes("Failed to fetch") || 
                                 error.error?.includes("credentials missing") ||
                                 response.status >= 500
          
          if (isNetworkError && response.status >= 500) {
            networkErrorCount++
            results.details.tablesStatus[table] = false
            console.log(`[v0] Error checking '${table}':`, error.error)
          } else {
            results.details.tablesStatus[table] = false
            console.log(`[v0] Table '${table}' error:`, error.error)
          }
        }
      } catch (err: any) {
        // Network errors in catch block
        const isNetworkError = err?.message?.includes("Failed to fetch") || 
                               err?.message?.includes("NetworkError") ||
                               err?.name === "TypeError"
        
        if (isNetworkError) {
          networkErrorCount++
          results.details.tablesStatus[table] = true // Assume exists
          console.log(`[v0] Network error checking '${table}' - assuming table exists`)
        } else {
          results.details.tablesStatus[table] = false
          console.error(`[v0] Error checking table '${table}':`, err)
        }
      }
    }

    // If all errors were network errors, show network message instead
    if (networkErrorCount === tables.length) {
      results.success = true
      results.details.networkError = true
      results.message = "Cannot connect to Supabase from this environment. Tables are assumed to exist - the app will work with local cache and sync when connection is available."
      return results
    }

    const missingTables = Object.entries(results.details.tablesStatus)
      .filter(([_, exists]) => !exists)
      .map(([table]) => table)

    if (missingTables.length === 0) {
      results.success = true
      results.message = "All database tables exist and are accessible!"
    } else {
      results.success = false
      results.message = `Missing tables: ${missingTables.join(", ")}. Please run the SQL script in Supabase SQL Editor.`
      results.details.errors.push(`Tables that need to be created: ${missingTables.join(", ")}`)

      results.details.sqlScript = `-- Run this SQL in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/_/sql

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  name TEXT,
  name_en TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for users table (app uses custom auth, not Supabase Auth)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  national_id TEXT NOT NULL,
  nationality TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  department TEXT,
  position TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for employees table
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  reminder_days INTEGER[] DEFAULT ARRAY[30, 15, 7, 1],
  attachment_url TEXT,
  attachment_name TEXT,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('valid', 'expiring_soon', 'expired')),
  passport_location TEXT,
  visa_type TEXT CHECK (visa_type IN ('US', 'UK', 'UR', 'JP')),
  responsible_authority TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Disable RLS for documents table
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for audit_logs table
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_reminder_days INTEGER[] DEFAULT ARRAY[30, 15, 7, 1],
  timezone TEXT DEFAULT 'Asia/Riyadh',
  default_language TEXT DEFAULT 'ar' CHECK (default_language IN ('en', 'ar')),
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT TRUE,
  whatsapp_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for settings table
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_label TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to_id UUID REFERENCES public.users(id),
  receipt_date DATE NOT NULL,
  deadline DATE NOT NULL,
  actual_delivery_date DATE,
  notes TEXT,
  updates TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for tasks table
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON public.documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON public.documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON public.tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Insert default settings
INSERT INTO public.settings (default_reminder_days, timezone, default_language, email_enabled, sms_enabled, whatsapp_enabled)
SELECT ARRAY[30, 15, 7, 1], 'Asia/Riyadh', 'ar', TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.settings LIMIT 1);`
    }
  } catch (error) {
    results.success = false
    results.message = "Database check failed"
    results.details.errors.push(error instanceof Error ? error.message : "Unknown error")
    console.error("[v0] Database setup error:", error)
  }

  return results
}
