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
  const [fieldOfficers, setFieldOfficers] = useState([])
  const [salesmen, setSalesmen] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedFieldOfficer, setSelectedFieldOfficer] = useState(null)
  const [selectedSalesman, setSelectedSalesman] = useState(null)
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [fieldOfficerSearchTerm, setFieldOfficerSearchTerm] = useState("")
  const [salesmanSearchTerm, setSalesmanSearchTerm] = useState("")
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
  const [productSearchTerms, setProductSearchTerms] = useState({})
  const [bonusProductSearchTerms, setBonusProductSearchTerms] = useState({})
  const [showProductDropdowns, setShowProductDropdowns] = useState({})
  const [showBonusProductDropdowns, setShowBonusProductDropdowns] = useState({})

  useEffect(() => {
    fetchClients()
    fetchProducts()
    fetchFieldOfficers()
    fetchSalesmen()
  }, [])

  useEffect(() => {
    calculateBillTotal()
  }, [billItems])

  useEffect(() => {
    // Initialize product search terms for each bill item
    const initialSearchTerms = {}
    billItems.forEach((item, index) => {
      initialSearchTerms[index] = ""
    })
    setProductSearchTerms(initialSearchTerms)
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

  const fetchFieldOfficers = async () => {
    try {
      const data = await window.api.getFieldOfficers()
      setFieldOfficers(data)
    } catch (error) {
      console.error("Error fetching field officers:", error)
      toast.error("Failed to load field officers")
    }
  }

  const fetchSalesmen = async () => {
    try {
      const data = await window.api.getSalesmen()
      setSalesmen(data)
    } catch (error) {
      console.error("Error fetching salesmen:", error)
      toast.error("Failed to load salesmen")
    }
  }

  const handleClientSelect = async (client) => {
    setSelectedClient(client)
    setClientSearchTerm("")
  }

  const handleFieldOfficerSelect = async (fieldOfficer) => {
    setSelectedFieldOfficer(fieldOfficer)
    setFieldOfficerSearchTerm("")
  }

  const handleSalesmanSelect = async (salesman) => {
    setSelectedSalesman(salesman)
    setSalesmanSearchTerm("")
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
      availableQuantity: product.hasInfiniteQuantity !== false ? Number.POSITIVE_INFINITY : product.quantity,
      hasInfiniteQuantity: product.hasInfiniteQuantity !== false,
    }
    setBillItems(updatedItems)

    // Clear the search term and hide dropdown after selection
    setProductSearchTerms((prev) => ({
      ...prev,
      [index]: "",
    }))
    setShowProductDropdowns((prev) => ({
      ...prev,
      [index]: false,
    }))
  }

  const handleInputChange = (index, field, value) => {
    const updatedItems = [...billItems]
    const item = updatedItems[index]

    if (field === "quantity" || field === "rate" || field === "discount") {
      value = Number.parseFloat(value) || 0
    }

    // Check if quantity exceeds available quantity
    if (field === "quantity" && !item.hasInfiniteQuantity && value > item.availableQuantity) {
      toast.error(`Only ${item.availableQuantity} units of ${item.productName} are available`)
      value = item.availableQuantity
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
    const bonusItem = updatedItems[itemIndex].bonusItems[bonusIndex]

    if (field === "quantity" || field === "rate" || field === "discount") {
      value = Number.parseFloat(value) || 0
    }

    // Check if quantity exceeds available quantity
    if (field === "quantity" && bonusItem.hasInfiniteQuantity === false && value > bonusItem.availableQuantity) {
      toast.error(`Only ${bonusItem.availableQuantity} units of ${bonusItem.productName} are available`)
      value = bonusItem.availableQuantity
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

    // Also update search terms to remove the deleted item's entry
    const updatedSearchTerms = { ...productSearchTerms }
    delete updatedSearchTerms[index]
    setProductSearchTerms(updatedSearchTerms)

    // Also update dropdown visibility
    const updatedDropdowns = { ...showProductDropdowns }
    delete updatedDropdowns[index]
    setShowProductDropdowns(updatedDropdowns)
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

    // Also update search terms to remove the deleted item's entry
    const key = `${itemIndex}_${bonusIndex}`
    const updatedSearchTerms = { ...bonusProductSearchTerms }
    delete updatedSearchTerms[key]
    setBonusProductSearchTerms(updatedSearchTerms)

    // Also update dropdown visibility
    const updatedDropdowns = { ...showBonusProductDropdowns }
    delete updatedDropdowns[key]
    setShowBonusProductDropdowns(updatedDropdowns)
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
      availableQuantity: product.hasInfiniteQuantity !== false ? Number.POSITIVE_INFINITY : product.quantity,
      hasInfiniteQuantity: product.hasInfiniteQuantity !== false,
      total: calculateItemTotal(
        updatedItems[itemIndex].bonusItems[bonusIndex].quantity,
        product.productPrice,
        updatedItems[itemIndex].bonusItems[bonusIndex].discount,
      ),
    }

    setBillItems(updatedItems)

    // Clear the search term and hide dropdown after selection
    const key = `${itemIndex}_${bonusIndex}`
    setBonusProductSearchTerms((prev) => ({
      ...prev,
      [key]: "",
    }))
    setShowBonusProductDropdowns((prev) => ({
      ...prev,
      [key]: false,
    }))
  }

  const handleProductSearchChange = (index, value) => {
    setProductSearchTerms((prev) => ({
      ...prev,
      [index]: value,
    }))

    // Show dropdown when typing
    if (value.trim() !== "") {
      setShowProductDropdowns((prev) => ({
        ...prev,
        [index]: true,
      }))
    }
  }

  const handleBonusProductSearchChange = (itemIndex, bonusIndex, value) => {
    const key = `${itemIndex}_${bonusIndex}`
    setBonusProductSearchTerms((prev) => ({
      ...prev,
      [key]: value,
    }))

    // Show dropdown when typing
    if (value.trim() !== "") {
      setShowBonusProductDropdowns((prev) => ({
        ...prev,
        [key]: true,
      }))
    }
  }

  const handleProductSearchFocus = (index) => {
    // Show dropdown on focus if there's a search term
    if (productSearchTerms[index]?.trim() !== "") {
      setShowProductDropdowns((prev) => ({
        ...prev,
        [index]: true,
      }))
    }
  }

  const handleBonusProductSearchFocus = (itemIndex, bonusIndex) => {
    const key = `${itemIndex}_${bonusIndex}`
    // Show dropdown on focus if there's a search term
    if (bonusProductSearchTerms[key]?.trim() !== "") {
      setShowBonusProductDropdowns((prev) => ({
        ...prev,
        [key]: true,
      }))
    }
  }

  const clearProductSelection = (index) => {
    // Clear the product selection
    const updatedItems = [...billItems]
    updatedItems[index] = {
      ...updatedItems[index],
      productId: "",
      productName: "",
      rate: 0,
      discount: 0,
      total: 0,
      availableQuantity: 0,
      hasInfiniteQuantity: true,
    }
    setBillItems(updatedItems)

    // Clear the search term
    setProductSearchTerms((prev) => ({
      ...prev,
      [index]: "",
    }))
  }

  const clearBonusProductSelection = (itemIndex, bonusIndex) => {
    // Clear the bonus product selection
    const updatedItems = [...billItems]
    updatedItems[itemIndex].bonusItems[bonusIndex] = {
      ...updatedItems[itemIndex].bonusItems[bonusIndex],
      productId: "",
      productName: "",
      rate: 0,
      discount: 0,
      total: 0,
      availableQuantity: 0,
      hasInfiniteQuantity: true,
    }
    setBillItems(updatedItems)

    // Clear the search term
    const key = `${itemIndex}_${bonusIndex}`
    setBonusProductSearchTerms((prev) => ({
      ...prev,
      [key]: "",
    }))
  }

  const filteredProducts = (searchTerm) => {
    if (!searchTerm) return products
    return products.filter((product) => product.productName.toLowerCase().includes(searchTerm.toLowerCase()))
  }

  const checkInventoryLevels = () => {
    // Create a map to track total quantities for each product
    const productQuantities = new Map()

    // Add regular items
    billItems.forEach((item) => {
      if (item.productId && !item.isBonus) {
        const currentQty = productQuantities.get(item.productId) || 0
        productQuantities.set(item.productId, currentQty + item.quantity)
      }

      // Add bonus items
      if (item.bonusItems) {
        item.bonusItems.forEach((bonusItem) => {
          if (bonusItem.productId) {
            const currentQty = productQuantities.get(bonusItem.productId) || 0
            productQuantities.set(bonusItem.productId, currentQty + bonusItem.quantity)
          }
        })
      }
    })

    // Check if any product exceeds available quantity
    let hasInsufficientInventory = false

    productQuantities.forEach((quantity, productId) => {
      const product = products.find((p) => p._id === productId)
      if (product && product.hasInfiniteQuantity === false && quantity > product.quantity) {
        toast.error(
          `Insufficient inventory for ${product.productName}. Available: ${product.quantity}, Required: ${quantity}`,
        )
        hasInsufficientInventory = true
      }
    })

    return !hasInsufficientInventory
  }

  const saveBill = async () => {
    if (!selectedClient) {
      toast.error("Please select a client")
      return
    }

    if (!selectedFieldOfficer) {
      toast.error("Please select a field officer")
      return
    }

    if (!selectedSalesman) {
      toast.error("Please select a salesman")
      return
    }

    if (billItems.length === 0 || !billItems.some((item) => item.productId)) {
      toast.error("Please add at least one product to the bill")
      return
    }

    // Check inventory levels before proceeding
    if (!checkInventoryLevels()) {
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
      fieldOfficerId: selectedFieldOfficer._id,
      fieldOfficerName: selectedFieldOfficer.name,
      salesmanId: selectedSalesman._id,
      salesmanName: selectedSalesman.name,
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

  const filteredFieldOfficers = fieldOfficerSearchTerm
    ? fieldOfficers.filter(
        (officer) =>
          officer.name.toLowerCase().includes(fieldOfficerSearchTerm.toLowerCase()) ||
          officer.phoneNumber.includes(fieldOfficerSearchTerm),
      )
    : []

  const filteredSalesmen = salesmanSearchTerm
    ? salesmen.filter(
        (salesman) =>
          salesman.name.toLowerCase().includes(salesmanSearchTerm.toLowerCase()) ||
          salesman.phoneNumber.includes(salesmanSearchTerm),
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Field Officer *</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search field officer by name or number..."
                className="w-full p-2 border border-gray-300 rounded-md"
                value={fieldOfficerSearchTerm}
                onChange={(e) => setFieldOfficerSearchTerm(e.target.value)}
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
            </div>
            {selectedFieldOfficer && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="font-medium">{selectedFieldOfficer.name}</div>
                <div className="text-sm">{selectedFieldOfficer.phoneNumber}</div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Salesman *</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search salesman by name or number..."
                className="w-full p-2 border border-gray-300 rounded-md"
                value={salesmanSearchTerm}
                onChange={(e) => setSalesmanSearchTerm(e.target.value)}
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
            </div>
            {selectedSalesman && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="font-medium">{selectedSalesman.name}</div>
                <div className="text-sm">{selectedSalesman.phoneNumber}</div>
              </div>
            )}
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
                  <div className="flex">
                    <input
                      type="text"
                      placeholder="Search product by name..."
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={productSearchTerms[index] || ""}
                      onChange={(e) => handleProductSearchChange(index, e.target.value)}
                      onFocus={() => handleProductSearchFocus(index)}
                    />
                    {item.productId && (
                      <button
                        onClick={() => clearProductSelection(index)}
                        className="ml-2 p-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"
                        title="Clear selection"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {showProductDropdowns[index] &&
                    productSearchTerms[index] &&
                    filteredProducts(productSearchTerms[index]).length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredProducts(productSearchTerms[index]).map((product) => (
                          <div
                            key={product._id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleProductSelect(index, product._id)}
                          >
                            <div className="font-medium">{product.productName}</div>
                            <div className="text-sm text-gray-500">
                              PKR {product.productPrice.toFixed(2)}
                              {product.hasInfiniteQuantity === false && ` - ${product.quantity} in stock`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {item.productId && (
                    <div className="mt-1 p-2 bg-gray-50 rounded-md">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-gray-500">
                        PKR {item.rate.toFixed(2)}
                        {item.hasInfiniteQuantity === false && ` - ${item.availableQuantity} available`}
                      </div>
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
                {item.productId && item.hasInfiniteQuantity === false && (
                  <div className="text-xs text-gray-500 mt-1">Available: {item.availableQuantity}</div>
                )}
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
              item.bonusItems.map((bonusItem, bonusIndex) => {
                const bonusKey = `${index}_${bonusIndex}`
                return (
                  <div
                    key={bonusItem.id}
                    className="grid grid-cols-12 gap-2 items-center mb-2 ml-8 pl-4 border-l-2 border-dashed border-gray-300"
                  >
                    <div className="col-span-4">
                      <label className="block text-gray-700 text-sm font-bold mb-1">Bonus Product</label>
                      <div className="relative">
                        <div className="flex">
                          <input
                            type="text"
                            placeholder="Search bonus product..."
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={bonusProductSearchTerms[bonusKey] || ""}
                            onChange={(e) => handleBonusProductSearchChange(index, bonusIndex, e.target.value)}
                            onFocus={() => handleBonusProductSearchFocus(index, bonusIndex)}
                          />
                          {bonusItem.productId && (
                            <button
                              onClick={() => clearBonusProductSelection(index, bonusIndex)}
                              className="ml-2 p-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"
                              title="Clear selection"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          )}
                        </div>

                        {showBonusProductDropdowns[bonusKey] &&
                          bonusProductSearchTerms[bonusKey] &&
                          filteredProducts(bonusProductSearchTerms[bonusKey]).length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                              {filteredProducts(bonusProductSearchTerms[bonusKey]).map((product) => (
                                <div
                                  key={product._id}
                                  className="p-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => handleBonusProductSelect(index, bonusIndex, product._id)}
                                >
                                  <div className="font-medium">{product.productName}</div>
                                  <div className="text-sm text-gray-500">
                                    PKR {product.productPrice.toFixed(2)}
                                    {product.hasInfiniteQuantity === false && ` - ${product.quantity} in stock`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                        {bonusItem.productId && (
                          <div className="mt-1 p-2 bg-gray-50 rounded-md">
                            <div className="font-medium">{bonusItem.productName}</div>
                            <div className="text-sm text-gray-500">
                              PKR {bonusItem.rate.toFixed(2)}
                              {bonusItem.hasInfiniteQuantity === false && ` - ${bonusItem.availableQuantity} available`}
                            </div>
                          </div>
                        )}
                      </div>
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
                      {bonusItem.productId && bonusItem.hasInfiniteQuantity === false && (
                        <div className="text-xs text-gray-500 mt-1">Available: {bonusItem.availableQuantity}</div>
                      )}
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
                        disabled={true}
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
                        disabled={true}
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
                )
              })}

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
