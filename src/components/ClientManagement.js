"use client"

import { useState, useEffect, useRef } from "react"
import toast from "react-hot-toast"
import { useLazyData } from "../hooks/useLazyData"
import dataService from "../services/DataService"

const emptyClient = {
  clientName: "",
  clientNumber: "",
  clientAddress: "",
  isFiler: false,
  ntnNumber: "",
}

function ClientManagement() {
  const {
    data: clients,
    loading: clientsLoading,
    error: clientsError,
    search: searchClients,
    refresh: refreshClients,
    loadMore,
    hasMore,
    total
  } = useLazyData('clients', '', 50)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentClient, setCurrentClient] = useState(emptyClient)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const clientNameInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const formRef = useRef(null)

  useEffect(() => {
    searchClients(searchTerm)
  }, [searchTerm, searchClients])

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    if (isModalOpen && clientNameInputRef.current) {
      setTimeout(() => {
        clientNameInputRef.current.focus()
      }, 100)
    }
  }, [isModalOpen])

  const openClientModal = (client = emptyClient, editing = false) => {
    setCurrentClient({ ...client })
    setIsEditing(editing)
    setIsModalOpen(true)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A")) {
        if (
          !isModalOpen &&
          document.activeElement.tagName !== "INPUT" &&
          document.activeElement.tagName !== "TEXTAREA"
        ) {
          e.preventDefault()
          openClientModal()
        }
      }

      if (isModalOpen && (e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault()
        if (formRef.current) {
          if (typeof formRef.current.requestSubmit === "function") {
            formRef.current.requestSubmit()
          } else {
            formRef.current.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
          }
        }
      }

      if (isModalOpen && (e.metaKey || e.ctrlKey) && (e.key === "c" || e.key === "C")) {
        e.preventDefault()
        setIsModalOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isModalOpen])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setCurrentClient({
      ...currentClient,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentClient.clientName || !currentClient.clientNumber || !currentClient.clientAddress) {
      toast.error("Please fill in all required fields")
      return
    }

    if (currentClient.isFiler && !currentClient.ntnNumber) {
      toast.error("NTN Number is required for filers")
      return
    }

    try {
      if (isEditing) {
        await window.api.updateClient(currentClient)
        toast.success("Client updated successfully")
      } else {
        await window.api.addClient(currentClient)
        toast.success("Client added successfully")
      }

      setIsModalOpen(false)
      setCurrentClient(emptyClient)
      setIsEditing(false)
      dataService.invalidateCacheOnModification('clients')
      await refreshClients()
    } catch (error) {
      console.error("Error saving client:", error)
      toast.error("Failed to save client")
    }
  }

  const handleEdit = (client) => {
    openClientModal(client, true)
  }

  const handleDelete = (id) => {
    setConfirmDeleteId(id)
  }

  const performDelete = async (id) => {
    setDeletingId(id)
    try {
      await window.api.deleteClient(id)
      toast.success("Client deleted successfully")
      dataService.invalidateCacheOnModification('clients')
      await refreshClients()
    } catch (error) {
      console.error("Error deleting client:", error)
      toast.error("Failed to delete client")
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 px-2 sm:px-4">
      {/* Top Header Card */}
      <div className="mb-6 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl shadow-xl p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
            <svg className="w-7 h-7 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Client Directory</h1>
            <p className="text-blue-200 text-sm mt-0.5">Manage customer accounts, tax filer status, and contact details</p>
          </div>
        </div>
        <button
          onClick={() => openClientModal()}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Add New Client
        </button>
      </div>

      {/* Search Bar Card */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-4 mb-6">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search clients by name, contact number, or address..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Clients Table Card */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800 text-sm">Client Records</h3>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
              {clients.length} shown of {total}
            </span>
          </div>
        </div>

        {clientsError && (
          <div className="border-b border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center justify-between gap-3">
              <span>{clientsError}</span>
              <button
                onClick={() => refreshClients()}
                className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {clientsLoading && clients.length === 0 && (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm font-semibold text-gray-600">Loading client records...</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Client Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Phone</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Filer Status</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.length > 0 ? (
                clients.map((client) => (
                  <tr key={client._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{client.clientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">📞 {client.clientNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.clientAddress}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {client.isFiler ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Filer (NTN: {client.ntnNumber})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Non-Filer
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => handleEdit(client)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>

                        {confirmDeleteId === client._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => performDelete(client._id)}
                              disabled={deletingId === client._id}
                              className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm"
                            >
                              {deletingId === client._id ? "Deleting..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={!!deletingId}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-xl text-xs font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDelete(client._id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors"
                            disabled={!!deletingId}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-500">
                    {searchTerm
                      ? "No clients found matching your search."
                      : "No clients available. Add your first client!"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={clientsLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {clientsLoading ? "Loading..." : "Load More Clients"}
          </button>
        </div>
      )}

      {/* Modal for adding/editing clients */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 transform transition-all">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {isEditing ? "Edit Client" : "Add New Client"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} ref={formRef} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5" htmlFor="clientName">
                  Client / Party Name *
                </label>
                <input
                  ref={clientNameInputRef}
                  type="text"
                  id="clientName"
                  name="clientName"
                  value={currentClient.clientName}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5" htmlFor="clientNumber">
                  Contact Phone Number *
                </label>
                <input
                  type="text"
                  id="clientNumber"
                  name="clientNumber"
                  value={currentClient.clientNumber}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5" htmlFor="clientAddress">
                  Address *
                </label>
                <textarea
                  id="clientAddress"
                  name="clientAddress"
                  value={currentClient.clientAddress}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  required
                ></textarea>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-gray-200">
                  <input
                    type="checkbox"
                    name="isFiler"
                    checked={currentClient.isFiler}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-800 text-xs font-bold">Registered Tax Filer</span>
                </label>
              </div>

              {currentClient.isFiler && (
                <div>
                  <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5" htmlFor="ntnNumber">
                    NTN Registration Number *
                  </label>
                  <input
                    type="text"
                    id="ntnNumber"
                    name="ntnNumber"
                    value={currentClient.ntnNumber}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl text-xs shadow-md"
                >
                  {isEditing ? "Update Client" : "Add Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientManagement
