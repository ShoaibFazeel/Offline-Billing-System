"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"

// Helper function to generate a unique ID
function generateUniqueId() {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function BillGeneration() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [billItems, setBillItems] = useState([
    {
      id: Date.now(),
      _id: generateUniqueId(),
      productId: "",
      productName: "",
      quantity: 1,
      rate: 0,
      discount: 0,
      total: 0,
      isBonus: false,
      bonusItems: [],
    },
  ])
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0])
  const [billTotal, setBillTotal] = useState(0)
  const [productSearchTerms, setProductSearchTerms] = useState([])

  useEffect(() => {
    fetchClients()
    fetchProducts()
  }, [])

  useEffect(() => {
    calculateBillTotal()
  }, [billItems])

  useEffect(() => {
    setProductSearchTerms(billItems.map(() => ""))
  }, [billItems.length])

  const fetchClients = async () => {
    try {
      const data = await window.api.getClients()
      setClients(data)
    } catch (error) {
      console.error("Error fetching clients:", error)
      toast.error("Failed to load clients")
    }
  }

  const fetchProducts = async () => {
    try {
      const data = await window.api.getProducts()
      setProducts(data)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Failed to load products")
    }
  }

  const handleClientSelect = async (client) => {
    setSelectedClient(client)
    setClientSearchTerm("")
  }

  const handleProductSelect = async (index, productId) => {
    const product = products.find((p) => p._id === productId)
    if (!product) return

    // Check if there's a client-specific price for this product
    let rate = product.productPrice
    let discount = 0

    if (selectedClient) {
      try {
        const clientProduct = await window.api.getClientProduct(selectedClient._id, productId)
        if (clientProduct) {
          rate = clientProduct.rate
          discount = clientProduct.discount
        }
      } catch (error) {
        console.error("Error fetching client-product history:", error)
      }
    }

    const updatedItems = [...billItems]
    updatedItems[index] = {
      ...updatedItems[index],
      productId,
      productName: product.productName,
      rate,
      discount,
      total: calculateItemTotal(1, rate, discount),
    }
    setBillItems(updatedItems)
  }

  const handleInputChange = (index, field, value) => {
    const updatedItems = [...billItems]

    if (field === "quantity" || field === "rate" || field === "discount") {
      value = Number.parseFloat(value) || 0
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

    setBillItems(updatedItems)
  }

  const handleBonusInputChange = (itemIndex, bonusIndex, field, value) => {
    const updatedItems = [...billItems]

    if (field === "quantity" || field === "rate" || field === "discount") {
      value = Number.parseFloat(value) || 0
    }

    updatedItems[itemIndex].bonusItems[bonusIndex] = {
      ...updatedItems[itemIndex].bonusItems[bonusIndex],
      [field]: value,
    }

    // Recalculate total for this bonus item
    if (field === "quantity" || field === "rate" || field === "discount") {
      updatedItems[itemIndex].bonusItems[bonusIndex].total = calculateItemTotal(
        updatedItems[itemIndex].bonusItems[bonusIndex].quantity,
        updatedItems[itemIndex].bonusItems[bonusIndex].rate,
        updatedItems[itemIndex].bonusItems[bonusIndex].discount,
      )
    }

    setBillItems(updatedItems)
  }

  const calculateItemTotal = (quantity, rate, discount) => {
    return quantity * rate * (1 - discount / 100)
  }

  const calculateBillTotal = () => {
    const total = billItems.reduce((sum, item) => {
      if (!item.isBonus) {
        return sum + item.total
      }
      return sum
    }, 0)
    setBillTotal(total)
  }

  const addBillItem = () => {
    setBillItems([
      ...billItems,
      {
        id: Date.now(),
        _id: generateUniqueId(),
        productId: "",
        productName: "",
        quantity: 1,
        rate: 0,
        discount: 0,
        total: 0,
        isBonus: false,
        bonusItems: [],
      },
    ])
  }

  const removeBillItem = (index) => {
    const updatedItems = billItems.filter((_, i) => i !== index)
    setBillItems(updatedItems)
  }

  const addBonusItem = (index) => {
    const updatedItems = [...billItems]
    if (!updatedItems[index].bonusItems) {
      updatedItems[index].bonusItems = []
    }

    updatedItems[index].bonusItems.push({
      id: Date.now(),
      _id: generateUniqueId(),
      productId: "",
      productName: "",
      quantity: 1,
      rate: 0,
      discount: 0,
      total: 0,
      isBonus: true,
    })

    setBillItems(updatedItems)
  }

  const removeBonusItem = (itemIndex, bonusIndex) => {
    const updatedItems = [...billItems]
    updatedItems[itemIndex].bonusItems = updatedItems[itemIndex].bonusItems.filter((_, i) => i !== bonusIndex)
    setBillItems(updatedItems)
  }

  const handleBonusProductSelect = async (itemIndex, bonusIndex, productId) => {
    const product = products.find((p) => p._id === productId)
    if (!product) return

    const updatedItems = [...billItems]
    updatedItems[itemIndex].bonusItems[bonusIndex] = {
      ...updatedItems[itemIndex].bonusItems[bonusIndex],
      productId,
      productName: product.productName,
      rate: product.productPrice,
      total: calculateItemTotal(
        updatedItems[itemIndex].bonusItems[bonusIndex].quantity,
        product.productPrice,
        updatedItems[itemIndex].bonusItems[bonusIndex].discount,
      ),
    }

    setBillItems(updatedItems)
  }

  const handleProductSearchChange = (index, value) => {
    const updatedTerms = [...productSearchTerms]
    updatedTerms[index] = value
    setProductSearchTerms(updatedTerms)
  }

  const filteredProducts = (searchTerm) => {
    if (!searchTerm) return products
    return products.filter((product) =>
      product.productName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const saveBill = async () => {
    if (!selectedClient) {
      toast.error("Please select a client")
      return
    }

    if (billItems.length === 0 || !billItems.some((item) => item.productId)) {
      toast.error("Please add at least one product to the bill")
      return
    }

    // Flatten the bill items and bonus items into a single array
    const allItems = []

    billItems.forEach((item) => {
      if (item.productId) {
        allItems.push({
          _id: item._id || generateUniqueId(),
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount,
          total: item.total,
          isBonus: false,
        })
      }

      if (item.bonusItems && item.bonusItems.length > 0) {
        item.bonusItems.forEach((bonusItem) => {
          if (bonusItem.productId) {
            allItems.push({
              _id: bonusItem._id || generateUniqueId(),
              productId: bonusItem.productId,
              productName: bonusItem.productName,
              quantity: bonusItem.quantity,
              rate: bonusItem.rate,
              discount: bonusItem.discount,
              total: bonusItem.total,
              isBonus: true,
            })
          }
        })
      }
    })

    // Ensure all items have an _id
    const itemsWithIds = allItems.map((item) => {
      if (!item._id) {
        return { ...item, _id: generateUniqueId() }
      }
      return item
    })

    const bill = {
      clientId: selectedClient._id,
      clientName: selectedClient.clientName,
      billDate: new Date(billDate),
      items: itemsWithIds,
      totalAmount: billTotal,
    }

    try {
      console.log("Saving bill:", JSON.stringify(bill))
      const savedBill = await window.api.addBill(bill)
      toast.success("Bill saved successfully")
      navigate(`/bill/${savedBill._id}`)
    } catch (error) {
      console.error("Error saving bill:", error)
      toast.error("Failed to save bill")
    }
  }

  const filteredClients = clientSearchTerm
    ? clients.filter(
        (client) =>
          client.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
          client.clientNumber.includes(clientSearchTerm),
      )
    : []

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Generate New Bill</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Client *</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search client by name or number..."
                className="w-full p-2 border border-gray-300 rounded-md"
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
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
            </div>
            {selectedClient && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="font-medium">{selectedClient.clientName}</div>
                <div className="text-sm">{selectedClient.clientNumber}</div>
                <div className="text-sm">{selectedClient.clientAddress}</div>
                <div className="text-sm">
                  {selectedClient.isFiler ? `Filer (NTN: ${selectedClient.ntnNumber})` : "Non-Filer"}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="billDate">
              Bill Date
            </label>
            <input
              type="date"
              id="billDate"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Bill Items</h2>

        {billItems.map((item, index) => (
          <div key={item.id} className="mb-6">
            <div className="grid grid-cols-12 gap-2 items-center mb-2">
              <div className="col-span-4">
                <label className="block text-gray-700 text-sm font-bold mb-1">Product</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search product by name..."
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={productSearchTerms[index] || ""}
                    onChange={(e) => handleProductSearchChange(index, e.target.value)}
                  />
                  {productSearchTerms[index] && filteredProducts(productSearchTerms[index]).length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredProducts(productSearchTerms[index]).map((product) => (
                        <div
                          key={product._id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            handleProductSelect(index, product._id)
                            handleProductSearchChange(index, "")
                          }}
                        >
                          <div className="font-medium">{product.productName}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-gray-700 text-sm font-bold mb-1">Quantity</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleInputChange(index, "quantity", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="1"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-700 text-sm font-bold mb-1">Rate</label>
                <input
                  type="number"
                  value={item.rate}
                  onChange={(e) => handleInputChange(index, "rate", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-gray-700 text-sm font-bold mb-1">Discount %</label>
                <input
                  type="number"
                  value={item.discount}
                  onChange={(e) => handleInputChange(index, "discount", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="0"
                  max="100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-700 text-sm font-bold mb-1">Total</label>
                <div className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md">
                  PKR {item.total.toFixed(2)}
                </div>
              </div>
              <div className="col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={() => removeBillItem(index)}
                  className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Bonus Items */}
            {item.bonusItems &&
              item.bonusItems.map((bonusItem, bonusIndex) => (
                <div
                  key={bonusItem.id}
                  className="grid grid-cols-12 gap-2 items-center mb-2 ml-8 pl-4 border-l-2 border-dashed border-gray-300"
                >
                  <div className="col-span-4">
                    <label className="block text-gray-700 text-sm font-bold mb-1">Bonus Product</label>
                    <select
                      value={bonusItem.productId}
                      onChange={(e) => handleBonusProductSelect(index, bonusIndex, e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Bonus Product</option>
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.productName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-700 text-sm font-bold mb-1">Quantity</label>
                    <input
                      type="number"
                      value={bonusItem.quantity}
                      onChange={(e) => handleBonusInputChange(index, bonusIndex, "quantity", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="1"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-700 text-sm font-bold mb-1">Rate</label>
                    <input
                      type="number"
                      value={bonusItem.rate}
                      onChange={(e) => handleBonusInputChange(index, bonusIndex, "rate", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-gray-700 text-sm font-bold mb-1">Discount %</label>
                    <input
                      type="number"
                      value={bonusItem.discount}
                      onChange={(e) => handleBonusInputChange(index, bonusIndex, "discount", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-700 text-sm font-bold mb-1">Total (Free)</label>
                    <div className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md">
                      PKR {bonusItem.total.toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeBonusItem(index, bonusIndex)}
                      className="p-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

            <div className="mt-2">
              <button
                type="button"
                onClick={() => addBonusItem(index)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Bonus Item
              </button>
            </div>
          </div>
        ))}

        <div className="flex justify-between items-center mt-4">
          <button
            type="button"
            onClick={addBillItem}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
          >
            Add More Items
          </button>

          <div className="text-xl font-bold">Total: PKR {billTotal.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveBill}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
        >
          Save Bill
        </button>
      </div>
    </div>
  )
}

export default BillGeneration
