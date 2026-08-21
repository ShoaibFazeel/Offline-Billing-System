"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import toast from "react-hot-toast"

const emptyFieldOfficer = {
  name: "",
  phoneNumber: "",
}

function FieldOfficerManagement() {
  const [fieldOfficers, setFieldOfficers] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentFieldOfficer, setCurrentFieldOfficer] = useState(emptyFieldOfficer)
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Add ref for auto-focus
  const nameInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const formRef = useRef(null)

  useEffect(() => {
    fetchFieldOfficers()

    // Auto-focus search input when component mounts
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  // Add effect for modal auto-focus
  useEffect(() => {
    if (isModalOpen && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isModalOpen])

  const openFieldOfficerModal = (fieldOfficer = emptyFieldOfficer, editing = false) => {
    setCurrentFieldOfficer({ ...fieldOfficer })
    setIsEditing(editing)
    setIsModalOpen(true)
  }

  // Add a keyboard shortcut for Cmd/Ctrl + A to trigger the add functionality
  // Add this after the existing useEffect hooks

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd+A (Mac) or Ctrl+A (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A")) {
        // Prevent the default behavior (select all text)
        e.preventDefault()

        // Only trigger if not in a text input or textarea
        if (document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
          setCurrentFieldOfficer({
            name: "",
            phoneNumber: "",
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
            if (typeof formRef.current.requestSubmit === "function") {
              formRef.current.requestSubmit()
            } else {
              formRef.current.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
            }
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

  const fetchFieldOfficers = async () => {
    try {
      const data = await window.api.getFieldOfficers()
      setFieldOfficers(data)
    } catch (error) {
      console.error("Error fetching field officers:", error)
      toast.error("Failed to load field officers")
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setCurrentFieldOfficer({
      ...currentFieldOfficer,
      [name]: value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentFieldOfficer.name || !currentFieldOfficer.phoneNumber) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      if (isEditing) {
        await window.api.updateFieldOfficer(currentFieldOfficer)
        toast.success("Field officer updated successfully")
      } else {
        await window.api.addFieldOfficer(currentFieldOfficer)
        toast.success("Field officer added successfully")
      }

      setIsModalOpen(false)
      setCurrentFieldOfficer({
        name: "",
        phoneNumber: "",
      })
      setIsEditing(false)
      fetchFieldOfficers()
    } catch (error) {
      console.error("Error saving field officer:", error)
      toast.error("Failed to save field officer")
    }
  }

  const handleEdit = (fieldOfficer) => {
    openFieldOfficerModal(fieldOfficer, true)
  }

  const handleDelete = (id) => {
    setConfirmDeleteId(id)
  }

  const performDelete = async (id) => {
    setDeletingId(id)
    try {
      await window.api.deleteFieldOfficer(id)
      toast.success("Field officer deleted successfully")
      await fetchFieldOfficers()
    } catch (error) {
      console.error("Error deleting field officer:", error)
      toast.error("Failed to delete field officer")
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const filteredFieldOfficers = useMemo(
    () =>
      fieldOfficers.filter(
        (officer) =>
          officer.name.toLowerCase().includes(normalizedSearchTerm) ||
          officer.phoneNumber.includes(normalizedSearchTerm),
      ),
    [fieldOfficers, normalizedSearchTerm],
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Field Officer Management</h1>
        <button
          onClick={() => openFieldOfficerModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Add New Field Officer
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search field officers by name or phone number..."
          className="w-full p-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          ref={searchInputRef}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFieldOfficers.length > 0 ? (
              filteredFieldOfficers.map((officer) => (
                <tr key={officer._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{officer.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{officer.phoneNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEdit(officer)} className={`text-blue-600 hover:text-blue-900 mr-4 ${deletingId ? 'opacity-50 pointer-events-none' : ''}`}>
                      Edit
                    </button>
                    {confirmDeleteId === officer._id ? (
                      <>
                        <button
                          onClick={() => performDelete(officer._id)}
                          disabled={deletingId === officer._id}
                          className="bg-red-600 text-white px-2 py-1 rounded-md mr-2"
                        >
                          {deletingId === officer._id ? 'Deleting...' : 'Confirm Delete'}
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
                      <button onClick={() => handleDelete(officer._id)} className="text-red-600 hover:text-red-900" disabled={!!deletingId}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                  {searchTerm
                    ? "No field officers found matching your search."
                    : "No field officers available. Add your first field officer!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for adding/editing field officers */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{isEditing ? "Edit Field Officer" : "Add New Field Officer"}</h2>
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
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={currentFieldOfficer.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                  ref={nameInputRef}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phoneNumber">
                  Phone Number *
                </label>
                <input
                  type="text"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={currentFieldOfficer.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
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

export default FieldOfficerManagement
