"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import toast from "react-hot-toast"

// Add this import at the top of the file
import PdfGenerator from "./PdfGenerator"

// Helper function to generate a unique ID
function generateUniqueId() {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function ViewBill() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bill, setBill] = useState(null)
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [fieldOfficers, setFieldOfficers] = useState([])
  const [salesmen, setSalesmen] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [editedBill, setEditedBill] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [fieldOfficerSearchTerm, setFieldOfficerSearchTerm] = useState("")
  const [salesmanSearchTerm, setSalesmanSearchTerm] = useState("")
  const [productSearchTerms, setProductSearchTerms] = useState({})
  const [originalItems, setOriginalItems] = useState([])

  useEffect(() => {
    fetchBill()
    fetchClients()
    fetchProducts()
    fetchFieldOfficers()
    fetchSalesmen()
  }, [id])

  const fetchBill = async () => {
    try {
      const data = await window.api.getBill(id)
      setBill(data)
      setEditedBill(JSON.parse(JSON.stringify(data))) // Deep copy for editing
      setOriginalItems(JSON.parse(JSON.stringify(data.items))) // Keep original items for inventory comparison
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching bill:", error)
      toast.error("Failed to load bill")
      setIsLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const data = await window.api.getClients()
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const fetchProducts = async () => {
    try {
      const data = await window.api.getProducts()
      setProducts(data)
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const fetchFieldOfficers = async () => {
    try {
      const data = await window.api.getFieldOfficers()
      setFieldOfficers(data)
    } catch (error) {
      console.error("Error fetching field officers:", error)
    }
  }

  const fetchSalesmen = async () => {
    try {
      const data = await window.api.getSalesmen()
      setSalesmen(data)
    } catch (error) {
      console.error("Error fetching salesmen:", error)
    }
  }

  const handleClientSearch = (e) => {
    setClientSearchTerm(e.target.value)
  }

  const handleFieldOfficerSearch = (e) => {
    setFieldOfficerSearchTerm(e.target.value)
  }

  const handleSalesmanSearch = (e) => {
    setSalesmanSearchTerm(e.target.value)
  }

  const handleProductSearch = (index, value) => {
    setProductSearchTerms((prev) => ({
      ...prev,
      [index]: value,
    }))
  }

  const handleClientSelect = (client) => {
    setEditedBill({
      ...editedBill,
      clientId: client._id,
      clientName: client.clientName,
    })
    setClientSearchTerm("")
  }

  const handleFieldOfficerSelect = (fieldOfficer) => {
    setEditedBill({
      ...editedBill,
      fieldOfficerId: fieldOfficer._id,
      fieldOfficerName: fieldOfficer.name,
    })
    setFieldOfficerSearchTerm("")
  }

  const handleSalesmanSelect = (salesman) => {
    setEditedBill({
      ...editedBill,
      salesmanId: salesman._id,
      salesmanName: salesman.name,
    })
    setSalesmanSearchTerm("")
  }

  const handleProductSelect = (index, product) => {
    const updatedItems = [...editedBill.items]
    updatedItems[index] = {
      ...updatedItems[index],
      productId: product._id,
      productName: product.productName,
      rate: product.productPrice,
      availableQuantity: product.hasInfiniteQuantity !== false ? Number.POSITIVE_INFINITY : product.quantity,
      hasInfiniteQuantity: product.hasInfiniteQuantity !== false,
      total: calculateItemTotal(updatedItems[index].quantity, product.productPrice, updatedItems[index].discount),
    }

    const totalAmount = calculateBillTotal(updatedItems)

    setEditedBill({
      ...editedBill,
      items: updatedItems,
      totalAmount,
    })

    // Clear the search term for this product
    setProductSearchTerms((prev) => ({
      ...prev,
      [index]: "",
    }))
  }

  const filteredClients = clientSearchTerm
    ? clients.filter(
        (client) =>
          client.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
          client.clientNumber.includes(clientSearchTerm),
      )
    : clients

  const filteredFieldOfficers = fieldOfficerSearchTerm
    ? fieldOfficers.filter(
        (officer) =>
          officer.name.toLowerCase().includes(fieldOfficerSearchTerm.toLowerCase()) ||
          officer.phoneNumber.includes(fieldOfficerSearchTerm),
      )
    : fieldOfficers

  const filteredSalesmen = salesmanSearchTerm
    ? salesmen.filter(
        (salesman) =>
          salesman.name.toLowerCase().includes(salesmanSearchTerm.toLowerCase()) ||
          salesman.phoneNumber.includes(salesmanSearchTerm),
      )
    : salesmen

  const getFilteredProducts = (index) => {
    const searchTerm = productSearchTerms[index] || ""
    return searchTerm
      ? products.filter((product) => product.productName.toLowerCase().includes(searchTerm.toLowerCase()))
      : products
  }

  const handleDateChange = (e) => {
    setEditedBill({
      ...editedBill,
      billDate: new Date(e.target.value),
    })
  }

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...editedBill.items]
    const item = updatedItems[index]

    if (field === "quantity" || field === "rate" || field === "discount") {
      value = Number.parseFloat(value) || 0
    }

    // Check if quantity exceeds available quantity
    if (field === "quantity" && item.hasInfiniteQuantity === false) {
      // Find the original item to calculate the available quantity
      const originalItem = originalItems.find((oi) => oi._id === item._id)
      const originalQuantity = originalItem ? originalItem.quantity : 0

      // Get the product's current quantity
      const product = products.find((p) => p._id === item.productId)
      if (product) {
        // Available = current product quantity + original bill quantity
        const availableQuantity = product.quantity + originalQuantity

        if (value > availableQuantity) {
          toast.error(`Only ${availableQuantity} units of ${item.productName} are available`)
          value = availableQuantity
        }
      }
    }

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    }

    // Recalculate total for this item
    if (field === "quantity" || field === "rate" || field === "discount") {
      updatedItems[index].total = calculateItemTotal(
        updatedItems[index].quantity,
        updatedItems[index].rate,
        updatedItems[index].discount,
      )
    }

    const totalAmount = calculateBillTotal(updatedItems)

    setEditedBill({
      ...editedBill,
      items: updatedItems,
      totalAmount,
    })
  }

  const calculateItemTotal = (quantity, rate, discount) => {
    return quantity * rate * (1 - discount / 100)
  }

  const calculateBillTotal = (items) => {
    return items.reduce((sum, item) => {
      if (!item.isBonus) {
        return sum + item.total
      }
      return sum
    }, 0)
  }

  const addItem = () => {
    const updatedItems = [
      ...editedBill.items,
      {
        _id: generateUniqueId(),
        productId: "",
        productName: "",
        quantity: 1,
        rate: 0,
        discount: 0,
        total: 0,
        isBonus: false,
      },
    ]

    setEditedBill({
      ...editedBill,
      items: updatedItems,
    })
  }

  const removeItem = (index) => {
    const updatedItems = editedBill.items.filter((_, i) => i !== index)
    const totalAmount = calculateBillTotal(updatedItems)

    setEditedBill({
      ...editedBill,
      items: updatedItems,
      totalAmount,
    })
  }

  const toggleBonus = (index) => {
    const updatedItems = [...editedBill.items]
    updatedItems[index] = {
      ...updatedItems[index],
      isBonus: !updatedItems[index].isBonus,
    }

    const totalAmount = calculateBillTotal(updatedItems)

    setEditedBill({
      ...editedBill,
      items: updatedItems,
      totalAmount,
    })
  }

  const checkInventoryLevels = () => {
    // Create a map to track total quantities for each product
    const productQuantities = new Map()

    // Add quantities from edited bill
    editedBill.items.forEach((item) => {
      if (item.productId) {
        const currentQty = productQuantities.get(item.productId) || 0
        productQuantities.set(item.productId, currentQty + item.quantity)
      }
    })

    // Subtract quantities from original bill
    originalItems.forEach((item) => {
      if (item.productId) {
        const currentQty = productQuantities.get(item.productId) || 0
        productQuantities.set(item.productId, currentQty - item.quantity)
      }
    })

    // Check if any product exceeds available quantity
    let hasInsufficientInventory = false

    productQuantities.forEach((netQuantity, productId) => {
      // Skip if net quantity is negative or zero (we're using less or the same amount)
      if (netQuantity <= 0) return

      const product = products.find((p) => p._id === productId)
      if (product && product.hasInfiniteQuantity === false && netQuantity > product.quantity) {
        toast.error(
          `Insufficient inventory for ${product.productName}. Available: ${product.quantity}, Additional required: ${netQuantity}`,
        )
        hasInsufficientInventory = true
      }
    })

    return !hasInsufficientInventory
  }

  const saveBill = async () => {
    try {
      // Check inventory levels
      if (!checkInventoryLevels()) {
        return
      }

      // Ensure all items have an _id
      const itemsWithIds = editedBill.items.map((item) => {
        if (!item._id) {
          return {
            ...item,
            _id: generateUniqueId(),
          }
        }
        return item
      })

      const billToSave = {
        ...editedBill,
        items: itemsWithIds,
      }

      console.log("Saving updated bill:", JSON.stringify(billToSave))
      await window.api.updateBill(billToSave)
      toast.success("Bill updated successfully")
      setIsEditing(false)
      fetchBill() // Refresh bill data
    } catch (error) {
      console.error("Error updating bill:", error)
      toast.error("Failed to update bill")
    }
  }

  // Replace the existing generatePDF function with this one
  const generatePDF = async () => {
    try {
      // Get client details
      const client = clients.find((c) => c._id === bill.clientId) || {
        clientName: bill.clientName,
        clientAddress: "N/A",
        clientNumber: "N/A",
        isFiler: false,
        ntnNumber: "",
      }

      // Get field officer details
      const fieldOfficer = fieldOfficers.find((o) => o._id === bill.fieldOfficerId) || {
        name: bill.fieldOfficerName || "N/A",
        phoneNumber: "N/A",
      }

      // Get salesman details
      const salesman = salesmen.find((s) => s._id === bill.salesmanId) || {
        name: bill.salesmanName || "N/A",
        phoneNumber: "N/A",
      }

      // Get company info
      const companyInfo = await window.api.getCompanyInfo()

      // Generate PDF
      const pdfGenerator = new PdfGenerator()
      const pdfBytes = await pdfGenerator.generateInvoicePdf(bill, client, companyInfo, fieldOfficer, salesman)

      // Create a blob and download
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `Invoice-${bill._id.substring(0, 8)}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      toast.success("PDF generated successfully")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error("Failed to generate PDF")
    }
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>
  }

  if (!bill) {
    return <div className="text-center py-10">Bill not found</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link to="/bills" className="mr-4">
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </Link>
          <h1 className="text-3xl font-bold">Bill #{bill._id.substring(0, 8)}</h1>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <button onClick={saveBill} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">
                Save Changes
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditedBill(JSON.parse(JSON.stringify(bill))) // Reset to original
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Edit Bill
              </button>
              <button
                onClick={generatePDF}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
              >
                Generate PDF
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Client Information</h2>
            {isEditing ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search client by name or number..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={clientSearchTerm}
                  onChange={handleClientSearch}
                />
                {clientSearchTerm && filteredClients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredClients.map((client) => (
                      <div
                        key={client._id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleClientSelect(client)}
                      >
                        <div className="font-medium">{client.clientName}</div>
                        <div className="text-sm text-gray-500">{client.clientNumber}</div>
                      </div>
                    ))}
                  </div>
                )}
                {editedBill.clientId && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-md">
                    <div className="font-medium">{clients.find((c) => c._id === editedBill.clientId)?.clientName}</div>
                    <div className="text-sm text-gray-500">
                      {clients.find((c) => c._id === editedBill.clientId)?.clientNumber}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="font-medium">{bill.clientName}</div>
                {clients.find((c) => c._id === bill.clientId) && (
                  <>
                    <div className="text-sm">{clients.find((c) => c._id === bill.clientId).clientNumber}</div>
                    <div className="text-sm">{clients.find((c) => c._id === bill.clientId).clientAddress}</div>
                    <div className="text-sm">
                      {clients.find((c) => c._id === bill.clientId).isFiler
                        ? `Filer (NTN: ${clients.find((c) => c._id === bill.clientId).ntnNumber})`
                        : "Non-Filer"}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Bill Details</h2>
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="mb-2">
                <span className="font-medium">Bill Date: </span>
                {isEditing ? (
                  <input
                    type="date"
                    value={new Date(editedBill.billDate).toISOString().split("T")[0]}
                    onChange={handleDateChange}
                    className="p-1 border border-gray-300 rounded-md"
                  />
                ) : (
                  new Date(bill.billDate).toLocaleDateString()
                )}
              </div>
              <div>
                <span className="font-medium">Total Amount: </span>PKR
                {(isEditing ? editedBill.totalAmount : bill.totalAmount).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Field Officer</h2>
            {isEditing ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search field officer by name or number..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={fieldOfficerSearchTerm}
                  onChange={handleFieldOfficerSearch}
                />
                {fieldOfficerSearchTerm && filteredFieldOfficers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredFieldOfficers.map((officer) => (
                      <div
                        key={officer._id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleFieldOfficerSelect(officer)}
                      >
                        <div className="font-medium">{officer.name}</div>
                        <div className="text-sm text-gray-500">{officer.phoneNumber}</div>
                      </div>
                    ))}
                  </div>
                )}
                {editedBill.fieldOfficerId && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-md">
                    <div className="font-medium">
                      {fieldOfficers.find((o) => o._id === editedBill.fieldOfficerId)?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {fieldOfficers.find((o) => o._id === editedBill.fieldOfficerId)?.phoneNumber}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="font-medium">{bill.fieldOfficerName || "Not specified"}</div>
                {fieldOfficers.find((o) => o._id === bill.fieldOfficerId) && (
                  <div className="text-sm">{fieldOfficers.find((o) => o._id === bill.fieldOfficerId).phoneNumber}</div>
                )}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Salesman</h2>
            {isEditing ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search salesman by name or number..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={salesmanSearchTerm}
                  onChange={handleSalesmanSearch}
                />
                {salesmanSearchTerm && filteredSalesmen.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredSalesmen.map((salesman) => (
                      <div
                        key={salesman._id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleSalesmanSelect(salesman)}
                      >
                        <div className="font-medium">{salesman.name}</div>
                        <div className="text-sm text-gray-500">{salesman.phoneNumber}</div>
                      </div>
                    ))}
                  </div>
                )}
                {editedBill.salesmanId && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-md">
                    <div className="font-medium">{salesmen.find((s) => s._id === editedBill.salesmanId)?.name}</div>
                    <div className="text-sm text-gray-500">
                      {salesmen.find((s) => s._id === editedBill.salesmanId)?.phoneNumber}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="font-medium">{bill.salesmanName || "Not specified"}</div>
                {salesmen.find((s) => s._id === bill.salesmanId) && (
                  <div className="text-sm">{salesmen.find((s) => s._id === bill.salesmanId).phoneNumber}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Bill Items</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                {isEditing && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(isEditing ? editedBill.items : bill.items).map((item, index) => (
                <tr key={item._id || index} className={item.isBonus ? "bg-green-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search product..."
                          className="w-full p-1 border border-gray-300 rounded-md"
                          value={productSearchTerms[index] || ""}
                          onChange={(e) => handleProductSearch(index, e.target.value)}
                        />
                        {productSearchTerms[index] && getFilteredProducts(index).length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {getFilteredProducts(index).map((product) => (
                              <div
                                key={product._id}
                                className="p-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleProductSelect(index, product)}
                              >
                                <div className="font-medium">{product.productName}</div>
                                <div className="text-sm text-gray-500">
                                  PKR {product.productPrice.toFixed(2)}
                                  {product.hasInfiniteQuantity === false
                                    ? ` - ${product.quantity} in stock`
                                    : " - Unlimited stock"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.productId && (
                          <div className="mt-1 p-1 bg-gray-50 rounded-md">
                            <div className="font-medium">
                              {products.find((p) => p._id === item.productId)?.productName}
                            </div>
                            <div className="text-sm text-gray-500">
                              PKR {products.find((p) => p._id === item.productId)?.productPrice.toFixed(2)}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      item.productName
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditing ? (
                      <div>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          className="w-full p-1 border border-gray-300 rounded-md"
                          min="1"
                        />
                        {item.productId && item.hasInfiniteQuantity === false && (
                          <div className="text-xs text-gray-500 mt-1">
                            {(() => {
                              const originalItem = originalItems.find((oi) => oi._id === item._id)
                              const originalQuantity = originalItem ? originalItem.quantity : 0
                              const product = products.find((p) => p._id === item.productId)
                              if (product) {
                                const availableQuantity = product.quantity + originalQuantity
                                return `Available: ${availableQuantity}`
                              }
                              return ""
                            })()}
                          </div>
                        )}
                      </div>
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditing ? (
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, "rate", e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded-md"
                        step="0.01"
                        min="0"
                      />
                    ) : (
                      `PKR ${item.rate.toFixed(2)}`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditing ? (
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) => handleItemChange(index, "discount", e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded-md"
                        min="0"
                        max="100"
                      />
                    ) : (
                      `${item.discount}%`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.isBonus ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        FREE
                      </span>
                    ) : (
                      `PKR ${item.total.toFixed(2)}`
                    )}
                  </td>
                  {isEditing && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => toggleBonus(index)}
                        className={`mr-2 px-2 py-1 rounded-md ${
                          item.isBonus ? "bg-gray-200 hover:bg-gray-300" : "bg-green-100 hover:bg-green-200"
                        }`}
                      >
                        {item.isBonus ? "Regular" : "Bonus"}
                      </button>
                      <button
                        onClick={() => removeItem(index)}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isEditing && (
          <div className="mt-4">
            <button onClick={addItem} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md">
              Add Item
            </button>
          </div>
        )}

        <div className="mt-6 text-right">
          <div className="text-xl font-bold">
            Total: PKR {(isEditing ? editedBill.totalAmount : bill.totalAmount).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewBill
