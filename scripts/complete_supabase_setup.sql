-- ============================================
-- COMPLETE SUPABASE SETUP SCRIPT
-- Run this in your Supabase SQL Editor
-- ============================================

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  name TEXT,
  name_en TEXT,
  phone TEXT,
  password TEXT NOT NULL,
  password_history TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for custom auth
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for users" ON public.users;
CREATE POLICY "Allow all for users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 2. EMPLOYEES TABLE
-- ============================================
CREATE TABLE public.employees (
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

-- Disable RLS for custom auth
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for employees" ON public.employees;
CREATE POLICY "Allow all for employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3. DOCUMENTS TABLE
-- ============================================
CREATE TABLE public.documents (
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

-- Disable RLS for custom auth
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for documents" ON public.documents;
CREATE POLICY "Allow all for documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 4. TASKS TABLE
-- ============================================
CREATE TABLE public.tasks (
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

-- Disable RLS for custom auth
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for tasks" ON public.tasks;
CREATE POLICY "Allow all for tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in_app', 'email', 'sms', 'whatsapp')),
  message TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for custom auth
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for notifications" ON public.notifications;
CREATE POLICY "Allow all for notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 6. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE public.audit_logs (
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

-- Disable RLS for custom auth
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for audit_logs" ON public.audit_logs;
CREATE POLICY "Allow all for audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 7. SETTINGS TABLE
-- ============================================
CREATE TABLE public.settings (
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

-- Disable RLS for custom auth
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for settings" ON public.settings;
CREATE POLICY "Allow all for settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON public.documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON public.documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_notifications_document_id ON public.notifications(document_id);
CREATE INDEX IF NOT EXISTS idx_notifications_employee_id ON public.notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON public.notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON public.tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_employees_employee_number ON public.employees(employee_number);

-- ============================================
-- 9. INSERT DEFAULT ADMIN USER
-- ============================================
INSERT INTO public.users (id, email, role, name, name_en, password, password_history)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin@example.com',
  'admin',
  'مدير النظام',
  'System Admin',
  'Admin@123',
  ARRAY['Admin@123']
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 10. INSERT DEFAULT SETTINGS
-- ============================================
INSERT INTO public.settings (default_reminder_days, timezone, default_language, email_enabled, sms_enabled, whatsapp_enabled)
VALUES (ARRAY[30, 15, 7, 1], 'Asia/Riyadh', 'ar', TRUE, TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Tables created:
--   - users (with password and password_history)
--   - employees
--   - documents
--   - tasks
--   - notifications
--   - audit_logs
--   - settings
--
-- Default admin user:
--   Email: admin@example.com
--   Password: Admin@123
-- ============================================
