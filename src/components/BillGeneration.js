"use client"

import { useState, useEffect, useRef } from "react"
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

  // Current item being edited
  const [currentItem, setCurrentItem] = useState({
    id: Date.now(),
    _id: generateUniqueId(),
    productId: "",
    productName: "",
    companyName: "",
    containerSize: "",
    quantity: 1,
    rate: 0,
    discount: 0,
    extraDiscount: 0,
    total: 0,
    isBonus: false,
    bonusItems: [],
  })

  // List of added items
  const [billItems, setBillItems] = useState([])

  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0])
  const [billTotal, setBillTotal] = useState(0)
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [bonusProductSearchTerms, setBonusProductSearchTerms] = useState({})
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [showBonusProductDropdowns, setShowBonusProductDropdowns] = useState({})
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1)
  const [selectedBonusProductIndex, setSelectedBonusProductIndex] = useState({})

  // Refs for auto-focus
  const clientSearchRef = useRef(null)
  const fieldOfficerSearchRef = useRef(null)
  const salesmanSearchRef = useRef(null)
  const productSearchRef = useRef(null)
  const bonusProductSearchRefs = useRef({})

  // Refs for dropdown containers
  const clientDropdownRef = useRef(null)
  const fieldOfficerDropdownRef = useRef(null)
  const salesmanDropdownRef = useRef(null)
  const productDropdownRef = useRef(null)
  const bonusProductDropdownRefs = useRef({})

  useEffect(() => {
    fetchClients()
    fetchProducts()
    fetchFieldOfficers()
    fetchSalesmen()

    // Auto-focus client search on component mount
    if (clientSearchRef.current) {
      clientSearchRef.current.focus()
    }
  }, [])

  useEffect(() => {
    calculateBillTotal()
  }, [billItems])

  // Add click outside listener to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Client dropdown
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(event.target) &&
        clientSearchRef.current &&
        !clientSearchRef.current.contains(event.target)
      ) {
        setClientSearchTerm("")
      }

      // Field officer dropdown
      if (
        fieldOfficerDropdownRef.current &&
        !fieldOfficerDropdownRef.current.contains(event.target) &&
        fieldOfficerSearchRef.current &&
        !fieldOfficerSearchRef.current.contains(event.target)
      ) {
        setFieldOfficerSearchTerm("")
      }

      // Salesman dropdown
      if (
        salesmanDropdownRef.current &&
        !salesmanDropdownRef.current.contains(event.target) &&
        salesmanSearchRef.current &&
        !salesmanSearchRef.current.contains(event.target)
      ) {
        setSalesmanSearchTerm("")
      }

      // Product dropdown
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target) &&
        productSearchRef.current &&
        !productSearchRef.current.contains(event.target)
      ) {
        setShowProductDropdown(false)
      }

      // Bonus product dropdowns
      Object.keys(bonusProductDropdownRefs.current).forEach((key) => {
        const dropdownRef = bonusProductDropdownRefs.current[key]
        const inputRef = bonusProductSearchRefs.current[key]
        if (dropdownRef && !dropdownRef.contains(event.target) && inputRef && !inputRef.contains(event.target)) {
          setShowBonusProductDropdowns((prev) => ({
            ...prev,
            [key]: false,
          }))
        }
      })
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Add keyboard shortcut for adding items
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) to add item
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (currentItem.productId) {
          e.preventDefault()
          addCurrentItemToBill()
        }
      }

      // Check for Cmd+B (Mac) or Ctrl+B (Windows/Linux) to add bonus item
      else if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault()
        if (currentItem.productId) {
          addBonusItem()
        } else {
          toast.error("Please select a product first before adding a bonus item")
        }
      }

      // Check for Cmd+S (Mac) or Ctrl+S (Windows/Linux) to save bill
      else if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault()
        saveBill()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [currentItem, billItems])

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

  const handleProductSelect = async (productId) => {
    const product = products.find((p) => p._id === productId)
    if (!product) return

    // Check if there's a client-specific price for this product
    let rate = product.productPrice
    let discount = 0
    let extraDiscount = 0

    if (selectedClient) {
      try {
        const clientProduct = await window.api.getClientProduct(selectedClient._id, productId)
        if (clientProduct) {
          rate = clientProduct.rate
          discount = clientProduct.discount
          extraDiscount = clientProduct.extraDiscount || 0
        }
      } catch (error) {
        console.error("Error fetching client-product history:", error)
      }
    }

    setCurrentItem({
      ...currentItem,
      productId,
      productName: product.productName,
      companyName: product.companyName || "",
      containerSize: product.containerSize || "",
      rate,
      discount,
      extraDiscount,
      total: calculateItemTotal(currentItem.quantity, rate, discount, extraDiscount),
      availableQuantity: product.hasInfiniteQuantity !== false ? Number.POSITIVE_INFINITY : product.quantity,
      hasInfiniteQuantity: product.hasInfiniteQuantity !== false,
    })

    // Clear the search term and hide dropdown after selection
    setProductSearchTerm("")
    setShowProductDropdown(false)

    // Focus on quantity input after selecting a product
    setTimeout(() => {
      const quantityInput = document.getElementById("item-quantity")
      if (quantityInput) {
        quantityInput.focus()
        quantityInput.select()
      }
    }, 100)
  }

  const handleInputChange = (field, value) => {
    if (field === "quantity" || field === "rate" || field === "discount" || field === "extraDiscount") {
      value = Number.parseFloat(value) || 0
    }

    // Check if quantity exceeds available quantity
    if (field === "quantity" && !currentItem.hasInfiniteQuantity && value > currentItem.availableQuantity) {
      toast.error(`Only ${currentItem.availableQuantity} units of ${currentItem.productName} are available`)
      value = currentItem.availableQuantity
    }

    const updatedItem = {
      ...currentItem,
      [field]: value,
    }

    // Recalculate total for this item
    if (field === "quantity" || field === "rate" || field === "discount" || field === "extraDiscount") {
      updatedItem.total = calculateItemTotal(
        updatedItem.quantity,
        updatedItem.rate,
        updatedItem.discount,
        updatedItem.extraDiscount,
      )
    }

    setCurrentItem(updatedItem)
  }

  const handleBonusInputChange = (bonusIndex, field, value) => {
    const updatedBonusItems = [...currentItem.bonusItems]
    const bonusItem = updatedBonusItems[bonusIndex]

    if (field === "quantity" || field === "rate" || field === "discount") {
      value = Number.parseFloat(value) || 0
    }

    // Check if quantity exceeds available quantity
    if (field === "quantity" && bonusItem.hasInfiniteQuantity === false && value > bonusItem.availableQuantity) {
      toast.error(`Only ${bonusItem.availableQuantity} units of ${bonusItem.productName} are available`)
      value = bonusItem.availableQuantity
    }

    updatedBonusItems[bonusIndex] = {
      ...updatedBonusItems[bonusIndex],
      [field]: value,
    }

    // Recalculate total for this bonus item
    if (field === "quantity" || field === "rate" || field === "discount") {
      updatedBonusItems[bonusIndex].total = calculateItemTotal(
        updatedBonusItems[bonusIndex].quantity,
        updatedBonusItems[bonusIndex].rate,
        updatedBonusItems[bonusIndex].discount,
      )
    }

    setCurrentItem({
      ...currentItem,
      bonusItems: updatedBonusItems,
    })
  }

  // Update the calculateItemTotal function to handle extraDiscount as percentage applied sequentially
  const calculateItemTotal = (quantity, rate, discount, extraDiscount = 0) => {
    // First apply percentage discount
    const afterDiscount = quantity * rate * (1 - discount / 100)
    // Then apply extra discount (as percentage) on the result
    return afterDiscount * (1 - extraDiscount / 100)
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

  const addCurrentItemToBill = () => {
    if (!currentItem.productId) {
      toast.error("Please select a product first")
      return
    }

    // Add the current item to the bill items list
    setBillItems([...billItems, { ...currentItem }])

    // Reset the current item
    setCurrentItem({
      id: Date.now(),
      _id: generateUniqueId(),
      productId: "",
      productName: "",
      companyName: "",
      containerSize: "",
      quantity: 1,
      rate: 0,
      discount: 0,
      extraDiscount: 0,
      total: 0,
      isBonus: false,
      bonusItems: [],
    })

    // Focus back on product search
    setTimeout(() => {
      if (productSearchRef.current) {
        productSearchRef.current.focus()
      }
    }, 100)
  }

  const removeItemFromBill = (index) => {
    const updatedItems = billItems.filter((_, i) => i !== index)
    setBillItems(updatedItems)
  }

  const editItemFromBill = (index) => {
    // Set the current item to the selected item from the list
    setCurrentItem({ ...billItems[index] })

    // Remove the item from the list
    removeItemFromBill(index)

    // Focus on product search
    setTimeout(() => {
      if (productSearchRef.current) {
        productSearchRef.current.focus()
      }
    }, 100)
  }

  const addBonusItem = () => {
    const updatedBonusItems = [
      ...currentItem.bonusItems,
      {
        id: Date.now(),
        _id: generateUniqueId(),
        productId: "",
        productName: "",
        companyName: "",
        containerSize: "",
        quantity: 1,
        rate: 0,
        discount: 0,
        total: 0,
        isBonus: true,
      },
    ]

    setCurrentItem({
      ...currentItem,
      bonusItems: updatedBonusItems,
    })

    // Focus on the new bonus item's product search
    setTimeout(() => {
      const bonusKey = currentItem.bonusItems.length
      if (bonusProductSearchRefs.current[bonusKey]) {
        bonusProductSearchRefs.current[bonusKey].focus()
      }
    }, 100)
  }

  const removeBonusItem = (bonusIndex) => {
    const updatedBonusItems = currentItem.bonusItems.filter((_, i) => i !== bonusIndex)

    setCurrentItem({
      ...currentItem,
      bonusItems: updatedBonusItems,
    })

    // Also update search terms to remove the deleted item's entry
    const key = `${bonusIndex}`
    const updatedSearchTerms = { ...bonusProductSearchTerms }
    delete updatedSearchTerms[key]
    setBonusProductSearchTerms(updatedSearchTerms)

    // Also update dropdown visibility
    const updatedDropdowns = { ...showBonusProductDropdowns }
    delete updatedDropdowns[key]
    setShowBonusProductDropdowns(updatedDropdowns)
  }

  const handleBonusProductSelect = async (bonusIndex, productId) => {
    const product = products.find((p) => p._id === productId)
    if (!product) return

    const updatedBonusItems = [...currentItem.bonusItems]
    updatedBonusItems[bonusIndex] = {
      ...updatedBonusItems[bonusIndex],
      productId,
      productName: product.productName,
      companyName: product.companyName || "",
      containerSize: product.containerSize || "",
      rate: product.productPrice,
      availableQuantity: product.hasInfiniteQuantity !== false ? Number.POSITIVE_INFINITY : product.quantity,
      hasInfiniteQuantity: product.hasInfiniteQuantity !== false,
      total: calculateItemTotal(
        updatedBonusItems[bonusIndex].quantity,
        product.productPrice,
        updatedBonusItems[bonusIndex].discount,
      ),
    }

    setCurrentItem({
      ...currentItem,
      bonusItems: updatedBonusItems,
    })

    // Clear the search term and hide dropdown after selection
    const key = `${bonusIndex}`
    setBonusProductSearchTerms((prev) => ({
      ...prev,
      [key]: "",
    }))
    setShowBonusProductDropdowns((prev) => ({
      ...prev,
      [key]: false,
    }))

    // Focus on quantity input after selecting a product
    setTimeout(() => {
      const quantityInput = document.getElementById(`bonus-quantity-${bonusIndex}`)
      if (quantityInput) {
        quantityInput.focus()
        quantityInput.select()
      }
    }, 100)
  }

  const handleProductSearchChange = (value) => {
    setProductSearchTerm(value)

    // Show dropdown when typing
    if (value.trim() !== "") {
      setShowProductDropdown(true)
      setSelectedProductIndex(-1)
    }
  }

  const handleBonusProductSearchChange = (bonusIndex, value) => {
    const key = `${bonusIndex}`
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
      setSelectedBonusProductIndex((prev) => ({
        ...prev,
        [key]: -1,
      }))
    }
  }

  const handleProductSearchFocus = () => {
    // Show dropdown on focus if there's a search term
    if (productSearchTerm?.trim() !== "") {
      setShowProductDropdown(true)
    }
  }

  const handleBonusProductSearchFocus = (bonusIndex) => {
    const key = `${bonusIndex}`
    // Show dropdown on focus if there's a search term
    if (bonusProductSearchTerms[key]?.trim() !== "") {
      setShowBonusProductDropdowns((prev) => ({
        ...prev,
        [key]: true,
      }))
    }
  }

  const clearProductSelection = () => {
    // Clear the product selection
    setCurrentItem({
      ...currentItem,
      productId: "",
      productName: "",
      companyName: "",
      containerSize: "",
      rate: 0,
      discount: 0,
      extraDiscount: 0,
      total: 0,
      availableQuantity: 0,
      hasInfiniteQuantity: true,
    })

    // Clear the search term
    setProductSearchTerm("")
  }

  const clearBonusProductSelection = (bonusIndex) => {
    // Clear the bonus product selection
    const updatedBonusItems = [...currentItem.bonusItems]
    updatedBonusItems[bonusIndex] = {
      ...updatedBonusItems[bonusIndex],
      productId: "",
      productName: "",
      companyName: "",
      containerSize: "",
      rate: 0,
      discount: 0,
      total: 0,
      availableQuantity: 0,
      hasInfiniteQuantity: true,
    }

    setCurrentItem({
      ...currentItem,
      bonusItems: updatedBonusItems,
    })

    // Clear the search term
    const key = `${bonusIndex}`
    setBonusProductSearchTerms((prev) => ({
      ...prev,
      [key]: "",
    }))
  }

  const filteredProducts = (searchTerm) => {
    if (!searchTerm) return products
    return products.filter((product) => product.productName.toLowerCase().includes(searchTerm.toLowerCase()))
  }

  const handleProductKeyDown = (e) => {
    const filtered = filteredProducts(productSearchTerm || "")
    if (!showProductDropdown || filtered.length === 0) return

    // Arrow down
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedProductIndex(Math.min(selectedProductIndex + 1, filtered.length - 1))
    }
    // Arrow up
    else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedProductIndex(Math.max(selectedProductIndex - 1, 0))
    }
    // Enter
    else if (e.key === "Enter" && selectedProductIndex >= 0) {
      e.preventDefault()
      const selectedProduct = filtered[selectedProductIndex]
      if (selectedProduct) {
        handleProductSelect(selectedProduct._id)
      }
    }
    // Escape
    else if (e.key === "Escape") {
      setShowProductDropdown(false)
    }
  }

  const handleBonusProductKeyDown = (e, bonusIndex) => {
    const key = `${bonusIndex}`
    const filtered = filteredProducts(bonusProductSearchTerms[key] || "")
    if (!showBonusProductDropdowns[key] || filtered.length === 0) return

    // Arrow down
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedBonusProductIndex((prev) => ({
        ...prev,
        [key]: Math.min((prev[key] || -1) + 1, filtered.length - 1),
      }))
    }
    // Arrow up
    else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedBonusProductIndex((prev) => ({
        ...prev,
        [key]: Math.max((prev[key] || 0) - 1, 0),
      }))
    }
    // Enter
    else if (e.key === "Enter" && (selectedBonusProductIndex[key] || 0) >= 0) {
      e.preventDefault()
      const selectedProduct = filtered[selectedBonusProductIndex[key] || 0]
      if (selectedProduct) {
        handleBonusProductSelect(bonusIndex, selectedProduct._id)
      }
    }
    // Escape
    else if (e.key === "Escape") {
      setShowBonusProductDropdowns((prev) => ({
        ...prev,
        [key]: false,
      }))
    }
  }

  const handleClientKeyDown = (e) => {
    const filtered = clients.filter(
      (client) =>
        client.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        client.clientNumber.includes(clientSearchTerm),
    )

    if (filtered.length === 0) return

    // Arrow down
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedClientIndex((prev) => {
        const nextIndex = prev === -1 ? 0 : Math.min(prev + 1, filtered.length - 1)
        return nextIndex
      })
    }
    // Arrow up
    else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedClientIndex((prev) => {
        const prevIndex = prev === -1 ? 0 : Math.max(prev - 1, 0)
        return prevIndex
      })
    }
    // Enter
    else if (e.key === "Enter" && selectedClientIndex >= 0) {
      e.preventDefault()
      handleClientSelect(filtered[selectedClientIndex])
    }
    // Escape
    else if (e.key === "Escape") {
      e.preventDefault()
      setClientSearchTerm("")
    }
  }

  const [selectedClientIndex, setSelectedClientIndex] = useState(-1)
  const [selectedFieldOfficerIndex, setSelectedFieldOfficerIndex] = useState(-1)
  const [selectedSalesmanIndex, setSelectedSalesmanIndex] = useState(-1)

  const handleFieldOfficerKeyDown = (e) => {
    const filtered = fieldOfficers.filter(
      (officer) =>
        officer.name.toLowerCase().includes(fieldOfficerSearchTerm.toLowerCase()) ||
        officer.phoneNumber.includes(fieldOfficerSearchTerm),
    )

    if (filtered.length === 0) return

    // Arrow down
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedFieldOfficerIndex((prev) => {
        const nextIndex = prev === -1 ? 0 : Math.min(prev + 1, filtered.length - 1)
        return nextIndex
      })
    }
    // Arrow up
    else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedFieldOfficerIndex((prev) => {
        const prevIndex = prev === -1 ? 0 : Math.max(prev - 1, 0)
        return prevIndex
      })
    }
    // Enter
    else if (e.key === "Enter" && selectedFieldOfficerIndex >= 0) {
      e.preventDefault()
      handleFieldOfficerSelect(filtered[selectedFieldOfficerIndex])
    }
    // Escape
    else if (e.key === "Escape") {
      e.preventDefault()
      setFieldOfficerSearchTerm("")
    }
  }

  const handleSalesmanKeyDown = (e) => {
    const filtered = salesmen.filter(
      (salesman) =>
        salesman.name.toLowerCase().includes(salesmanSearchTerm.toLowerCase()) ||
        salesman.phoneNumber.includes(salesmanSearchTerm),
    )

    if (filtered.length === 0) return

    // Arrow down
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedSalesmanIndex((prev) => {
        const nextIndex = prev === -1 ? 0 : Math.min(prev + 1, filtered.length - 1)
        return nextIndex
      })
    }
    // Arrow up
    else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedSalesmanIndex((prev) => {
        const prevIndex = prev === -1 ? 0 : Math.max(prev - 1, 0)
        return prevIndex
      })
    }
    // Enter
    else if (e.key === "Enter" && selectedSalesmanIndex >= 0) {
      e.preventDefault()
      handleSalesmanSelect(filtered[selectedSalesmanIndex])
    }
    // Escape
    else if (e.key === "Escape") {
      e.preventDefault()
      setSalesmanSearchTerm("")
    }
  }

  const checkInventoryLevels = () => {
    // Create a map to track total quantities for each product
    const productQuantities = new Map()

    // Add items from the bill items list
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

    // Add current item if it has a product ID
    if (currentItem.productId && !currentItem.isBonus) {
      const currentQty = productQuantities.get(currentItem.productId) || 0
      productQuantities.set(currentItem.productId, currentQty + currentItem.quantity)
    }

    // Add current bonus items if any
    if (currentItem.bonusItems) {
      currentItem.bonusItems.forEach((bonusItem) => {
        if (bonusItem.productId) {
          const currentQty = productQuantities.get(bonusItem.productId) || 0
          productQuantities.set(bonusItem.productId, currentQty + bonusItem.quantity)
        }
      })
    }

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

    // Check if there are any items in the bill
    if (billItems.length === 0) {
      toast.error("Please add at least one product to the bill")
      return
    }

    // Add current item to bill items if it has a product ID
    if (currentItem.productId) {
      await addCurrentItemToBill()
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
          extraDiscount: item.extraDiscount,
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
              onKeyDown={handleClientKeyDown}
              ref={clientSearchRef}
            />
            {clientSearchTerm && filteredClients.length > 0 && (
              <div
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                ref={clientDropdownRef}
              >
                {filteredClients.map((client, index) => (
                  <div
                    key={client._id}
                    className={`p-2 hover:bg-gray-100 cursor-pointer client-dropdown-item ${
                      index === selectedClientIndex ? "bg-blue-100" : ""
                    }`}
                    onClick={() => handleClientSelect(client)}
                  >
                    <div className="font-medium">{client.clientName}</div>
                    <div className="text-sm">{client.clientNumber}</div>
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
              onKeyDown={handleFieldOfficerKeyDown}
              ref={fieldOfficerSearchRef}
            />
            {fieldOfficerSearchTerm && filteredFieldOfficers.length > 0 && (
              <div
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                ref={fieldOfficerDropdownRef}
              >
                {filteredFieldOfficers.map((officer, index) => (
                  <div
                    key={officer._id}
                    className={`p-2 hover:bg-gray-100 cursor-pointer field-officer-dropdown-item ${
                      index === selectedFieldOfficerIndex ? "bg-blue-100" : ""
                    }`}
                    onClick={() => handleFieldOfficerSelect(officer)}
                  >
                    <div className="font-medium">{officer.name}</div>
                    <div className="text-sm">{officer.phoneNumber}</div>
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
              onKeyDown={handleSalesmanKeyDown}
              ref={salesmanSearchRef}
            />
            {salesmanSearchTerm && filteredSalesmen.length > 0 && (
              <div
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                ref={salesmanDropdownRef}
              >
                {filteredSalesmen.map((salesman, index) => (
                  <div
                    key={salesman._id}
                    className={`p-2 hover:bg-gray-100 cursor-pointer salesman-dropdown-item ${
                      index === selectedSalesmanIndex ? "bg-blue-100" : ""
                    }`}
                    onClick={() => handleSalesmanSelect(salesman)}
                  >
                    <div className="font-medium">{salesman.name}</div>
                    <div className="text-sm">{salesman.phoneNumber}</div>
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

      <div className="bg-white rounded-lg shadow p-6 mb-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Add Bill Item</h2>
        <div className="mb-6">
          <div className="grid grid-cols-12 gap-2 items-center mb-2">
            <div className="col-span-3">
              <label className="block text-gray-700 text-sm font-bold mb-1">Product</label>
              <div className="relative">
                <div className="flex">
                  <input
                    type="text"
                    placeholder="Search product by name..."
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={productSearchTerm || ""}
                    onChange={(e) => handleProductSearchChange(e.target.value)}
                    onFocus={handleProductSearchFocus}
                    onKeyDown={handleProductKeyDown}
                    ref={productSearchRef}
                  />
                  {currentItem.productId && (
                    <button
                      onClick={clearProductSelection}
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

                {showProductDropdown && productSearchTerm && filteredProducts(productSearchTerm).length > 0 && (
                  <div
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                    ref={productDropdownRef}
                  >
                    {filteredProducts(productSearchTerm).map((product, productIndex) => (
                      <div
                        key={product._id}
                        className={`p-2 hover:bg-gray-100 cursor-pointer ${
                          productIndex === selectedProductIndex ? "bg-blue-100" : ""
                        }`}
                        onClick={() => handleProductSelect(product._id)}
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
                          {product.hasInfiniteQuantity === false && ` - ${product.quantity} in stock`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentItem.productId && (
                  <div className="mt-1 p-2 bg-gray-50 rounded-md">
                    <div className="font-medium">{currentItem.productName}</div>
                    {(currentItem.companyName || currentItem.containerSize) && (
                      <div className="text-xs text-gray-600 mt-0.5">
                        {currentItem.companyName && <span>{currentItem.companyName}</span>}
                        {currentItem.companyName && currentItem.containerSize && <span> - </span>}
                        {currentItem.containerSize && <span>{currentItem.containerSize}</span>}
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      PKR {currentItem.rate.toFixed(2)}
                      {currentItem.hasInfiniteQuantity === false && ` - ${currentItem.availableQuantity} available`}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-1">Quantity</label>
              <input
                id="item-quantity"
                type="number"
                value={currentItem.quantity}
                onChange={(e) => handleInputChange("quantity", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                min="1"
              />
              {currentItem.productId && currentItem.hasInfiniteQuantity === false && (
                <div className="text-xs text-gray-500 mt-1">Available: {currentItem.availableQuantity}</div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-1">Rate</label>
              <input
                type="number"
                value={currentItem.rate}
                onChange={(e) => handleInputChange("rate", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                step="0.01"
                min="0"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-gray-700 text-sm font-bold mb-1">Disc %</label>
              <input
                type="number"
                value={currentItem.discount}
                onChange={(e) => handleInputChange("discount", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                min="0"
                max="100"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-gray-700 text-sm font-bold mb-1">Extra Disc %</label>
              <input
                type="number"
                value={currentItem.extraDiscount}
                onChange={(e) => handleInputChange("extraDiscount", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                min="0"
                max="100"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-1">Total</label>
              <div className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md">
                PKR {currentItem.total.toFixed(2)}
              </div>
            </div>
            <div className="col-span-1 flex items-end">
              <button
                type="button"
                onClick={addCurrentItemToBill}
                className="p-2 bg-green-100 text-green-600 rounded-md hover:bg-green-200"
                title="Add to Bill"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Bonus Items */}
          {currentItem.bonusItems &&
            currentItem.bonusItems.map((bonusItem, bonusIndex) => {
              const bonusKey = `${bonusIndex}`
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
                          onChange={(e) => handleBonusProductSearchChange(bonusIndex, e.target.value)}
                          onFocus={() => handleBonusProductSearchFocus(bonusIndex)}
                          onKeyDown={(e) => handleBonusProductKeyDown(e, bonusIndex)}
                          ref={(el) => (bonusProductSearchRefs.current[bonusKey] = el)}
                        />
                        {bonusItem.productId && (
                          <button
                            onClick={() => clearBonusProductSelection(bonusIndex)}
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
                          <div
                            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                            ref={(el) => (bonusProductDropdownRefs.current[bonusKey] = el)}
                          >
                            {filteredProducts(bonusProductSearchTerms[bonusKey]).map((product, productIndex) => (
                              <div
                                key={product._id}
                                className={`p-2 hover:bg-gray-100 cursor-pointer ${
                                  productIndex === selectedBonusProductIndex[bonusKey] ? "bg-blue-100" : ""
                                }`}
                                onClick={() => handleBonusProductSelect(bonusIndex, product._id)}
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
                                  {product.hasInfiniteQuantity === false && ` - ${product.quantity} in stock`}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      {bonusItem.productId && (
                        <div className="mt-1 p-2 bg-gray-50 rounded-md">
                          <div className="font-medium">{bonusItem.productName}</div>
                          {(bonusItem.companyName || bonusItem.containerSize) && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              {bonusItem.companyName && <span>{bonusItem.companyName}</span>}
                              {bonusItem.companyName && bonusItem.containerSize && <span> - </span>}
                              {bonusItem.containerSize && <span>{bonusItem.containerSize}</span>}
                            </div>
                          )}
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
                      id={`bonus-quantity-${bonusIndex}`}
                      type="number"
                      value={bonusItem.quantity}
                      onChange={(e) => handleBonusInputChange(bonusIndex, "quantity", e.target.value)}
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
                      onChange={(e) => handleBonusInputChange(bonusIndex, "rate", e.target.value)}
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
                      onChange={(e) => handleBonusInputChange(bonusIndex, "discount", e.target.value)}
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
                      onClick={() => removeBonusItem(bonusIndex)}
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

          <div className="ml-8 mt-2">
            <button
              type="button"
              onClick={addBonusItem}
              className="p-2 bg-green-100 text-green-600 rounded-md hover:bg-green-200"
            >
              Add Bonus Item
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p className="mb-1">
              Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Ctrl+Enter</kbd> (Windows) or{" "}
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Cmd+Enter</kbd> (Mac) to add item to
              bill
            </p>
            <p className="mb-1">
              Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Ctrl+B</kbd> (Windows) or{" "}
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Cmd+B</kbd> (Mac) to add a bonus
              item
            </p>
            <p>
              Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Ctrl+S</kbd> (Windows) or{" "}
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Cmd+S</kbd> (Mac) to save the bill
            </p>
          </div>
        </div>

        {/* Bill Items List */}
        {billItems.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Bill Items</h3>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disc %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Extra Disc %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {billItems.map((item, index) => (
                    <>
                      <tr key={item.id} className={item.isBonus ? "bg-green-50" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div>{item.productName}</div>
                          {(item.companyName || item.containerSize) && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              {item.companyName && <span>{item.companyName}</span>}
                              {item.companyName && item.containerSize && <span> - </span>}
                              {item.containerSize && <span>{item.containerSize}</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          PKR {item.rate.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.discount}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.extraDiscount}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          PKR {item.total.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => editItemFromBill(index)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button onClick={() => removeItemFromBill(index)} className="text-red-600 hover:text-red-900">
                            Remove
                          </button>
                        </td>
                      </tr>
                      {/* Display bonus items if any */}
                      {item.bonusItems &&
                        item.bonusItems.length > 0 &&
                        item.bonusItems.map((bonusItem, bonusIndex) => (
                          <tr key={`${item.id}-bonus-${bonusIndex}`} className="bg-green-50">
                            <td className="px-6 py-4 pl-10 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div>
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 mr-2">
                                  BONUS
                                </span>
                                {bonusItem.productName}
                              </div>
                              {(bonusItem.companyName || bonusItem.containerSize) && (
                                <div className="text-xs text-gray-600 mt-0.5 ml-16">
                                  {bonusItem.companyName && <span>{bonusItem.companyName}</span>}
                                  {bonusItem.companyName && bonusItem.containerSize && <span> - </span>}
                                  {bonusItem.containerSize && <span>{bonusItem.containerSize}</span>}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bonusItem.quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              PKR {bonusItem.rate.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bonusItem.discount}%</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                FREE
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                          </tr>
                        ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 text-right">
          <div className="text-xl font-bold">Total: PKR {billTotal.toFixed(2)}</div>
        </div>

        <button onClick={saveBill} className="mt-6 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">
          Save Bill
        </button>
      </div>
    </div>
  )
}

export default BillGeneration
