"use client"

import { useState, useEffect, useRef } from "react"
import toast from "react-hot-toast"
import { useLazyData } from "../hooks/useLazyData"
import dataService from "../services/DataService"

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
  const [currentClient, setCurrentClient] = useState({
    clientName: "",
    clientNumber: "",
    clientAddress: "",
    isFiler: false,
    ntnNumber: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

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

  // Add keyboard shortcuts for Cmd/Ctrl + A to trigger the add functionality
  // and Cmd/Ctrl + S to save and Cmd/Ctrl + C to cancel when modal is open
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd+A (Mac) or Ctrl+A (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A")) {
        // Prevent the default behavior (select all text)
        e.preventDefault()

        // Only trigger if not in a text input or textarea and modal is not open
        if (
          !isModalOpen &&
          document.activeElement.tagName !== "INPUT" &&
          document.activeElement.tagName !== "TEXTAREA"
        ) {
          setCurrentClient({
            clientName: "",
            clientNumber: "",
            clientAddress: "",
            isFiler: false,
            ntnNumber: "",
          })
          setIsEditing(false)
          setIsModalOpen(true)
        }
      }

      // Add keyboard shortcuts for modal when it's open
      if (isModalOpen) {
        // Cmd/Ctrl + S to submit form
        if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
          e.preventDefault()
          if (formRef.current) {
            formRef.current.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
          }
        }
        // Cmd/Ctrl + C to close modal
        else if ((e.metaKey || e.ctrlKey) && (e.key === "c" || e.key === "C")) {
          e.preventDefault()
          setIsModalOpen(false)
        }
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
      setCurrentClient({
        clientName: "",
        clientNumber: "",
        clientAddress: "",
        isFiler: false,
        ntnNumber: "",
      })
      setIsEditing(false)
      // Invalidate cache and refresh data
      dataService.invalidateCacheOnModification('clients')
      refreshClients()
    } catch (error) {
      console.error("Error saving client:", error)
      toast.error("Failed to save client")
    }
  }

  const handleEdit = (client) => {
    setCurrentClient(client)
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client? This action cannot be undone and will restore client.")) {
      return
    }

    try {
      await window.api.deleteClient(id);
      toast.success("Client deleted successfully");
      // Invalidate cache and refresh data
      dataService.invalidateCacheOnModification('clients')
      refreshClients()
    } catch (error) {
      console.error("Error deleting client:", error)
      toast.error("Failed to delete client")
    }
  }

  // Clients are already filtered by the search function, no need to filter again

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Client Management: ({clients.length} of {total})</h1>
        <button
          onClick={() => {
            setCurrentClient({
              clientName: "",
              clientNumber: "",
              clientAddress: "",
              isFiler: false,
              ntnNumber: "",
            })
            setIsEditing(false)
            setIsModalOpen(true)
          }}
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
                    <button onClick={() => handleEdit(client)} className="text-blue-600 hover:text-blue-900 mr-4">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(client._id)} className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
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
