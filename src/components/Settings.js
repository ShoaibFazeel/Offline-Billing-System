"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import configService from "../services/ConfigService"

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
    // Check if user is already authenticated in this session
    const sessionAuth = sessionStorage.getItem("isAuthenticated")
    if (sessionAuth === "true") {
      setIsAuthenticated(true)
    }

    // Fetch company info
    fetchCompanyInfo()

    // Fetch app config
    fetchAppConfig()

    setIsLoading(false)
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

      // Default credentials if none are set
      const validUsername = credentials?.username || "admin"
      const validPassword = credentials?.password || "admin"

      if (username === validUsername && password === validPassword) {
        setIsAuthenticated(true)
        sessionStorage.setItem("isAuthenticated", "true")
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
    sessionStorage.removeItem("isAuthenticated")
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
      setUpdateStatus(result?.message || "No update information returned.")
      if (result?.message?.includes("background")) {
        toast.success("Update check started")
      } else {
        toast.success(result?.message || "Update check completed")
      }
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

      // Create a blob and download
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
    return <div className="text-center py-10">Loading...</div>
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Settings Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md">
                Login
              </button>
            </div>
            <div className="text-sm text-gray-500 text-center">
              Default credentials: username "admin", password "admin"
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <button onClick={handleLogout} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md">
          Logout
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex border-b">
          <button
            className={`px-4 py-3 font-medium ${activeTab === "account" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600"
              }`}
            onClick={() => setActiveTab("account")}
          >
            Account
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === "company" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600"
              }`}
            onClick={() => setActiveTab("company")}
          >
            Company Information
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === "database" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600"
              }`}
            onClick={() => setActiveTab("database")}
          >
            Database Management
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === "backup" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600"
              }`}
            onClick={() => setActiveTab("backup")}
          >
            Backup & Restore
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === "application" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600"
              }`}
            onClick={() => setActiveTab("application")}
          >
            Application
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === "updates" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-600"
              }`}
            onClick={() => setActiveTab("updates")}
          >
            Updates
          </button>
        </div>

        <div className="p-6">
          {activeTab === "account" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Change Username and Password</h2>
              <form onSubmit={handleChangeCredentials} className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="newUsername" className="block text-sm font-medium text-gray-700 mb-1">
                    New Username
                  </label>
                  <input
                    id="newUsername"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Leave blank to keep current username"
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md">
                    Update Credentials
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "company" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Company Information</h2>
              <form onSubmit={saveCompanyInfo} className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    value={companyInfo.companyName}
                    onChange={handleCompanyInfoChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Address
                  </label>
                  <textarea
                    id="companyAddress"
                    name="companyAddress"
                    value={companyInfo.companyAddress}
                    onChange={handleCompanyInfoChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    rows="3"
                    required
                  ></textarea>
                </div>
                <div>
                  <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Name
                  </label>
                  <input
                    id="ownerName"
                    name="ownerName"
                    type="text"
                    value={companyInfo.ownerName}
                    onChange={handleCompanyInfoChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="ownerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Phone
                  </label>
                  <input
                    id="ownerPhone"
                    name="ownerPhone"
                    type="text"
                    value={companyInfo.ownerPhone}
                    onChange={handleCompanyInfoChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="managerName" className="block text-sm font-medium text-gray-700 mb-1">
                    General Manager Name
                  </label>
                  <input
                    id="managerName"
                    name="managerName"
                    type="text"
                    value={companyInfo.managerName}
                    onChange={handleCompanyInfoChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="managerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    General Manager Phone
                  </label>
                  <input
                    id="managerPhone"
                    name="managerPhone"
                    type="text"
                    value={companyInfo.managerPhone}
                    onChange={handleCompanyInfoChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md">
                    Save Company Information
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "database" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Database Management</h2>
              <div className="space-y-6">
                <div className="p-4 border border-gray-200 rounded-md">
                  <h3 className="text-lg font-medium mb-2">Clear Specific Data</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => clearDatabase("products")}
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-2 px-4 rounded-md"
                    >
                      Clear All Products
                    </button>
                    <button
                      onClick={() => clearDatabase("clients")}
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-2 px-4 rounded-md"
                    >
                      Clear All Clients
                    </button>
                    <button
                      onClick={() => clearDatabase("bills")}
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-2 px-4 rounded-md"
                    >
                      Clear All Bills
                    </button>
                    <button
                      onClick={() => clearDatabase("fieldOfficers")}
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-2 px-4 rounded-md"
                    >
                      Clear All Field Officers
                    </button>
                    <button
                      onClick={() => clearDatabase("salesmen")}
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-2 px-4 rounded-md"
                    >
                      Clear All Salesmen
                    </button>
                  </div>
                </div>

                <div className="p-4 border border-red-200 rounded-md bg-red-50">
                  <h3 className="text-lg font-medium mb-2">Danger Zone</h3>
                  <p className="text-sm text-red-600 mb-3">
                    Warning: This action will delete all data and cannot be undone.
                  </p>
                  <button
                    onClick={() => clearDatabase("all")}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "backup" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Backup & Restore</h2>
              <div className="space-y-6">
                <div className="p-4 border border-gray-200 rounded-md">
                  <h3 className="text-lg font-medium mb-2">Export Data</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Export your data to JSON files that can be imported later.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => exportData("products")}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-4 rounded-md"
                    >
                      Export Products
                    </button>
                    <button
                      onClick={() => exportData("clients")}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-4 rounded-md"
                    >
                      Export Clients
                    </button>
                    <button
                      onClick={() => exportData("bills")}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-4 rounded-md"
                    >
                      Export Bills
                    </button>
                    <button
                      onClick={() => exportData("fieldOfficers")}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-4 rounded-md"
                    >
                      Export Field Officers
                    </button>
                    <button
                      onClick={() => exportData("salesmen")}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-4 rounded-md"
                    >
                      Export Salesmen
                    </button>
                    <button
                      onClick={() => exportData("all")}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
                    >
                      Export All Data
                    </button>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-md">
                  <h3 className="text-lg font-medium mb-2">Import Data</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Import data from previously exported JSON files. This will replace your current data.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => importData("products")}
                      className="bg-green-100 hover:bg-green-200 text-green-800 py-2 px-4 rounded-md"
                    >
                      Import Products
                    </button>
                    <button
                      onClick={() => importData("clients")}
                      className="bg-green-100 hover:bg-green-200 text-green-800 py-2 px-4 rounded-md"
                    >
                      Import Clients
                    </button>
                    <button
                      onClick={() => importData("bills")}
                      className="bg-green-100 hover:bg-green-200 text-green-800 py-2 px-4 rounded-md"
                    >
                      Import Bills
                    </button>
                    <button
                      onClick={() => importData("fieldOfficers")}
                      className="bg-green-100 hover:bg-green-200 text-green-800 py-2 px-4 rounded-md"
                    >
                      Import Field Officers
                    </button>
                    <button
                      onClick={() => importData("salesmen")}
                      className="bg-green-100 hover:bg-green-200 text-green-800 py-2 px-4 rounded-md"
                    >
                      Import Salesmen
                    </button>
                    <button
                      onClick={() => importData("all")}
                      className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
                    >
                      Import All Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "application" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Application Settings</h2>
              <form onSubmit={saveAppConfig} className="space-y-4 max-w-md">
                <div>
                  <label htmlFor="locale" className="block text-sm font-medium text-gray-700 mb-1">
                    Date & Time Locale
                  </label>
                  <select
                    id="locale"
                    name="locale"
                    value={appConfig.locale}
                    onChange={handleAppConfigChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="en-GB">British English (DD/MM/YYYY)</option>
                    <option value="en-US">US English (MM/DD/YYYY)</option>
                    <option value="en-PK">Pakistan English (DD/MM/YYYY)</option>
                    <option value="ur-PK">Urdu (Pakistan)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Determines the format of dates (e.g., 21/01/2026 vs 01/21/2026).
                  </p>
                </div>
                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                    Application Timezone
                  </label>
                  <select
                    id="timezone"
                    name="timezone"
                    value={appConfig.timezone}
                    onChange={handleAppConfigChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
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
                  <p className="mt-1 text-xs text-gray-500">
                    Fixes the application time regardless of your computer's local settings.
                  </p>
                </div>
                <div>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md">
                    Save Application Settings
                  </button>
                </div>
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <h4 className="text-sm font-bold text-yellow-800 mb-1">Preview</h4>
                  <p className="text-sm text-yellow-700">
                    Current date format: {new Date().toLocaleDateString(appConfig.locale, { timeZone: appConfig.timezone })}
                  </p>
                  <p className="text-sm text-yellow-700">
                    Current time format: {new Date().toLocaleTimeString(appConfig.locale, { timeZone: appConfig.timezone })}
                  </p>
                </div>
              </form>
            </div>
          )}

          {activeTab === "updates" && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Application Updates</h2>
              <div className="space-y-4 max-w-2xl">
                <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
                  <p className="text-sm text-gray-600">
                    The app will check GitHub Releases automatically for newer versions and prompt you to install them.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCheckForUpdates}
                      disabled={isCheckingUpdates}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md"
                    >
                      {isCheckingUpdates ? "Checking..." : "Check for Updates"}
                    </button>
                    <button
                      type="button"
                      onClick={handleInstallPendingUpdate}
                      className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md"
                    >
                      Install Update
                    </button>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-md">
                  <h3 className="text-lg font-medium mb-2">Current Status</h3>
                  <p className="text-sm text-gray-700">{updateStatus}</p>
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
