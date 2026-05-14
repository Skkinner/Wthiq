"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react"

interface TableStatus {
  name: string
  exists: boolean
  count: number | null
  error: string | null
}

interface HealthCheck {
  supabase: {
    urlConfigured: boolean
    anonKeyConfigured: boolean
    serviceKeyConfigured: boolean
  }
  envVars: Record<string, boolean>
}

export default function DiagnosticsPage() {
  const [loading, setLoading] = useState(true)
  const [envVars, setEnvVars] = useState<Record<string, boolean>>({})
  const [tables, setTables] = useState<TableStatus[]>([])
  const [connectionStatus, setConnectionStatus] = useState<"success" | "error" | "checking">("checking")
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null)

  const checkDiagnostics = async () => {
    setLoading(true)
    setConnectionStatus("checking")

    // First, check server-side health
    try {
      const healthResponse = await fetch("/api/health")
      if (healthResponse.ok) {
        const health = await healthResponse.json()
        setHealthCheck(health)
      }
    } catch (e) {
      console.error("Health check failed:", e)
    }

    // Environment variables are checked server-side now
    const vars = {
      API_ROUTES: true, // We're using API routes which have server-side access to env vars
      SUPABASE_CONNECTION: false, // Will be updated based on table checks
    }

    // Check tables via API routes
    const tablesToCheck = ["users", "employees", "tasks", "documents", "audit_logs", "settings"]
    const tableStatuses: TableStatus[] = []

    let allSuccess = true

    for (const table of tablesToCheck) {
      try {
        const response = await fetch(`/api/data/${table}`)
        
        if (response.ok) {
          const data = await response.json()
          tableStatuses.push({
            name: table,
            exists: true,
            count: Array.isArray(data) ? data.length : null,
            error: null,
          })
        } else {
          const error = await response.json().catch(() => ({ error: response.statusText }))
          tableStatuses.push({
            name: table,
            exists: false,
            count: null,
            error: error.error || "Unknown error",
          })
          allSuccess = false
        }
      } catch (error: any) {
        tableStatuses.push({
          name: table,
          exists: false,
          count: null,
          error: error.message,
        })
        allSuccess = false
      }
    }

    vars.SUPABASE_CONNECTION = allSuccess
    setEnvVars(vars)
    setTables(tableStatuses)
    setConnectionStatus(allSuccess ? "success" : "error")
    setLoading(false)
  }

  useEffect(() => {
    checkDiagnostics()
  }, [])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">System Diagnostics</h1>
          <p className="text-muted-foreground">Verify Supabase connectivity and project consistency</p>
        </div>
        <Button onClick={checkDiagnostics} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {connectionStatus === "checking" && <AlertCircle className="h-5 w-5 text-yellow-500" />}
              {connectionStatus === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {connectionStatus === "error" && <XCircle className="h-5 w-5 text-red-500" />}
              Connection Status
            </CardTitle>
            <CardDescription>Overall Supabase connection health</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                connectionStatus === "success" ? "default" : connectionStatus === "error" ? "destructive" : "secondary"
              }
            >
              {connectionStatus === "checking" && "Checking..."}
              {connectionStatus === "success" && "All Systems Operational"}
              {connectionStatus === "error" && "Issues Detected"}
            </Badge>
          </CardContent>
        </Card>

        {/* Server-Side Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Server-Side Configuration</CardTitle>
            <CardDescription>Environment variables available to API routes (server-side only)</CardDescription>
          </CardHeader>
          <CardContent>
            {healthCheck ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Supabase Config:</p>
                  <div className="space-y-1 ml-4">
                    <div className="flex items-center gap-2">
                      {healthCheck.supabase.urlConfigured ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">URL Configured</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {healthCheck.supabase.anonKeyConfigured ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Anon Key Configured</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {healthCheck.supabase.serviceKeyConfigured ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Service Role Key Configured</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Environment Variables:</p>
                  <div className="space-y-1 ml-4">
                    {Object.entries(healthCheck.envVars).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        {value ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-mono">{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading health check...</p>
            )}
          </CardContent>
        </Card>

        {/* Database Tables */}
        <Card>
          <CardHeader>
            <CardTitle>Database Tables</CardTitle>
            <CardDescription>Status and record counts for all tables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tables.map((table) => (
                <div key={table.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {table.exists ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{table.name}</p>
                      {table.error && <p className="text-sm text-red-500">{table.error}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    {table.exists && table.count !== null && <Badge variant="secondary">{table.count} records</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API Routes */}
        <Card>
          <CardHeader>
            <CardTitle>API Routes</CardTitle>
            <CardDescription>Server-side endpoints for secure data operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {["users", "employees", "tasks", "documents"].map((entity) => (
                <div key={entity} className="flex items-center justify-between">
                  <span className="font-mono text-sm">/api/{entity}</span>
                  <Badge variant="outline">GET, POST, DELETE</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
