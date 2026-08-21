"use client"

import { useEffect, useState } from "react"
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

  useEffect(() => {
    const removeListener = window.api?.onUpdateStatus?.((payload) => {
      if (!payload) return

      if (payload.type === "update-available" && payload.payload?.version) {
        setPendingUpdate({ version: payload.payload.version })
        toast.success(`Update ${payload.payload.version} is available`)
      } else if (payload.type === "update-downloaded" && payload.payload?.version) {
        setPendingUpdate({ version: payload.payload.version })
        toast.success("Update downloaded and ready to install")
      } else if (payload.type === "error") {
        toast.error(payload.payload?.message || "Update check failed")
      }
    })

    return () => removeListener?.()
  }, [])

  const handleInstallPendingUpdate = async () => {
    if (!pendingUpdate) {
      toast.error("No update is ready to install")
      return
    }

    try {
      await window.api.installUpdate()
      setPendingUpdate(null)
    } catch (error) {
      console.error("Error installing pending update:", error)
      toast.error("Failed to start the update installation")
    }
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
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out flex flex-col z-30 shadow-2xl border-r border-slate-800`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && "justify-center w-full"}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg font-black text-white text-lg">
              B
            </div>
            {sidebarOpen && (
              <div className="leading-tight">
                <span className="font-extrabold text-base tracking-tight text-white block">Offline Billing</span>
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider block">Enterprise System</span>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Collapse sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {!sidebarOpen && (
          <div className="p-2 flex justify-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Expand sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Navigation Menu */}
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

        {/* Settings Footer */}
        <div className="p-3 border-t border-slate-800">
          <NavLink to="/settings" icon="settings" label="Settings" sidebarOpen={sidebarOpen} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6">
        {pendingUpdate && (
          <div className="mb-4 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Update Available: v{pendingUpdate.version}</span>
            </div>
            <button
              onClick={handleInstallPendingUpdate}
              className="bg-white text-emerald-800 hover:bg-emerald-50 px-4 py-1.5 rounded-xl font-extrabold text-xs shadow transition-all"
            >
              Install Update Now
            </button>
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
      className={`flex items-center py-2.5 px-3 rounded-xl transition-all duration-150 group font-semibold text-xs ${
        isActive
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-950/40"
          : highlight
          ? "bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-white"
          : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
      }`}
    >
      <div className={`flex items-center justify-center ${sidebarOpen ? "mr-3" : "mx-auto"}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 transition-transform group-hover:scale-110"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {icon === "home" && (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          )}
          {icon === "box" && (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          )}
          {icon === "users" && (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          )}
          {icon === "user-check" && (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
          {icon === "user-plus" && (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          )}
          {icon === "file-plus" && (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          )}
          {icon === "file-text" && (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          )}
          {icon === "chart-bar" && (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          )}
          {icon === "settings" && (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          )}
        </svg>
      </div>
      {sidebarOpen && <span className="tracking-wide font-bold">{label}</span>}
    </Link>
  )
}

export default App
