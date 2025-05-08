"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"

function SalesmanManagement() {
  const [salesmen, setSalesmen] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentSalesman, setCurrentSalesman] = useState({
    name: "",
    phoneNumber: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchSalesmen()
  }, [])

  const fetchSalesmen = async () => {
    try {
      const data = await window.api.getSalesmen()
      setSalesmen(data)
    } catch (error) {
      console.error("Error fetching salesmen:", error)
      toast.error("Failed to load salesmen")
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setCurrentSalesman({
      ...currentSalesman,
      [name]: value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentSalesman.name || !currentSalesman.phoneNumber) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      if (isEditing) {
        await window.api.updateSalesman(currentSalesman)
        toast.success("Salesman updated successfully")
      } else {
        await window.api.addSalesman(currentSalesman)
        toast.success("Salesman added successfully")
      }

      setIsModalOpen(false)
      setCurrentSalesman({
        name: "",
        phoneNumber: "",
      })
      setIsEditing(false)
      fetchSalesmen()
    } catch (error) {
      console.error("Error saving salesman:", error)
      toast.error("Failed to save salesman")
    }
  }

  const handleEdit = (salesman) => {
    setCurrentSalesman(salesman)
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this salesman?")) {
      try {
        await window.api.deleteSalesman(id)
        toast.success("Salesman deleted successfully")
        fetchSalesmen()
      } catch (error) {
        console.error("Error deleting salesman:", error)
        toast.error("Failed to delete salesman")
      }
    }
  }

  const filteredSalesmen = salesmen.filter(
    (salesman) =>
      salesman.name.toLowerCase().includes(searchTerm.toLowerCase()) || salesman.phoneNumber.includes(searchTerm),
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Salesman Management</h1>
        <button
          onClick={() => {
            setCurrentSalesman({
              name: "",
              phoneNumber: "",
            })
            setIsEditing(false)
            setIsModalOpen(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Add New Salesman
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search salesmen by name or phone number..."
          className="w-full p-2 border border-gray-300 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
            {filteredSalesmen.length > 0 ? (
              filteredSalesmen.map((salesman) => (
                <tr key={salesman._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{salesman.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{salesman.phoneNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEdit(salesman)} className="text-blue-600 hover:text-blue-900 mr-4">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(salesman._id)} className="text-red-600 hover:text-red-900">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                  {searchTerm
                    ? "No salesmen found matching your search."
                    : "No salesmen available. Add your first salesman!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for adding/editing salesmen */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">{isEditing ? "Edit Salesman" : "Add New Salesman"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={currentSalesman.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
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
                  value={currentSalesman.phoneNumber}
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

export default SalesmanManagement
