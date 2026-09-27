"use client"

import { useEffect, useRef, useState } from "react"
import { HashRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom"
import Dashboard from "./components/Dashboard"
import InventoryManagement from "./components/InventoryManagement"
import ClientManagement from "./components/ClientManagement"
import BillGeneration from "./components/BillGeneration"
import BillHistory from "./components/BillHistory"
import ViewBill from "./components/ViewBill"
import Settings from "./components/Settings"
import FieldOfficerManagement from "./components/FieldOfficerManagement"
import SalesmanManagement from "./components/SalesmanManagement"
import Reports from "./components/Reports"
import ErrorBoundary from "./components/ErrorBoundary"
import { Toaster, toast } from "react-hot-toast"
import "./index.css"

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [pendingUpdate, setPendingUpdate] = useState(null)
  const [restoreRequired, setRestoreRequired] = useState(false)
  const [restoreChecking, setRestoreChecking] = useState(true)
  const [restoreError, setRestoreError] = useState("")
  const [restoringData, setRestoringData] = useState(false)
  const restoreFileRef = useRef(null)

  useEffect(() => {
    const removeListener = window.api?.onUpdateStatus?.((payload) => {
      if (!payload) return

      if (payload.type === "update-available" && payload.payload?.version) {
        setPendingUpdate({ version: payload.payload.version, downloaded: false, progress: 0 })
        toast.success(`Update ${payload.payload.version} is downloading`)
      } else if (payload.type === "download-progress") {
        setPendingUpdate((current) => current ? { ...current, progress: payload.payload?.percent || 0 } : current)
      } else if (payload.type === "update-downloaded" && payload.payload?.version) {
        setPendingUpdate((current) => ({
          ...current,
          version: payload.payload.version,
          downloaded: true,
          progress: 100,
          installing: false,
        }))
        toast.success("Update downloaded and ready to install")
      } else if (payload.type === "error") {
        setPendingUpdate((current) => current ? { ...current, error: payload.payload?.message || "Update download failed" } : current)
        toast.error(payload.payload?.message || "Update check failed")
      }
    })

    return () => removeListener?.()
  }, [])

  useEffect(() => {
    window.api.getDataRestoreStatus()
      .then(({ required }) => setRestoreRequired(required))
      .catch((error) => {
        console.error("Failed to check database restore status:", error)
        setRestoreRequired(true)
        setRestoreError("Could not confirm database status. Select your backup to continue safely.")
      })
      .finally(() => setRestoreChecking(false))
  }, [])

  const handleRestoreBackup = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setRestoringData(true)
    setRestoreError("")
    try {
      const backupData = JSON.parse(await file.text())
      await window.api.importAllData(backupData)
      setRestoreRequired(false)
      toast.success("Your data has been restored")
    } catch (error) {
      console.error("Failed to restore data:", error)
      setRestoreError(error.message || "The selected backup could not be restored. Choose a valid All Data JSON backup and try again.")
    } finally {
      setRestoringData(false)
    }
  }

  const handleInstallPendingUpdate = async () => {
    if (!pendingUpdate?.downloaded || pendingUpdate.installing) {
      toast.error("The update is not ready to install yet")
      return
    }

    try {
      setPendingUpdate((current) => ({ ...current, installing: true }))
      await window.api.installUpdate()
    } catch (error) {
      console.error("Error installing pending update:", error)
      setPendingUpdate((current) => current ? { ...current, installing: false } : current)
      toast.error("Failed to start the update installation")
    }
  }

  if (restoreChecking || restoreRequired) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4">
        {restoreChecking ? (
          <div className="rounded-xl bg-white p-6 text-sm font-semibold text-slate-700 shadow-2xl" role="status">
            Checking database status...
          </div>
        ) : (
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="restore-title">
            <h1 id="restore-title" className="text-lg font-extrabold text-slate-900">Restore your billing data</h1>
            <p className="mt-2 text-sm text-slate-600">
              This version uses a new database engine. Select the All Data JSON backup you exported before updating. Your existing database has been preserved for recovery.
            </p>
            {restoreError && (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800" role="alert">
                {restoreError}
              </p>
            )}
            <input
              ref={restoreFileRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={handleRestoreBackup}
              disabled={restoringData}
            />
            <button
              type="button"
              onClick={() => restoreFileRef.current?.click()}
              disabled={restoringData}
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
            >
              {restoringData ? "Restoring data..." : "Choose All Data Backup"}
            </button>
          </div>
        )}
        <Toaster position="top-right" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Router>
        <AppLayout
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          pendingUpdate={pendingUpdate}
          handleInstallPendingUpdate={handleInstallPendingUpdate}
        />
      </Router>
    </ErrorBoundary>
  )
}

function AppLayout({ sidebarOpen, setSidebarOpen, pendingUpdate, handleInstallPendingUpdate }) {
  return (
    <div className="flex h-screen bg-slate-100 font-sans antialiased text-slate-900 overflow-hidden">
      <aside
        className={`${sidebarOpen ? "w-64" : "w-20"} bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out flex flex-col z-30 shadow-2xl border-r border-slate-800`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && "justify-center w-full"}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg font-black text-white text-lg">B</div>
            {sidebarOpen && (
              <div className="leading-tight">
                <span className="font-extrabold text-base tracking-tight text-white block">Offline Billing</span>
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider block">Enterprise System</span>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Collapse sidebar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
        </div>

        {!sidebarOpen && (
          <div className="p-2 flex justify-center">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Expand sidebar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}

        <nav className="mt-4 px-3 flex-1 space-y-1.5 overflow-y-auto">
          <NavLink to="/" icon="home" label="Dashboard" sidebarOpen={sidebarOpen} />
          <NavLink to="/bill/new" icon="file-plus" label="New Bill" sidebarOpen={sidebarOpen} highlight />
          <NavLink to="/bills" icon="file-text" label="Bill History" sidebarOpen={sidebarOpen} />
          <NavLink to="/inventory" icon="box" label="Inventory" sidebarOpen={sidebarOpen} />
          <NavLink to="/clients" icon="users" label="Clients" sidebarOpen={sidebarOpen} />
          <NavLink to="/field-officers" icon="user-check" label="Field Officers" sidebarOpen={sidebarOpen} />
          <NavLink to="/salesmen" icon="user-plus" label="Salesmen" sidebarOpen={sidebarOpen} />
          <NavLink to="/reports" icon="chart-bar" label="Reports" sidebarOpen={sidebarOpen} />
        </nav>

        <div className="p-3 border-t border-slate-800">
          <NavLink to="/settings" icon="settings" label="Settings" sidebarOpen={sidebarOpen} />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6">
        {pendingUpdate && (
          <div className="mb-4 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span>
                {pendingUpdate.error ? `Update failed: ${pendingUpdate.error}` : pendingUpdate.installing ? `Installing update v${pendingUpdate.version}...` : pendingUpdate.downloaded ? `Update ready: v${pendingUpdate.version}` : `Downloading update: ${Math.round(pendingUpdate.progress)}%`}
              </span>
            </div>
            {pendingUpdate.downloaded && (
              <button onClick={handleInstallPendingUpdate} disabled={pendingUpdate.installing} className="bg-white text-emerald-800 hover:bg-emerald-50 disabled:opacity-60 px-4 py-1.5 rounded-xl font-extrabold text-xs shadow transition-all">
                {pendingUpdate.installing ? "Restarting..." : "Install & Restart"}
              </button>
            )}
          </div>
        )}

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<InventoryManagement />} />
          <Route path="/clients" element={<ClientManagement />} />
          <Route path="/field-officers" element={<FieldOfficerManagement />} />
          <Route path="/salesmen" element={<SalesmanManagement />} />
          <Route path="/bill/new" element={<BillGeneration />} />
          <Route path="/bills" element={<BillHistory />} />
          <Route path="/bill/:id" element={<ViewBill />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <Toaster position="top-right" />
    </div>
  )
}

function NavLink({ to, icon, label, sidebarOpen, highlight }) {
  const location = useLocation()
  const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to))

  return (
    <Link
      to={to}
      title={label}
      className={`flex items-center py-2.5 px-3 rounded-xl transition-all duration-150 group font-semibold text-xs ${isActive ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-950/40" : highlight ? "bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-white" : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"}`}
    >
      <div className={`flex items-center justify-center ${sidebarOpen ? "mr-3" : "mx-auto"}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {icon === "home" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />}
          {icon === "box" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />}
          {icon === "users" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />}
          {icon === "user-check" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
          {icon === "user-plus" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />}
          {icon === "file-plus" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />}
          {icon === "file-text" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
          {icon === "chart-bar" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />}
          {icon === "settings" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />}
        </svg>
      </div>
      {sidebarOpen && <span className="tracking-wide font-bold">{label}</span>}
    </Link>
  )
}

export default App