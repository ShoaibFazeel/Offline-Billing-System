"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
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
  const [showDiscountAsAmount, setShowDiscountAsAmount] = useState(false)

  // Add refs for search inputs
  const clientSearchRef = useRef(null)
  const fieldOfficerSearchRef = useRef(null)
  const salesmanSearchRef = useRef(null)
  const productSearchRefs = useRef({})
  // First, add refs for the product dropdowns
  // Add these after the existing refs:
  const productDropdownRefs = useRef({})

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
      total: calculateItemTotal(
        updatedItems[index].quantity,
        product.productPrice,
        updatedItems[index].discount,
        updatedItems[index].extraDiscount,
      ),
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

    if (field === "quantity" || field === "rate" || field === "discount" || field === "extraDiscount") {
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
    if (field === "quantity" || field === "rate" || field === "discount" || field === "extraDiscount") {
      updatedItems[index].total = calculateItemTotal(
        updatedItems[index].quantity,
        updatedItems[index].rate,
        updatedItems[index].discount,
        updatedItems[index].extraDiscount,
      )
    }

    const totalAmount = calculateBillTotal(updatedItems)

    setEditedBill({
      ...editedBill,
      items: updatedItems,
      totalAmount,
    })
  }

  // Update the calculateItemTotal function to handle extraDiscount as percentage
  const calculateItemTotal = (quantity, rate, discount, extraDiscount = 0) => {
    // First apply percentage discount
    const afterDiscount = quantity * rate * (1 - discount / 100)
    // Then apply extra discount (as percentage)
    const finalTotal = afterDiscount * (1 - extraDiscount / 100)
    // Round to 2 decimal places to avoid floating point precision issues
    return Math.round(finalTotal * 100) / 100
  }

  const calculateBillTotal = (items) => {
    const total = items.reduce((sum, item) => {
      if (!item.isBonus) {
        return sum + (item.total || 0)
      }
      return sum
    }, 0)
    // Round to 2 decimal places to avoid floating point precision issues
    return Math.round(total * 100) / 100
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
        extraDiscount: 0,
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

  // Helper function to generate PDF bytes
  const generatePdfBytes = async () => {
    // Fetch required data
    const client = await window.api.getClient(bill.clientId)
    const fieldOfficer = await window.api.getFieldOfficer(bill.fieldOfficerId)
    const salesman = await window.api.getSalesman(bill.salesmanId)
    const companyInfo = await window.api.getCompanyInfo()

    // Pass showDiscountAsAmount and products to PdfGenerator
    const pdfGenerator = new PdfGenerator()
    return await pdfGenerator.generateInvoicePdf(bill, client, companyInfo, fieldOfficer, salesman, showDiscountAsAmount, products)
  }

  // Download PDF
  const generatePDF = async () => {
    try {
      const pdfBytes = await generatePdfBytes()

      // Create a blob and download
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `Invoice-${bill.billId ? bill.billId : bill._id.substring(0, 8)}.pdf`
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

  // Print PDF (Open in System Viewer)
  const printPDF = async () => {
    try {
      const pdfBytes = await generatePdfBytes()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })

      const base64String = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(blob)
      })

      if (window.api && window.api.openPdf) {
        await window.api.openPdf(base64String)
        toast.success("Opening PDF...")
      } else {
        const blobUrl = URL.createObjectURL(blob)
        const printWindow = window.open(blobUrl)
        printWindow.onload = () => {
          printWindow.focus()
          printWindow.print()
        }
        toast.success("Print dialog opened")
      }
    } catch (error) {
      console.error("Error printing PDF:", error)
      toast.error("Failed to print PDF")
    }
  }

  const deleteBill = async () => {
    if (!window.confirm("Are you sure you want to delete this bill? This action cannot be undone and will restore product quantities.")) {
      return
    }

    try {
      await window.api.deleteBill(bill._id)
      toast.success("Bill deleted successfully")
      // Navigate back to bills list
      const sourcePage = localStorage.getItem("billSourcePage") || "bills"
      localStorage.removeItem("billSourcePage")

      if (sourcePage === "dashboard") {
        window.location.hash = "#/"
      } else if (sourcePage === "reports") {
        window.location.hash = "#/reports"
      } else {
        window.location.hash = "#/bills"
      }
    } catch (error) {
      console.error("Error deleting bill:", error)
      toast.error("Failed to delete bill")
    }
  }

  // Add keyboard navigation for search dropdowns
  const [selectedClientIndex, setSelectedClientIndex] = useState(-1)
  const [selectedFieldOfficerIndex, setSelectedFieldOfficerIndex] = useState(-1)
  const [selectedSalesmanIndex, setSelectedSalesmanIndex] = useState(-1)
  const [selectedProductIndex, setSelectedProductIndex] = useState({})

  const handleClientKeyDown = (e) => {
    if (!clientSearchTerm || filteredClients.length === 0) return

    // Arrow down
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedClientIndex((prev) => (prev < filteredClients.length - 1 ? prev + 1 : prev))
    }
    // Arrow up
    else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedClientIndex((prev) => (prev > 0 ? prev - 1 : 0))
    }
    // Enter
    else if (e.key === "Enter" && selectedClientIndex >= 0) {
      e.preventDefault()
      handleClientSelect(filteredClients[selectedClientIndex])
    }
  }

  const handleFieldOfficerKeyDown = (e) => {
    if (!fieldOfficerSearchTerm || filteredFieldOfficers.length === 0) return

    // Arrow down
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedFieldOfficerIndex((prev) => (prev < filteredFieldOfficers.length - 1 ? prev + 1 : prev))
    }
    // Arrow up
    else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedFieldOfficerIndex((prev) => (prev > 0 ? prev - 1 : 0))
    }
    // Enter
    else if (e.key === "Enter" && selectedFieldOfficerIndex >= 0) {
      e.preventDefault()
      handleFieldOfficerSelect(filteredFieldOfficers[selectedFieldOfficerIndex])
    }
  }

  const handleSalesmanKeyDown = (e) => {
    if (!salesmanSearchTerm || filteredSalesmen.length === 0) return

    // Arrow down
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedSalesmanIndex((prev) => (prev < filteredSalesmen.length - 1 ? prev + 1 : prev))
    }
    // Arrow up
    else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedSalesmanIndex((prev) => (prev > 0 ? prev - 1 : 0))
    }
    // Enter
    else if (e.key === "Enter" && selectedSalesmanIndex >= 0) {
      e.preventDefault()
      handleSalesmanSelect(filteredSalesmen[selectedSalesmanIndex])
    }
  }

  // Replace the handleProductKeyDown function with this improved version:
  const handleProductKeyDown = (e, index) => {
    const filtered = getFilteredProducts(index)
    if (!productSearchTerms[index] || filtered.length === 0) return

    // Arrow down
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedProductIndex((prev) => {
        const currentIndex = prev[index] !== undefined ? prev[index] : -1
        return {
          ...prev,
          [index]: Math.min(currentIndex + 1, filtered.length - 1),
        }
      })
    }
    // Arrow up
    else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedProductIndex((prev) => {
        const currentIndex = prev[index] !== undefined ? prev[index] : 0
        return {
          ...prev,
          [index]: Math.max(currentIndex - 1, 0),
        }
      })
    }
    // Enter
    else if (e.key === "Enter") {
      e.preventDefault()
      const currentIndex = selectedProductIndex[index]
      if (currentIndex !== undefined && currentIndex >= 0 && currentIndex < filtered.length) {
        handleProductSelect(index, filtered[currentIndex])
      } else if (filtered.length > 0) {
        // If no item is selected but there are items in the dropdown, select the first one
        handleProductSelect(index, filtered[0])
      }
    }
    // Escape
    else if (e.key === "Escape") {
      e.preventDefault()
      setProductSearchTerms((prev) => ({
        ...prev,
        [index]: "",
      }))
    }
  }

  // Add this useEffect after the existing useEffects:
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle client dropdown
      if (
        clientSearchRef.current &&
        !clientSearchRef.current.contains(event.target) &&
        !event.target.closest(".client-dropdown-item")
      ) {
        setClientSearchTerm("")
      }

      // Handle field officer dropdown
      if (
        fieldOfficerSearchRef.current &&
        !fieldOfficerSearchRef.current.contains(event.target) &&
        !event.target.closest(".field-officer-dropdown-item")
      ) {
        setFieldOfficerSearchTerm("")
      }

      // Handle salesman dropdown
      if (
        salesmanSearchRef.current &&
        !salesmanSearchRef.current.contains(event.target) &&
        !event.target.closest(".salesman-dropdown-item")
      ) {
        setSalesmanSearchTerm("")
      }

      // Handle product dropdowns
      Object.keys(productSearchRefs.current).forEach((index) => {
        const searchRef = productSearchRefs.current[index]
        const dropdownRef = productDropdownRefs.current[index]

        if (searchRef && !searchRef.contains(event.target) && (!dropdownRef || !dropdownRef.contains(event.target))) {
          setProductSearchTerms((prev) => ({
            ...prev,
            [index]: "",
          }))
        }
      })
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Add scroll-into-view effects for keyboard navigation
  useEffect(() => {
    if (selectedClientIndex >= 0 && clientSearchRef.current) {
      const dropdownContainer = clientSearchRef.current.parentElement?.querySelector('.client-dropdown-container')
      const selectedElement = dropdownContainer?.children[selectedClientIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedClientIndex])

  useEffect(() => {
    if (selectedFieldOfficerIndex >= 0 && fieldOfficerSearchRef.current) {
      const dropdownContainer = fieldOfficerSearchRef.current.parentElement?.querySelector('.field-officer-dropdown-container')
      const selectedElement = dropdownContainer?.children[selectedFieldOfficerIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedFieldOfficerIndex])

  useEffect(() => {
    if (selectedSalesmanIndex >= 0 && salesmanSearchRef.current) {
      const dropdownContainer = salesmanSearchRef.current.parentElement?.querySelector('.salesman-dropdown-container')
      const selectedElement = dropdownContainer?.children[selectedSalesmanIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedSalesmanIndex])

  useEffect(() => {
    Object.keys(selectedProductIndex).forEach((index) => {
      const currentIndex = selectedProductIndex[index]
      if (currentIndex >= 0 && productSearchRefs.current[index]) {
        const dropdownContainer = productSearchRefs.current[index].parentElement?.querySelector('.product-dropdown-container')
        const selectedElement = dropdownContainer?.children[currentIndex]
        if (selectedElement) {
          selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
      }
    })
  }, [selectedProductIndex])

  // Add this useEffect to initialize the selected product index when search terms change
  // Add this after the other useEffect hooks:

  // Add this useEffect to initialize the selected product index when search terms change
  useEffect(() => {
    // When a product search term is added, initialize its selected index to 0 (first item)
    Object.keys(productSearchTerms).forEach((index) => {
      if (productSearchTerms[index] && getFilteredProducts(Number(index)).length > 0) {
        if (selectedProductIndex[index] === undefined) {
          setSelectedProductIndex((prev) => ({
            ...prev,
            [index]: 0,
          }))
        }
      }
    })
  }, [productSearchTerms])

  // Auto-focus when editing starts
  useEffect(() => {
    if (isEditing && clientSearchRef.current) {
      clientSearchRef.current.focus()
    }
  }, [isEditing])

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>
  }

  if (!bill) {
    return <div className="text-center py-10">Bill not found</div>
  }

  // Helper function to calculate extra discount amount
  const calculateExtraDiscountAmount = (item) => {
    // First calculate the amount after regular discount
    const afterRegularDiscount = item.quantity * item.rate * (1 - item.discount / 100)
    // Then calculate the extra discount amount
    return afterRegularDiscount * (item.extraDiscount / 100)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={(e) => {
              e.preventDefault()
              // Get the source page from localStorage, default to bills if not set
              const sourcePage = localStorage.getItem("billSourcePage") || "bills"
              // Clear the source page from localStorage
              localStorage.removeItem("billSourcePage")

              // Navigate to the appropriate page
              if (sourcePage === "dashboard") {
                window.location.hash = "#/"
              } else if (sourcePage === "reports") {
                window.location.hash = "#/reports"
              } else {
                // Default to bills
                window.location.hash = "#/bills"
              }
            }}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded-md mr-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <h1 className="text-3xl font-bold">Bill #{bill.billId ? bill.billId : bill._id}</h1>
        </div>
        <div className="flex space-x-2 items-center">
          {!isEditing && (
            <div className="flex items-center mr-4">
              <span className="mr-2">Show discount as:</span>
              <button
                onClick={() => setShowDiscountAsAmount(!showDiscountAsAmount)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-md"
              >
                {showDiscountAsAmount ? "Amount" : "Percentage"}
              </button>
            </div>
          )}
          {/* <div className="flex items-center mr-4">
            <span className="mr-2">Show discount as:</span>
            <button
              onClick={() => setShowDiscountAsAmount(!showDiscountAsAmount)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-md"
            >
              {showDiscountAsAmount ? "Amount" : "Percentage"}
            </button>
          </div> */}
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
                Download PDF
              </button>
              <button
                onClick={printPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Print PDF
              </button>
              <button
                onClick={deleteBill}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              >
                Delete Bill
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Party Information</h2>
            {isEditing ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search client by name or number..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={clientSearchTerm}
                  onChange={handleClientSearch}
                  onKeyDown={handleClientKeyDown}
                  ref={clientSearchRef}
                />
                {clientSearchTerm && filteredClients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto client-dropdown-container">
                    {filteredClients.map((client, index) => (
                      <div
                        key={client._id}
                        className={`p-2 hover:bg-gray-100 cursor-pointer client-dropdown-item ${index === selectedClientIndex ? "bg-blue-100" : ""
                          }`}
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
                  new Date(bill.billDate).toLocaleDateString("en-GB")
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
                  onKeyDown={handleFieldOfficerKeyDown}
                  ref={fieldOfficerSearchRef}
                />
                {fieldOfficerSearchTerm && filteredFieldOfficers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto field-officer-dropdown-container">
                    {filteredFieldOfficers.map((officer, index) => (
                      <div
                        key={officer._id}
                        className={`p-2 hover:bg-gray-100 cursor-pointer field-officer-dropdown-item ${index === selectedFieldOfficerIndex ? "bg-blue-100" : ""
                          }`}
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
                  onKeyDown={handleSalesmanKeyDown}
                  ref={salesmanSearchRef}
                />
                {salesmanSearchTerm && filteredSalesmen.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto salesman-dropdown-container">
                    {filteredSalesmen.map((salesman, index) => (
                      <div
                        key={salesman._id}
                        className={`p-2 hover:bg-gray-100 cursor-pointer salesman-dropdown-item ${index === selectedSalesmanIndex ? "bg-blue-100" : ""
                          }`}
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
                  S#
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {showDiscountAsAmount ? "Discount Amt" : "Discount %"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {showDiscountAsAmount ? "Extra Disc Amt" : "Extra Disc %"}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search product..."
                          className="w-full p-2 text-base border border-gray-300 rounded-md"
                          value={productSearchTerms[index] || ""}
                          onChange={(e) => handleProductSearch(index, e.target.value)}
                          onKeyDown={(e) => handleProductKeyDown(e, index)}
                          ref={(el) => (productSearchRefs.current[index] = el)}
                        />
                        {productSearchTerms[index] && getFilteredProducts(index).length > 0 && (
                          <div
                            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-auto product-dropdown-container"
                            ref={(el) => (productDropdownRefs.current[index] = el)}
                          >
                            {getFilteredProducts(index).map((product, productIndex) => (
                              <div
                                key={product._id}
                                className={`p-2 hover:bg-gray-100 cursor-pointer ${selectedProductIndex[index] === productIndex ? "bg-blue-100" : ""
                                  }`}
                                onClick={() => handleProductSelect(index, product)}
                              >
                                <div className="font-medium">{product.productName}</div>
                                {(product.companyName || product.containerSize) && (
                                  <div className="text-xs text-gray-600 mt-0.5">
                                    {product.companyName && <span>{product.companyName}</span>}
                                    {product.companyName && product.containerSize && <span> - </span>}
                                    {product.containerSize && <span>{product.containerSize}</span>}
                                  </div>
                                )}
                                <div className="text-sm text-gray-500 mt-0.5">
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
                    ) : showDiscountAsAmount ? (
                      `PKR ${((item.rate * item.quantity * item.discount) / 100).toFixed(2)}`
                    ) : (
                      `${item.discount}%`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditing ? (
                      <input
                        type="number"
                        value={item.extraDiscount || 0}
                        onChange={(e) => handleItemChange(index, "extraDiscount", e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded-md"
                        min="0"
                        max="100"
                      />
                    ) : showDiscountAsAmount ? (
                      `PKR ${calculateExtraDiscountAmount(item).toFixed(2)}`
                    ) : (
                      `${item.extraDiscount || 0}%`
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
                        className={`mr-2 px-2 py-1 rounded-md ${item.isBonus ? "bg-gray-200 hover:bg-gray-300" : "bg-green-100 hover:bg-green-200"
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
