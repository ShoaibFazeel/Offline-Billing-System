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

  const nameInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const formRef = useRef(null)

  useEffect(() => {
    fetchFieldOfficers()

    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A")) {
        e.preventDefault()
        if (document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
          setCurrentFieldOfficer({
            name: "",
            phoneNumber: "",
          })
          setIsEditing(false)
          setIsModalOpen(true)
        }
      }

      if (isModalOpen) {
        if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
          e.preventDefault()
          if (formRef.current) {
            if (typeof formRef.current.requestSubmit === "function") {
              formRef.current.requestSubmit()
            } else {
              formRef.current.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
            }
          }
        } else if ((e.metaKey || e.ctrlKey) && (e.key === "c" || e.key === "C")) {
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
    <div className="max-w-7xl mx-auto pb-12 px-2 sm:px-4">
      {/* Top Header Card */}
      <div className="mb-6 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl shadow-xl p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
            <svg className="w-7 h-7 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Field Officer Management</h1>
            <p className="text-blue-200 text-sm mt-0.5">Manage field officers and contact credentials</p>
          </div>
        </div>
        <button
          onClick={() => openFieldOfficerModal()}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Add Field Officer
        </button>
      </div>

      {/* Search Input Card */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-4 mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search field officers by name or phone number..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            ref={searchInputRef}
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Field Officers Table Card */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800 text-sm">Registered Officers</h3>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
              {filteredFieldOfficers.length} records
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Officer Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phone Number</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFieldOfficers.length > 0 ? (
                filteredFieldOfficers.map((officer) => (
                  <tr key={officer._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{officer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">📞 {officer.phoneNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => handleEdit(officer)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>

                        {confirmDeleteId === officer._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => performDelete(officer._id)}
                              disabled={deletingId === officer._id}
                              className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm"
                            >
                              {deletingId === officer._id ? "Deleting..." : "Confirm"}
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
                            onClick={() => handleDelete(officer._id)}
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
                  <td colSpan="3" className="px-6 py-12 text-center text-sm text-gray-500">
                    {searchTerm
                      ? "No field officers found matching your search."
                      : "No field officers available. Add your first field officer!"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for adding/editing field officers */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 transform transition-all">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {isEditing ? "Edit Field Officer" : "Add Field Officer"}
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
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5" htmlFor="name">
                  Officer Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={currentFieldOfficer.name}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  required
                  ref={nameInputRef}
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5" htmlFor="phoneNumber">
                  Phone Number *
                </label>
                <input
                  type="text"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={currentFieldOfficer.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

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
                  {isEditing ? "Update Officer" : "Add Officer"}
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
