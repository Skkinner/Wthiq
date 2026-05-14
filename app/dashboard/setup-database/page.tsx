"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle, Loader2, Copy, Check } from "lucide-react"

export default function SetupDatabasePage() {
  const [checking, setChecking] = useState(false)
  const [tableStatus, setTableStatus] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)

  const tables = ["users", "employees", "documents", "tasks", "audit_logs", "settings", "notifications"]

  const checkTables = async () => {
    setChecking(true)
    const status: Record<string, boolean> = {}

    for (const table of tables) {
      try {
        const response = await fetch(`/api/data/${table}`)
        status[table] = response.ok
      } catch {
        status[table] = false
      }
    }

    setTableStatus(status)
    setChecking(false)
  }

  const sqlScript = `-- Create all required tables for the Document Tracking System

-- Users table
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

-- Employees table
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

-- Documents table
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

-- Tasks table
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

-- Audit logs table
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

-- Settings table
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

-- Notifications table (optional - kept local by default)
CREATE TABLE IF NOT EXISTS public.notifications (
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

-- Create indexes for better performance
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

-- Insert default settings if not exists
INSERT INTO settings (default_reminder_days, timezone, default_language, email_enabled, sms_enabled, whatsapp_enabled)
SELECT ARRAY[30, 15, 7, 1], 'Asia/Riyadh', 'ar', TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Database Setup</h1>
        <p className="text-muted-foreground">
          Check which tables exist in your Supabase database and create missing ones.
        </p>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Step 1: Check Database Tables</h2>
        <Button onClick={checkTables} disabled={checking}>
          {checking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            "Check Tables"
          )}
        </Button>

        {Object.keys(tableStatus).length > 0 && (
          <div className="mt-6 space-y-2">
            {tables.map((table) => (
              <div key={table} className="flex items-center gap-2">
                {tableStatus[table] ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-mono">{table}</span>
                <span className="text-sm text-muted-foreground">{tableStatus[table] ? "exists" : "missing"}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Step 2: Create Missing Tables</h2>
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy SQL
              </>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copy the SQL script below and run it in your Supabase SQL Editor:
          </p>

          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li>
              Go to your{" "}
              <a
                href="https://supabase.com/dashboard/project/_/sql"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Supabase SQL Editor
              </a>
            </li>
            <li>Click the "Copy SQL" button above</li>
            <li>Paste the SQL into the editor</li>
            <li>Click "Run" to execute the script</li>
            <li>Return here and click "Check Tables" to verify</li>
          </ol>

          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
              <code>{sqlScript}</code>
            </pre>
          </div>
        </div>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Note:</strong> After creating the tables, all your data will automatically sync from localStorage to
          Supabase when you use the application.
        </p>
      </div>
    </div>
  )
}
