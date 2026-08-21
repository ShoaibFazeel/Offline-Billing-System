"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import configService from "../services/ConfigService"
import storageService from "../services/StorageService"

function Settings() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [activeTab, setActiveTab] = useState("account")
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [companyInfo, setCompanyInfo] = useState({
    companyName: "",
    companyAddress: "",
    ownerName: "",
    ownerPhone: "",
    managerName: "",
    managerPhone: "",
  })
  const [appConfig, setAppConfig] = useState({
    locale: "en-GB",
    timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" : "UTC",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [updateStatus, setUpdateStatus] = useState("Ready to check for updates")
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false)

  useEffect(() => {
    const initialize = async () => {
      const sessionAuth = storageService.getSessionItem("isAuthenticated")
      if (sessionAuth === "true") {
        setIsAuthenticated(true)
      }

      await Promise.all([fetchCompanyInfo(), fetchAppConfig()])
      setIsLoading(false)
    }

    initialize()
  }, [])

  const fetchCompanyInfo = async () => {
    try {
      const info = await window.api.getCompanyInfo()
      if (info) {
        setCompanyInfo(info)
      }
    } catch (error) {
      console.error("Error fetching company info:", error)
    }
  }

  const fetchAppConfig = async () => {
    try {
      const config = await configService.getConfig()
      if (config) {
        setAppConfig(config)
      }
    } catch (error) {
      console.error("Error fetching app config:", error)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const credentials = await window.api.getCredentials()

      const validUsername = credentials?.username || "admin"
      const validPassword = credentials?.password || "admin"

      if (username === validUsername && password === validPassword) {
        setIsAuthenticated(true)
        storageService.setSessionItem("isAuthenticated", "true")
        toast.success("Login successful")
      } else {
        toast.error("Invalid username or password")
      }
    } catch (error) {
      console.error("Error during login:", error)
      toast.error("Login failed")
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    storageService.removeSessionItem("isAuthenticated")
    setUsername("")
    setPassword("")
  }

  const handleChangeCredentials = async (e) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    try {
      await window.api.updateCredentials({
        username: newUsername || username,
        password: newPassword,
      })

      toast.success("Credentials updated successfully")
      setNewUsername("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      console.error("Error updating credentials:", error)
      toast.error("Failed to update credentials")
    }
  }

  const handleCompanyInfoChange = (e) => {
    const { name, value } = e.target
    setCompanyInfo({
      ...companyInfo,
      [name]: value,
    })
  }

  const saveCompanyInfo = async (e) => {
    e.preventDefault()

    try {
      await window.api.updateCompanyInfo(companyInfo)
      toast.success("Company information saved successfully")
    } catch (error) {
      console.error("Error saving company info:", error)
      toast.error("Failed to save company information")
    }
  }

  const handleAppConfigChange = (e) => {
    const { name, value } = e.target
    setAppConfig({
      ...appConfig,
      [name]: value,
    })
  }

  const saveAppConfig = async (e) => {
    if (e?.preventDefault) {
      e.preventDefault()
    }
    try {
      const success = await configService.updateConfig(appConfig)
      if (success) {
        toast.success("Application configuration saved successfully")
        toast.info("Application will reflect changes on next interaction.")
      } else {
        toast.error("Failed to save application configuration")
      }
    } catch (error) {
      console.error("Error saving app config:", error)
      toast.error("Failed to save application configuration")
    }
  }

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true)
    setUpdateStatus("Checking for updates...")

    try {
      const result = await window.api.checkForUpdates()
      const message = result?.message || "No update information returned."
      setUpdateStatus(message)
      toast.success(message)
    } catch (error) {
      console.error("Error checking updates:", error)
      setUpdateStatus("Unable to check for updates right now.")
      toast.error("Failed to check for updates")
    } finally {
      setIsCheckingUpdates(false)
    }
  }

  const handleInstallPendingUpdate = async () => {
    try {
      await window.api.installUpdate()
      setUpdateStatus("Installing update...")
    } catch (error) {
      console.error("Error installing update:", error)
      setUpdateStatus("Failed to start the update installation")
      toast.error("Failed to start the update installation")
    }
  }

  const clearDatabase = async (type) => {
    if (!window.confirm(`Are you sure you want to clear all ${type}? This action cannot be undone.`)) {
      return
    }

    try {
      switch (type) {
        case "products":
          await window.api.clearProducts()
          toast.success("All products have been deleted")
          break
        case "clients":
          await window.api.clearClients()
          toast.success("All clients have been deleted")
          break
        case "bills":
          await window.api.clearBills()
          toast.success("All bills have been deleted")
          break
        case "fieldOfficers":
          await window.api.clearFieldOfficers()
          toast.success("All field officers have been deleted")
          break
        case "salesmen":
          await window.api.clearSalesmen()
          toast.success("All salesmen have been deleted")
          break
        case "all":
          await window.api.clearProducts()
          await window.api.clearClients()
          await window.api.clearBills()
          await window.api.clearFieldOfficers()
          await window.api.clearSalesmen()
          toast.success("All data has been deleted")
          break
        default:
          break
      }
    } catch (error) {
      console.error(`Error clearing ${type}:`, error)
      toast.error(`Failed to clear ${type}`)
    }
  }

  const exportData = async (type) => {
    try {
      let data
      let filename

      switch (type) {
        case "products":
          data = await window.api.getProducts()
          filename = "products.json"
          break
        case "clients":
          data = await window.api.getClients()
          filename = "clients.json"
          break
        case "bills":
          data = await window.api.getBills()
          filename = "bills.json"
          break
        case "fieldOfficers":
          data = await window.api.getFieldOfficers()
          filename = "field-officers.json"
          break
        case "salesmen":
          data = await window.api.getSalesmen()
          filename = "salesmen.json"
          break
        case "all":
          const products = await window.api.getProducts()
          const clients = await window.api.getClients()
          const bills = await window.api.getBills()
          const fieldOfficers = await window.api.getFieldOfficers()
          const salesmen = await window.api.getSalesmen()
          const companyInfo = await window.api.getCompanyInfo()
          const credentials = await window.api.getCredentials()

          data = {
            products,
            clients,
            bills,
            fieldOfficers,
            salesmen,
            companyInfo,
            credentials,
          }
          filename = "billing-system-backup.json"
          break
        default:
          return
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`${type === "all" ? "All data" : type} exported successfully`)
    } catch (error) {
      console.error(`Error exporting ${type}:`, error)
      toast.error(`Failed to export ${type}`)
    }
  }

  const importData = async (type) => {
    try {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".json"

      input.onchange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target.result)

            if (type === "all") {
              if (!window.confirm("This will replace ALL your current data. Are you sure you want to continue?")) {
                return
              }

              if (data.products) await window.api.importProducts(data.products)
              if (data.clients) await window.api.importClients(data.clients)
              if (data.bills) await window.api.importBills(data.bills)
              if (data.fieldOfficers) await window.api.importFieldOfficers(data.fieldOfficers)
              if (data.salesmen) await window.api.importSalesmen(data.salesmen)
              if (data.companyInfo) await window.api.updateCompanyInfo(data.companyInfo)
              if (data.credentials) await window.api.updateCredentials(data.credentials)

              toast.success("All data imported successfully")
            } else {
              if (!window.confirm(`This will replace your current ${type} data. Are you sure you want to continue?`)) {
                return
              }

              switch (type) {
                case "products":
                  await window.api.importProducts(data)
                  break
                case "clients":
                  await window.api.importClients(data)
                  break
                case "bills":
                  await window.api.importBills(data)
                  break
                case "fieldOfficers":
                  await window.api.importFieldOfficers(data)
                  break
                case "salesmen":
                  await window.api.importSalesmen(data)
                  break
                default:
                  return
              }

              toast.success(`${type} imported successfully`)
            }
          } catch (error) {
            console.error(`Error parsing or importing data:`, error)
            toast.error("Failed to import data. Invalid file format.")
          }
        }

        reader.readAsText(file)
      }

      input.click()
    } catch (error) {
      console.error(`Error importing ${type}:`, error)
      toast.error(`Failed to import ${type}`)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-3 text-sm font-semibold text-gray-600">Loading Settings...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto pb-12 px-2 sm:px-4">
        {/* Top Header */}
        <div className="mb-8 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl shadow-xl p-6 text-white flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
            <svg className="w-7 h-7 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Application Settings</h1>
            <p className="text-blue-200 text-sm mt-0.5">Authenticate to access configuration options</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="flex justify-center">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold text-gray-900">Settings Access</h2>
              <p className="text-sm text-gray-500 mt-1">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-md transition-all"
              >
                Login to Settings
              </button>
              <p className="text-xs text-gray-400 text-center">Default credentials: admin / admin</p>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: "account", label: "Account", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { id: "company", label: "Company", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { id: "database", label: "Database", icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" },
    { id: "backup", label: "Backup & Restore", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
    { id: "application", label: "Application", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
    { id: "updates", label: "Updates", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
  ]

  return (
    <div className="max-w-7xl mx-auto pb-12 px-2 sm:px-4">
      {/* Top Header Card */}
      <div className="mb-6 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl shadow-xl p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
            <svg className="w-7 h-7 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Application Settings</h1>
            <p className="text-blue-200 text-sm mt-0.5">Configure company info, account credentials, and system preferences</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-4 py-2 rounded-xl text-xs transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-slate-50 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center gap-1.5 px-4 py-3.5 font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-white text-blue-700 border-b-2 border-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8">
          {/* ACCOUNT TAB */}
          {activeTab === "account" && (
            <div className="max-w-md">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-extrabold text-gray-900">Change Login Credentials</h2>
                <p className="text-xs text-gray-500 mt-1">Update your admin username and password</p>
              </div>
              <form onSubmit={handleChangeCredentials} className="space-y-4">
                <div>
                  <label htmlFor="newUsername" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    New Username
                  </label>
                  <input
                    id="newUsername"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave blank to keep current username"
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all text-sm"
                >
                  Update Credentials
                </button>
              </form>
            </div>
          )}

          {/* COMPANY TAB */}
          {activeTab === "company" && (
            <div className="max-w-lg">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-extrabold text-gray-900">Company Information</h2>
                <p className="text-xs text-gray-500 mt-1">This info will appear on all generated invoices and reports</p>
              </div>
              <form onSubmit={saveCompanyInfo} className="space-y-4">
                <div>
                  <label htmlFor="companyName" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Company Name *
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={companyInfo.companyName}
                    onChange={handleCompanyInfoChange}
                    className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="companyAddress" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Company Address *
                  </label>
                  <textarea
                    id="companyAddress"
                    name="companyAddress"
                    value={companyInfo.companyAddress}
                    onChange={handleCompanyInfoChange}
                    className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    required
                  ></textarea>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ownerName" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      Owner Name *
                    </label>
                    <input
                      id="ownerName"
                      name="ownerName"
                      type="text"
                      value={companyInfo.ownerName}
                      onChange={handleCompanyInfoChange}
                      className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="ownerPhone" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      Owner Phone *
                    </label>
                    <input
                      id="ownerPhone"
                      name="ownerPhone"
                      type="text"
                      value={companyInfo.ownerPhone}
                      onChange={handleCompanyInfoChange}
                      className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="managerName" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      General Manager Name *
                    </label>
                    <input
                      id="managerName"
                      name="managerName"
                      type="text"
                      value={companyInfo.managerName}
                      onChange={handleCompanyInfoChange}
                      className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="managerPhone" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      General Manager Phone *
                    </label>
                    <input
                      id="managerPhone"
                      name="managerPhone"
                      type="text"
                      value={companyInfo.managerPhone}
                      onChange={handleCompanyInfoChange}
                      className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all text-sm"
                >
                  Save Company Information
                </button>
              </form>
            </div>
          )}

          {/* DATABASE TAB */}
          {activeTab === "database" && (
            <div>
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-extrabold text-gray-900">Database Management</h2>
                <p className="text-xs text-gray-500 mt-1">Clear specific collections from the local database</p>
              </div>
              <div className="space-y-6">
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                  <h3 className="text-sm font-extrabold text-amber-900 mb-1">Clear Specific Data</h3>
                  <p className="text-xs text-amber-700 mb-4">This will permanently remove the selected data set.</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "products", label: "Clear Products" },
                      { key: "clients", label: "Clear Clients" },
                      { key: "bills", label: "Clear Bills" },
                      { key: "fieldOfficers", label: "Clear Field Officers" },
                      { key: "salesmen", label: "Clear Salesmen" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => clearDatabase(item.key)}
                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-2 px-4 rounded-xl text-xs border border-amber-300 transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5 bg-red-50 border border-red-200 rounded-2xl">
                  <h3 className="text-sm font-extrabold text-red-900 mb-1">⚠️ Danger Zone</h3>
                  <p className="text-xs text-red-600 mb-4">
                    Warning: This action will permanently delete ALL data from the database and cannot be undone.
                  </p>
                  <button
                    onClick={() => clearDatabase("all")}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-md transition-all"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BACKUP & RESTORE TAB */}
          {activeTab === "backup" && (
            <div>
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-extrabold text-gray-900">Backup & Restore</h2>
                <p className="text-xs text-gray-500 mt-1">Export data to JSON files or import from previously exported backups</p>
              </div>
              <div className="space-y-6">
                <div className="p-5 bg-blue-50 border border-blue-200 rounded-2xl">
                  <h3 className="text-sm font-extrabold text-blue-900 mb-1">Export Data</h3>
                  <p className="text-xs text-blue-700 mb-4">Download your data as JSON files that can be imported later.</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "products", label: "Export Products" },
                      { key: "clients", label: "Export Clients" },
                      { key: "bills", label: "Export Bills" },
                      { key: "fieldOfficers", label: "Export Field Officers" },
                      { key: "salesmen", label: "Export Salesmen" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => exportData(item.key)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold py-2 px-4 rounded-xl text-xs border border-blue-300 transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                    <button
                      onClick={() => exportData("all")}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md transition-all"
                    >
                      Export All Data
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <h3 className="text-sm font-extrabold text-emerald-900 mb-1">Import Data</h3>
                  <p className="text-xs text-emerald-700 mb-4">Import from previously exported JSON files. This will replace your current data.</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "products", label: "Import Products" },
                      { key: "clients", label: "Import Clients" },
                      { key: "bills", label: "Import Bills" },
                      { key: "fieldOfficers", label: "Import Field Officers" },
                      { key: "salesmen", label: "Import Salesmen" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => importData(item.key)}
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold py-2 px-4 rounded-xl text-xs border border-emerald-300 transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
                    <button
                      onClick={() => importData("all")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md transition-all"
                    >
                      Import All Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APPLICATION TAB */}
          {activeTab === "application" && (
            <div className="max-w-lg">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-extrabold text-gray-900">Application Settings</h2>
                <p className="text-xs text-gray-500 mt-1">Configure locale, timezone, and regional formatting preferences</p>
              </div>
              <form onSubmit={saveAppConfig} className="space-y-5">
                <div>
                  <label htmlFor="locale" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Date & Time Locale
                  </label>
                  <select
                    id="locale"
                    name="locale"
                    value={appConfig.locale}
                    onChange={handleAppConfigChange}
                    className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en-GB">British English (DD/MM/YYYY)</option>
                    <option value="en-US">US English (MM/DD/YYYY)</option>
                    <option value="en-PK">Pakistan English (DD/MM/YYYY)</option>
                    <option value="ur-PK">Urdu (Pakistan)</option>
                  </select>
                  <p className="mt-1.5 text-xs text-gray-500">
                    Determines the format of dates displayed throughout the application.
                  </p>
                </div>
                <div>
                  <label htmlFor="timezone" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Application Timezone
                  </label>
                  <select
                    id="timezone"
                    name="timezone"
                    value={appConfig.timezone}
                    onChange={handleAppConfigChange}
                    className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    {(() => {
                      const localTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
                      const defaults = [
                        { value: "UTC", label: "UTC (Universal Coordinated Time)" },
                        { value: "Asia/Karachi", label: "Asia/Karachi (Pakistan Standard Time)" },
                        { value: "Asia/Dubai", label: "Asia/Dubai (UAE)" },
                        { value: "Europe/London", label: "Europe/London (GMT/BST)" },
                        { value: "America/New_York", label: "America/New_York (EST/EDT)" },
                      ];
                      const options = [];
                      if (localTz) {
                        options.push({ value: localTz, label: `Local (${localTz})` });
                      }
                      defaults.forEach(opt => {
                        if (opt.value !== localTz) {
                          options.push(opt);
                        }
                      });
                      return options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ));
                    })()}
                  </select>
                  <p className="mt-1.5 text-xs text-gray-500">
                    Fixes the application time regardless of your computer's local settings.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-gray-200">
                  <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Live Preview</h4>
                  <p className="text-sm text-gray-700">
                    Date: <strong>{new Date().toLocaleDateString(appConfig.locale, { timeZone: appConfig.timezone })}</strong>
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    Time: <strong>{new Date().toLocaleTimeString(appConfig.locale, { timeZone: appConfig.timezone })}</strong>
                  </p>
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all text-sm"
                >
                  Save Application Settings
                </button>
              </form>
            </div>
          )}

          {/* UPDATES TAB */}
          {activeTab === "updates" && (
            <div className="max-w-2xl">
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-extrabold text-gray-900">Application Updates</h2>
                <p className="text-xs text-gray-500 mt-1">Check for and install the latest application updates</p>
              </div>
              <div className="space-y-4">
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-sm text-gray-600 mb-4">
                    The application automatically checks GitHub Releases for newer versions and prompts you to install them. You can also check manually below.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCheckForUpdates}
                      disabled={isCheckingUpdates}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-md transition-all"
                    >
                      {isCheckingUpdates ? "Checking..." : "Check for Updates"}
                    </button>
                    <button
                      type="button"
                      onClick={handleInstallPendingUpdate}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-md transition-all"
                    >
                      Install Pending Update
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-white border border-gray-200 rounded-2xl">
                  <h3 className="text-sm font-extrabold text-gray-900 mb-2">Current Status</h3>
                  <p className="text-sm text-gray-600 font-medium">{updateStatus}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings
