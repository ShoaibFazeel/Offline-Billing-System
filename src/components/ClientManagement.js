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
  // Use lazy loading for clients
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

  // Add ref for auto-focus
  const clientNameInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const formRef = useRef(null)

  // Handle search term changes
  useEffect(() => {
    searchClients(searchTerm)
  }, [searchTerm, searchClients])

  useEffect(() => {
    // Auto-focus search input when component mounts
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  // Add effect for modal auto-focus
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

  // Add keyboard shortcuts for Cmd/Ctrl + A to trigger the add functionality
  // and Cmd/Ctrl + S to save and Cmd/Ctrl + C to cancel when modal is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + A to open the add-client modal when it is not already open
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

      // Cmd/Ctrl + S to submit form when modal is open
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

      // Cmd/Ctrl + C to close modal when modal is open
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
      // Invalidate cache and refresh data
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

  // Clients are already filtered by the search function, no need to filter again

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Client Management: ({clients.length} of {total})</h1>
        <button
          onClick={() => openClientModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Add New Client
        </button>
      </div>

      <div className="mb-4">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search clients by name or number or area..."
          className="w-full p-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading clients...</p>
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Filer Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clients.length > 0 ? (
              clients.map((client) => (
                <tr key={client._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.clientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.clientNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.clientAddress}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.isFiler ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Filer (NTN: {client.ntnNumber})
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        Non-Filer
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEdit(client)} className={`text-blue-600 hover:text-blue-900 mr-4 ${deletingId ? 'opacity-50 pointer-events-none' : ''}`}>
                      Edit
                    </button>
                    {confirmDeleteId === client._id ? (
                      <>
                        <button
                          onClick={() => performDelete(client._id)}
                          disabled={deletingId === client._id}
                          className="bg-red-600 text-white px-2 py-1 rounded-md mr-2"
                        >
                          {deletingId === client._id ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={!!deletingId}
                          className="border border-gray-300 px-2 py-1 rounded-md"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleDelete(client._id)} className="text-red-600 hover:text-red-900" disabled={!!deletingId}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                  {searchTerm
                    ? "No clients found matching your search."
                    : "No clients available. Add your first client!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={clientsLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md"
          >
            {clientsLoading ? 'Loading...' : 'Load More Clients'}
          </button>
        </div>
      )}

      {/* Modal for adding/editing clients */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{isEditing ? "Edit Client" : "Add New Client"}</h2>
              <div className="text-sm text-gray-500">
                <span className="mr-2">
                  <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Ctrl+S</kbd> Save
                </span>
                <span>
                  <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">Ctrl+C</kbd> Cancel
                </span>
              </div>
            </div>
            <form onSubmit={handleSubmit} ref={formRef}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="clientName">
                  Client Name *
                </label>
                <input
                  ref={clientNameInputRef}
                  type="text"
                  id="clientName"
                  name="clientName"
                  value={currentClient.clientName}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="clientNumber">
                  Contact Number *
                </label>
                <input
                  type="text"
                  id="clientNumber"
                  name="clientNumber"
                  value={currentClient.clientNumber}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="clientAddress">
                  Address *
                </label>
                <textarea
                  id="clientAddress"
                  name="clientAddress"
                  value={currentClient.clientAddress}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows="3"
                  required
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isFiler"
                    checked={currentClient.isFiler}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-gray-700 text-sm font-bold">Is Tax Filer</span>
                </label>
              </div>
              {currentClient.isFiler && (
                <div className="mb-6">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="ntnNumber">
                    NTN Number *
                  </label>
                  <input
                    type="text"
                    id="ntnNumber"
                    name="ntnNumber"
                    value={currentClient.ntnNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md mr-2"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                  {isEditing ? "Update" : "Add"}
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
