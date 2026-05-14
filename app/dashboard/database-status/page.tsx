"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Loader2, Copy, Check } from "lucide-react"

interface TableStatus {
  name: string
  exists: boolean
  error?: string
}

export default function DatabaseStatusPage() {
  const [checking, setChecking] = useState(false)
  const [tableStatuses, setTableStatuses] = useState<TableStatus[]>([])
  const [copied, setCopied] = useState(false)

  const tables = ["users", "employees", "documents", "tasks", "audit_logs", "settings", "notifications"]

  const checkTables = async () => {
    setChecking(true)
    const statuses: TableStatus[] = []

    for (const table of tables) {
      try {
        const response = await fetch(`/api/data/${table}`)

        if (response.ok) {
          statuses.push({
            name: table,
            exists: true,
          })
        } else {
          const error = await response.json().catch(() => ({ error: response.statusText }))
          statuses.push({
            name: table,
            exists: false,
            error: error.error || error.message || "Unknown error",
          })
        }
      } catch (err) {
        statuses.push({
          name: table,
          exists: false,
          error: String(err),
        })
      }
    }

    setTableStatuses(statuses)
    setChecking(false)
  }

  const missingTables = tableStatuses.filter((t) => !t.exists)
  const existingTables = tableStatuses.filter((t) => t.exists)

  const sqlScript = `-- Create missing tables in Supabase
-- Run this in your Supabase SQL Editor

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON public.documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON public.documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id ON public.tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Insert default settings
INSERT INTO settings (default_reminder_days, timezone, default_language, email_enabled, sms_enabled, whatsapp_enabled)
SELECT ARRAY[30, 15, 7, 1], 'Asia/Riyadh', 'ar', TRUE, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);
`

  const copySQL = () => {
    navigator.clipboard.writeText(sqlScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Database Status</h1>
        <p className="text-muted-foreground">Check which tables exist in your production Supabase database</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Table Status Check</CardTitle>
          <CardDescription>
            This will test each table to see if it exists and is accessible in your Supabase database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={checkTables} disabled={checking} className="w-full">
            {checking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking Tables...
              </>
            ) : (
              "Check Database Tables"
            )}
          </Button>

          {tableStatuses.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3">
                {tableStatuses.map((table) => (
                  <div key={table.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {table.exists ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">{table.name}</span>
                    </div>
                    <Badge variant={table.exists ? "default" : "destructive"}>
                      {table.exists ? "Exists" : "Missing"}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Summary:</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">{existingTables.length} existing</span>
                    <span className="text-red-600">{missingTables.length} missing</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {missingTables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Create Missing Tables</CardTitle>
            <CardDescription>
              Copy this SQL script and run it in your Supabase SQL Editor to create all missing tables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription>
                <strong>Instructions:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Click the "Copy SQL Script" button below</li>
                  <li>
                    Go to your{" "}
                    <a
                      href="https://supabase.com/dashboard/project/_/sql"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Supabase SQL Editor
                    </a>
                  </li>
                  <li>Paste the SQL script and click "Run"</li>
                  <li>Come back here and click "Check Database Tables" again</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96 overflow-y-auto">
                {sqlScript}
              </pre>
              <Button onClick={copySQL} size="sm" className="absolute top-2 right-2">
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy SQL Script
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tableStatuses.length > 0 && missingTables.length === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            All tables exist! Your database is properly set up. Users and tasks should now sync correctly to Supabase.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
