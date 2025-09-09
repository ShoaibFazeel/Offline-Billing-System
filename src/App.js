"use client"

import { useState } from "react"
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom"
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
import { Toaster } from "react-hot-toast"
import "./index.css"

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "w-64" : "w-20"} bg-gray-800 text-white transition-all duration-300 ease-in-out flex flex-col`}
        >
          <div className="p-4 flex items-center justify-between">
            <h1 className={`text-xl font-bold ${!sidebarOpen && "hidden"}`}>Billing System</h1>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded-full hover:bg-gray-700">
              {sidebarOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
          <nav className="mt-5 flex-1">
            <NavLink to="/" icon="home" label="Dashboard" sidebarOpen={sidebarOpen} />
            <NavLink to="/inventory" icon="box" label="Inventory" sidebarOpen={sidebarOpen} />
            <NavLink to="/clients" icon="users" label="Clients" sidebarOpen={sidebarOpen} />
            <NavLink to="/field-officers" icon="user-check" label="Field Officers" sidebarOpen={sidebarOpen} />
            <NavLink to="/salesmen" icon="user-plus" label="Salesmen" sidebarOpen={sidebarOpen} />
            <NavLink to="/bill/new" icon="file-plus" label="New Bill" sidebarOpen={sidebarOpen} />
            <NavLink to="/bills" icon="file-text" label="Bill History" sidebarOpen={sidebarOpen} />
            <NavLink to="/reports" icon="chart-bar" label="Reports" sidebarOpen={sidebarOpen} />
          </nav>
          <div className="mt-auto mb-5">
            <NavLink to="/settings" icon="settings" label="Settings" sidebarOpen={sidebarOpen} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
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
          </div>
        </div>
        <Toaster position="top-right" />
      </div>
    </Router>
  )
}

function NavLink({ to, icon, label, sidebarOpen }) {
  return (
    <Link
      to={to}
      title={label}
      className="flex items-center py-2 px-4 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {icon === "home" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        )}
        {icon === "box" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        )}
        {icon === "users" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        )}
        {icon === "user-check" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z M9 12l2 2 4-4"
          />
        )}
        {icon === "user-plus" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z M12 8v4 M10 10h4"
          />
        )}
        {icon === "file-plus" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        )}
        {icon === "file-text" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        )}
        {icon === "chart-bar" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        )}
        {icon === "settings" && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
        )}
      </svg>
      {sidebarOpen && <span className="ml-3">{label}</span>}
    </Link>
  )
}

export default App
