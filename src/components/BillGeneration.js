"use client"

import { Fragment, useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import { useDropdownData } from "../hooks/useLazyData"
import dataService from "../services/DataService"
import configService from "../services/ConfigService"

// Helper function to generate a unique ID
function generateUniqueId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function BillGeneration() {
  const navigate = useNavigate()

  // Dropdown data hooks
  const { data: clients, loading: clientsLoading, refresh: refreshClients } = useDropdownData("clients")
  const { data: products, loading: productsLoading, refresh: refreshProducts } = useDropdownData("products")
  const {
    data: fieldOfficers,
    loading: fieldOfficersLoading,
    refresh: refreshFieldOfficers,
  } = useDropdownData("fieldOfficers")
  const { data: salesmen, loading: salesmenLoading, refresh: refreshSalesmen } = useDropdownData("salesmen")

  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedFieldOfficer, setSelectedFieldOfficer] = useState(null)
  const [selectedSalesman, setSelectedSalesman] = useState(null)
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [fieldOfficerSearchTerm, setFieldOfficerSearchTerm] = useState("")
  const [salesmanSearchTerm, setSalesmanSearchTerm] = useState("")

  // Modal State & Added Items Search State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [addedItemsSearchTerm, setAddedItemsSearchTerm] = useState("")

  // Current item being edited/added inside modal
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

  // List of added items in the bill
  const [billItems, setBillItems] = useState([])

  const [billDate, setBillDate] = useState(configService.getTodayIsoDate())
  const [billTotal, setBillTotal] = useState(0)
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [bonusProductSearchTerms, setBonusProductSearchTerms] = useState({})
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [showBonusProductDropdowns, setShowBonusProductDropdowns] = useState({})
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1)
  const [selectedBonusProductIndex, setSelectedBonusProductIndex] = useState({})

  // Keyboard navigation index states for dropdowns
  const [selectedClientIndex, setSelectedClientIndex] = useState(-1)
  const [selectedFieldOfficerIndex, setSelectedFieldOfficerIndex] = useState(-1)
  const [selectedSalesmanIndex, setSelectedSalesmanIndex] = useState(-1)

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
    // Auto-focus client search on component mount
    if (clientSearchRef.current) {
      clientSearchRef.current.focus()
    }

    // Register refresh callbacks for cache invalidation
    dataService.registerRefreshCallback("products", refreshProducts)
    dataService.registerRefreshCallback("clients", refreshClients)
    dataService.registerRefreshCallback("fieldOfficers", refreshFieldOfficers)
    dataService.registerRefreshCallback("salesmen", refreshSalesmen)

    // Cleanup on unmount
    return () => {
      dataService.unregisterRefreshCallback("products", refreshProducts)
      dataService.unregisterRefreshCallback("clients", refreshClients)
      dataService.unregisterRefreshCallback("fieldOfficers", refreshFieldOfficers)
      dataService.unregisterRefreshCallback("salesmen", refreshSalesmen)
    }
  }, [refreshProducts, refreshClients, refreshFieldOfficers, refreshSalesmen])

  useEffect(() => {
    calculateBillTotal()
  }, [billItems])

  // Focus product search input when modal opens
  useEffect(() => {
    if (isProductModalOpen) {
      setTimeout(() => {
        if (productSearchRef.current) {
          productSearchRef.current.focus()
        }
      }, 150)
    }
  }, [isProductModalOpen])

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

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Close modal on Escape
      if (e.key === "Escape" && isProductModalOpen) {
        e.preventDefault()
        closeProductModal()
        return
      }

      // Cmd+Enter / Ctrl+Enter to add item when modal is open
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (isProductModalOpen && currentItem.productId) {
          e.preventDefault()
          addCurrentItemToBill()
        }
      }
      // Cmd+B / Ctrl+B to add bonus item when modal is open
      else if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) {
        if (isProductModalOpen) {
          e.preventDefault()
          if (currentItem.productId) {
            addBonusItem()
          } else {
            toast.error("Please select a product first before adding a bonus item")
          }
        }
      }
      // Cmd+S / Ctrl+S to save bill
      else if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault()
        saveBill()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [currentItem, billItems, isProductModalOpen, editingItemIndex])

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

    // Clear search term and hide dropdown
    setProductSearchTerm("")
    setShowProductDropdown(false)

    // Focus quantity input
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

  const calculateItemTotal = (quantity, rate, discount, extraDiscount = 0) => {
    // First apply percentage discount
    const afterDiscount = quantity * rate * (1 - discount / 100)
    // Then apply extra discount (as percentage) on the result
    const finalTotal = afterDiscount * (1 - extraDiscount / 100)
    return Math.round(finalTotal * 100) / 100
  }

  const calculateBillTotal = () => {
    const total = billItems.reduce((sum, item) => {
      if (!item.isBonus && item.total !== undefined && item.total !== null && !isNaN(item.total)) {
        return sum + item.total
      }
      return sum
    }, 0)
    setBillTotal(Math.round(total * 100) / 100)
  }

  const openAddProductModal = () => {
    if (!selectedClient) {
      toast.error("Please select a client first")
    }
    // Reset current item state for fresh addition
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
    setProductSearchTerm("")
    setAddedItemsSearchTerm("")
    setEditingItemIndex(null)
    setIsProductModalOpen(true)
  }

  const closeProductModal = () => {
    setIsProductModalOpen(false)
    setEditingItemIndex(null)
    setProductSearchTerm("")
    setAddedItemsSearchTerm("")
  }

  const addCurrentItemToBill = () => {
    if (!currentItem.productId) {
      toast.error("Please select a product first")
      return
    }

    const itemToAdd = {
      ...currentItem,
      isBonus: false,
      total: calculateItemTotal(currentItem.quantity, currentItem.rate, currentItem.discount, currentItem.extraDiscount),
    }

    if (editingItemIndex !== null) {
      // Replace existing item
      const updatedList = [...billItems]
      updatedList[editingItemIndex] = itemToAdd
      setBillItems(updatedList)
      toast.success("Item updated in bill")
      setEditingItemIndex(null)

      // Reset current item so user can continue adding next product
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
      setProductSearchTerm("")
    } else {
      // Add new item
      setBillItems([...billItems, itemToAdd])
      toast.success(`${itemToAdd.productName} added to bill`)

      // Reset current item so user can quickly add another product in the modal
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
      setProductSearchTerm("")

      // Focus back on product search inside modal
      setTimeout(() => {
        if (productSearchRef.current) {
          productSearchRef.current.focus()
        }
      }, 100)
    }
  }

  const removeItemFromBill = (index) => {
    const updatedItems = billItems.filter((_, i) => i !== index)
    setBillItems(updatedItems)
    if (editingItemIndex === index) {
      setEditingItemIndex(null)
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
    } else if (editingItemIndex !== null && editingItemIndex > index) {
      setEditingItemIndex(editingItemIndex - 1)
    }
    toast.success("Item removed from bill")
  }

  const editItemFromBill = (index) => {
    setCurrentItem({ ...billItems[index] })
    setEditingItemIndex(index)
    setProductSearchTerm("")
    setIsProductModalOpen(true)
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

    const key = `${bonusIndex}`
    const updatedSearchTerms = { ...bonusProductSearchTerms }
    delete updatedSearchTerms[key]
    setBonusProductSearchTerms(updatedSearchTerms)

    const updatedDropdowns = { ...showBonusProductDropdowns }
    delete updatedDropdowns[key]
    setShowBonusProductDropdowns(updatedDropdowns)

    const updatedSelectedIndex = { ...selectedBonusProductIndex }
    delete updatedSelectedIndex[key]
    setSelectedBonusProductIndex(updatedSelectedIndex)
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

    const key = `${bonusIndex}`
    setBonusProductSearchTerms((prev) => ({
      ...prev,
      [key]: "",
    }))
    setShowBonusProductDropdowns((prev) => ({
      ...prev,
      [key]: false,
    }))
    setSelectedBonusProductIndex((prev) => ({
      ...prev,
      [key]: -1,
    }))

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

    if (value.trim() !== "") {
      setShowBonusProductDropdowns((prev) => ({
        ...prev,
        [key]: true,
      }))
      setSelectedBonusProductIndex((prev) => ({
        ...prev,
        [key]: 0,
      }))
    } else {
      setShowBonusProductDropdowns((prev) => ({
        ...prev,
        [key]: false,
      }))
      setSelectedBonusProductIndex((prev) => ({
        ...prev,
        [key]: -1,
      }))
    }
  }

  const handleProductSearchFocus = () => {
    if (productSearchTerm?.trim() !== "") {
      setShowProductDropdown(true)
    }
  }

  const handleBonusProductSearchFocus = (bonusIndex) => {
    const key = `${bonusIndex}`
    if (bonusProductSearchTerms[key]?.trim() !== "") {
      setShowBonusProductDropdowns((prev) => ({
        ...prev,
        [key]: true,
      }))
    }
  }

  const clearProductSelection = () => {
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
    setProductSearchTerm("")
  }

  const clearBonusProductSelection = (bonusIndex) => {
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

    const key = `${bonusIndex}`
    setBonusProductSearchTerms((prev) => ({
      ...prev,
      [key]: "",
    }))
    setSelectedBonusProductIndex((prev) => ({
      ...prev,
      [key]: -1,
    }))
  }

  const filteredProducts = (searchTerm) => {
    if (!searchTerm) return products
    return products.filter((product) =>
      product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.companyName && product.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }

  // Filter already added items for the side list in modal
  const filteredAddedBillItems = addedItemsSearchTerm
    ? billItems.filter(
      (item) =>
        item.productName.toLowerCase().includes(addedItemsSearchTerm.toLowerCase()) ||
        (item.companyName && item.companyName.toLowerCase().includes(addedItemsSearchTerm.toLowerCase())),
    )
    : billItems

  const handleProductKeyDown = (e) => {
    const filtered = filteredProducts(productSearchTerm || "")
    if (!showProductDropdown || filtered.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedProductIndex(Math.min(selectedProductIndex + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedProductIndex(Math.max(selectedProductIndex - 1, 0))
    } else if (e.key === "Enter" && selectedProductIndex >= 0) {
      e.preventDefault()
      const selectedProduct = filtered[selectedProductIndex]
      if (selectedProduct) {
        handleProductSelect(selectedProduct._id)
      }
    } else if (e.key === "Escape") {
      setShowProductDropdown(false)
    }
  }

  const handleBonusProductKeyDown = (e, bonusIndex) => {
    const key = `${bonusIndex}`
    const filtered = filteredProducts(bonusProductSearchTerms[key] || "")
    if (!showBonusProductDropdowns[key] || filtered.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedBonusProductIndex((prev) => {
        const currentIndex = prev[key] !== undefined ? prev[key] : -1
        return {
          ...prev,
          [key]: Math.min(currentIndex + 1, filtered.length - 1),
        }
      })
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedBonusProductIndex((prev) => {
        const currentIndex = prev[key] !== undefined ? prev[key] : 0
        return {
          ...prev,
          [key]: Math.max(currentIndex - 1, 0),
        }
      })
    } else if (e.key === "Enter") {
      e.preventDefault()
      const currentIndex = selectedBonusProductIndex[key]
      if (currentIndex !== undefined && currentIndex >= 0 && currentIndex < filtered.length) {
        const selectedProduct = filtered[currentIndex]
        if (selectedProduct) {
          handleBonusProductSelect(bonusIndex, selectedProduct._id)
        }
      } else if (filtered.length > 0) {
        const selectedProduct = filtered[0]
        if (selectedProduct) {
          handleBonusProductSelect(bonusIndex, selectedProduct._id)
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
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

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedClientIndex((prev) => (prev === -1 ? 0 : Math.min(prev + 1, filtered.length - 1)))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedClientIndex((prev) => (prev === -1 ? 0 : Math.max(prev - 1, 0)))
    } else if (e.key === "Enter" && selectedClientIndex >= 0) {
      e.preventDefault()
      handleClientSelect(filtered[selectedClientIndex])
    } else if (e.key === "Escape") {
      e.preventDefault()
      setClientSearchTerm("")
    }
  }

  const handleFieldOfficerKeyDown = (e) => {
    const filtered = fieldOfficers.filter(
      (officer) =>
        officer.name.toLowerCase().includes(fieldOfficerSearchTerm.toLowerCase()) ||
        officer.phoneNumber.includes(fieldOfficerSearchTerm),
    )

    if (filtered.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedFieldOfficerIndex((prev) => (prev === -1 ? 0 : Math.min(prev + 1, filtered.length - 1)))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedFieldOfficerIndex((prev) => (prev === -1 ? 0 : Math.max(prev - 1, 0)))
    } else if (e.key === "Enter" && selectedFieldOfficerIndex >= 0) {
      e.preventDefault()
      handleFieldOfficerSelect(filtered[selectedFieldOfficerIndex])
    } else if (e.key === "Escape") {
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

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedSalesmanIndex((prev) => (prev === -1 ? 0 : Math.min(prev + 1, filtered.length - 1)))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedSalesmanIndex((prev) => (prev === -1 ? 0 : Math.max(prev - 1, 0)))
    } else if (e.key === "Enter" && selectedSalesmanIndex >= 0) {
      e.preventDefault()
      handleSalesmanSelect(filtered[selectedSalesmanIndex])
    } else if (e.key === "Escape") {
      e.preventDefault()
      setSalesmanSearchTerm("")
    }
  }

  // Scroll into view effects
  useEffect(() => {
    if (selectedClientIndex >= 0 && clientSearchRef.current) {
      const dropdownContainer = clientSearchRef.current.parentElement?.querySelector(".client-dropdown-container")
      const selectedElement = dropdownContainer?.children[selectedClientIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    }
  }, [selectedClientIndex])

  useEffect(() => {
    if (selectedFieldOfficerIndex >= 0 && fieldOfficerSearchRef.current) {
      const dropdownContainer = fieldOfficerSearchRef.current.parentElement?.querySelector(".field-officer-dropdown-container")
      const selectedElement = dropdownContainer?.children[selectedFieldOfficerIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    }
  }, [selectedFieldOfficerIndex])

  useEffect(() => {
    if (selectedSalesmanIndex >= 0 && salesmanSearchRef.current) {
      const dropdownContainer = salesmanSearchRef.current.parentElement?.querySelector(".salesman-dropdown-container")
      const selectedElement = dropdownContainer?.children[selectedSalesmanIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    }
  }, [selectedSalesmanIndex])

  useEffect(() => {
    if (selectedProductIndex >= 0 && productDropdownRef.current) {
      const selectedElement = productDropdownRef.current.children[selectedProductIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    }
  }, [selectedProductIndex])

  useEffect(() => {
    Object.keys(selectedBonusProductIndex).forEach((bonusKey) => {
      const currentIndex = selectedBonusProductIndex[bonusKey]
      if (currentIndex >= 0 && bonusProductDropdownRefs.current[bonusKey]) {
        const selectedElement = bonusProductDropdownRefs.current[bonusKey].children[currentIndex]
        if (selectedElement) {
          selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" })
        }
      }
    })
  }, [selectedBonusProductIndex])

  useEffect(() => {
    Object.keys(bonusProductSearchTerms).forEach((bonusKey) => {
      if (bonusProductSearchTerms[bonusKey] && filteredProducts(bonusProductSearchTerms[bonusKey]).length > 0) {
        if (selectedBonusProductIndex[bonusKey] === undefined) {
          setSelectedBonusProductIndex((prev) => ({
            ...prev,
            [bonusKey]: 0,
          }))
        }
      }
    })
  }, [bonusProductSearchTerms])

  // Inventory validation
  const checkInventoryLevels = (itemsToCheck = null) => {
    const items = itemsToCheck || billItems
    const productQuantities = new Map()

    items.forEach((item) => {
      if (item.productId && !item.isBonus) {
        const currentQty = productQuantities.get(item.productId) || 0
        productQuantities.set(item.productId, currentQty + item.quantity)
      }

      if (item.bonusItems) {
        item.bonusItems.forEach((bonusItem) => {
          if (bonusItem.productId) {
            const currentQty = productQuantities.get(bonusItem.productId) || 0
            productQuantities.set(bonusItem.productId, currentQty + bonusItem.quantity)
          }
        })
      }
    })

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

  // Save Bill handler
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

    if (billItems.length === 0) {
      toast.error("Please add at least one product to the bill")
      return
    }

    let itemsToUse = [...billItems]

    if (!checkInventoryLevels(itemsToUse)) {
      return
    }

    const allItems = []

    itemsToUse.forEach((item) => {
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

    const itemsWithIds = allItems.map((item) => {
      if (!item._id) {
        return { ...item, _id: generateUniqueId() }
      }
      return item
    })

    const computedTotal = itemsWithIds.reduce((sum, item) => {
      if (!item.isBonus && item.total !== undefined && item.total !== null && !isNaN(item.total)) {
        return sum + Number(item.total)
      }
      return sum
    }, 0)
    const roundedTotal = Math.round(computedTotal * 100) / 100
    setBillTotal(roundedTotal)

    const bill = {
      clientId: selectedClient._id,
      clientName: selectedClient.clientName,
      clientAddress: selectedClient.clientAddress,
      fieldOfficerId: selectedFieldOfficer._id,
      fieldOfficerName: selectedFieldOfficer.name,
      salesmanId: selectedSalesman._id,
      salesmanName: selectedSalesman.name,
      billDate: new Date(`${billDate}T00:00:00`),
      items: itemsWithIds,
      totalAmount: roundedTotal,
    }

    try {
      const savedBill = await window.api.addBill(bill)
      dataService.invalidateCacheOnModification("bills")
      dataService.invalidateCacheOnModification("dashboardStats")
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
    <div className="max-w-7xl mx-auto pb-12 px-2 sm:px-4">
      {/* Top Header Card */}
      <div className="mb-6 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl shadow-xl p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
              <svg className="w-7 h-7 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Generate New Bill</h1>
              <p className="text-blue-200 text-sm mt-0.5">Fill in bill details and add items via interactive modal</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15">
          <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold block">Bill Subtotal</span>
            <span className="text-xl font-bold tracking-tight text-white">
              PKR {billTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Bill Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Client Selector Card */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-gray-800 font-semibold text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Select Client <span className="text-red-500">*</span>
            </label>
            {selectedClient && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Selected
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search client by name or phone number..."
              className="w-full pl-3 pr-4 py-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
              value={clientSearchTerm}
              onChange={(e) => setClientSearchTerm(e.target.value)}
              onKeyDown={handleClientKeyDown}
              ref={clientSearchRef}
            />
            {clientSearchTerm && filteredClients.length > 0 && (
              <div
                className="absolute z-30 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto client-dropdown-container divide-y divide-gray-100"
                ref={clientDropdownRef}
              >
                {filteredClients.map((client, index) => (
                  <div
                    key={client._id}
                    className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors client-dropdown-item ${index === selectedClientIndex ? "bg-blue-100/70" : ""
                      }`}
                    onClick={() => handleClientSelect(client)}
                  >
                    <div className="font-semibold text-gray-900 text-sm">{client.clientName}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                      <span>📞 {client.clientNumber}</span>
                      <span>📍 {client.clientAddress}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedClient ? (
            <div className="mt-3 p-3.5 bg-gradient-to-br from-blue-50/60 to-slate-50 border border-blue-100 rounded-xl">
              <div className="font-bold text-gray-900 text-base">{selectedClient.clientName}</div>
              <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span><strong>Phone:</strong> {selectedClient.clientNumber}</span>
                <span><strong>Address:</strong> {selectedClient.clientAddress}</span>
              </div>
              <div className="mt-2">
                <span
                  className={`inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full ${selectedClient.isFiler
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                >
                  {selectedClient.isFiler ? `Filer (NTN: ${selectedClient.ntnNumber})` : "Non-Filer"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Please select a client to view prices & add products.
            </p>
          )}
        </div>

        {/* Bill Date Selector Card */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 hover:shadow-lg transition-shadow flex flex-col justify-between">
          <div>
            <label className="block text-gray-800 font-semibold text-sm mb-3 flex items-center gap-2" htmlFor="billDate">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Bill Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="billDate"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
            />
          </div>
        </div>

        {/* Field Officer Card */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 hover:shadow-lg transition-shadow">
          <label className="block text-gray-800 font-semibold text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Field Officer <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search field officer by name or phone..."
              className="w-full pl-3 pr-4 py-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
              value={fieldOfficerSearchTerm}
              onChange={(e) => setFieldOfficerSearchTerm(e.target.value)}
              onKeyDown={handleFieldOfficerKeyDown}
              ref={fieldOfficerSearchRef}
            />
            {fieldOfficerSearchTerm && filteredFieldOfficers.length > 0 && (
              <div
                className="absolute z-30 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto field-officer-dropdown-container divide-y divide-gray-100"
                ref={fieldOfficerDropdownRef}
              >
                {filteredFieldOfficers.map((officer, index) => (
                  <div
                    key={officer._id}
                    className={`p-3 hover:bg-indigo-50 cursor-pointer transition-colors field-officer-dropdown-item ${index === selectedFieldOfficerIndex ? "bg-indigo-100/70" : ""
                      }`}
                    onClick={() => handleFieldOfficerSelect(officer)}
                  >
                    <div className="font-semibold text-gray-900 text-sm">{officer.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">📞 {officer.phoneNumber}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedFieldOfficer && (
            <div className="mt-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
              <div className="font-bold text-gray-900 text-sm">{selectedFieldOfficer.name}</div>
              <div className="text-xs text-gray-600 mt-0.5">📞 {selectedFieldOfficer.phoneNumber}</div>
            </div>
          )}
        </div>

        {/* Salesman Card */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 hover:shadow-lg transition-shadow">
          <label className="block text-gray-800 font-semibold text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Salesman <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search salesman by name or phone..."
              className="w-full pl-3 pr-4 py-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm transition-all"
              value={salesmanSearchTerm}
              onChange={(e) => setSalesmanSearchTerm(e.target.value)}
              onKeyDown={handleSalesmanKeyDown}
              ref={salesmanSearchRef}
            />
            {salesmanSearchTerm && filteredSalesmen.length > 0 && (
              <div
                className="absolute z-30 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto salesman-dropdown-container divide-y divide-gray-100"
                ref={salesmanDropdownRef}
              >
                {filteredSalesmen.map((salesman, index) => (
                  <div
                    key={salesman._id}
                    className={`p-3 hover:bg-emerald-50 cursor-pointer transition-colors salesman-dropdown-item ${index === selectedSalesmanIndex ? "bg-emerald-100/70" : ""
                      }`}
                    onClick={() => handleSalesmanSelect(salesman)}
                  >
                    <div className="font-semibold text-gray-900 text-sm">{salesman.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">📞 {salesman.phoneNumber}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedSalesman && (
            <div className="mt-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
              <div className="font-bold text-gray-900 text-sm">{selectedSalesman.name}</div>
              <div className="text-xs text-gray-600 mt-0.5">📞 {selectedSalesman.phoneNumber}</div>
            </div>
          )}
        </div>
      </div>

      {/* Bill Items Section Container */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Products in Bill</h2>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
              {billItems.length} {billItems.length === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Action button to trigger modal */}
          <button
            type="button"
            onClick={openAddProductModal}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Add Product to Bill
          </button>
        </div>

        {/* Items Table */}
        {billItems.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">S#</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Disc %</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Extra Disc %</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billItems.map((item, index) => {
                  const isBonusItem = item.isBonus === true

                  return (
                    <Fragment key={item.id}>
                      <tr
                        className={
                          isBonusItem
                            ? "bg-emerald-50/70 hover:bg-emerald-100/60 transition-colors"
                            : "hover:bg-slate-50/80 transition-colors"
                        }
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                          {isBonusItem ? <span className="text-emerald-700 font-bold pl-1">↳</span> : index + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            {isBonusItem && (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                                BONUS
                              </span>
                            )}
                            <span className={isBonusItem ? "text-emerald-950 font-bold" : ""}>{item.productName}</span>
                          </div>
                          {(item.companyName || item.containerSize) && (
                            <div className={`text-xs font-normal mt-0.5 flex items-center gap-1.5 ${isBonusItem ? "text-emerald-700" : "text-gray-500"}`}>
                              {item.companyName && <span>🏢 {item.companyName}</span>}
                              {item.companyName && item.containerSize && <span>•</span>}
                              {item.containerSize && <span>📦 {item.containerSize}</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          PKR {item.rate.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{isBonusItem ? "-" : `${item.discount}%`}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{isBonusItem ? "-" : `${item.extraDiscount}%`}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold">
                          {isBonusItem ? (
                            <span className="px-2.5 py-1 text-xs font-extrabold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                              FREE (Bonus)
                            </span>
                          ) : (
                            <span className="text-blue-700">PKR {item.total.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => editItemFromBill(index)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => removeItemFromBill(index)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>

                    {/* Render Bonus Items under primary item with Company Name & Container Size display */}
                    {item.bonusItems?.length > 0 &&
                      item.bonusItems.map((bonusItem, bonusIndex) => (
                        <tr key={`${item.id}-bonus-${bonusIndex}`} className="bg-emerald-50/50">
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-emerald-600 pl-6">↳</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                                BONUS
                              </span>
                              <span>{bonusItem.productName}</span>
                            </div>
                            {(bonusItem.companyName || bonusItem.containerSize) && (
                              <div className="text-xs text-emerald-800 font-medium mt-0.5 ml-14 flex items-center gap-1.5">
                                {bonusItem.companyName && <span>🏢 {bonusItem.companyName}</span>}
                                {bonusItem.companyName && bonusItem.containerSize && <span>•</span>}
                                {bonusItem.containerSize && <span>📦 {bonusItem.containerSize}</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700">{bonusItem.quantity}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">PKR {bonusItem.rate.toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{bonusItem.discount}%</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">-</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-emerald-700">
                            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800">
                              FREE
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-400 font-medium">-</td>
                        </tr>
                      ))}
                      </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 px-4 text-center bg-slate-50/70 border-2 border-dashed border-gray-200 rounded-2xl">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-800">No products added to this bill yet</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Click the button below to launch the modal and start adding products to your bill.
            </p>
            <button
              type="button"
              onClick={openAddProductModal}
              className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Product Now
            </button>
          </div>
        )}
      </div>

      {/* Bottom Save Section */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Grand Total</span>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-0.5">
            PKR {billTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <button
          onClick={saveBill}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-bold text-base px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          Save & Print Bill
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PRODUCT MODAL WITH SIDE PANEL FOR ALREADY ADDED BILL ITEMS */}
      {/* ========================================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL TOP LINE / HEADER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white gap-3 rounded-t-2xl">
              {/* Left Side: Current Total of already added items */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">Current Total:</span>
                <span className="text-base sm:text-lg font-extrabold text-blue-300 bg-white/10 px-3 py-1 rounded-lg border border-white/15 shadow-inner">
                  PKR {billTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Right/Middle: Immutable Client Name Banner */}
              <div className="flex items-center gap-2 bg-white/10 border border-white/15 px-3.5 py-1.5 rounded-xl shadow-inner">
                <svg className="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Client:</span>
                <span className="text-sm font-extrabold text-white truncate max-w-[200px] sm:max-w-[300px]">
                  {selectedClient ? selectedClient.clientName : "No Client Selected"}
                </span>
              </div>

              {/* Modal Close Button */}
              <button
                onClick={closeProductModal}
                className="text-gray-300 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors ml-auto sm:ml-0"
                title="Close modal (Esc)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* MODAL BODY split container (Side Added Items list + Main Product Entry Form) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* SIDE PANEL: ALREADY ADDED ITEMS IN BILL */}
                <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[520px]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Items in Bill
                    </h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {billItems.length} {billItems.length === 1 ? "item" : "items"}
                    </span>
                  </div>

                  {/* Search Input at Top of Added Items List */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder="Search added items..."
                      className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                      value={addedItemsSearchTerm}
                      onChange={(e) => setAddedItemsSearchTerm(e.target.value)}
                    />
                    <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {addedItemsSearchTerm && (
                      <button
                        onClick={() => setAddedItemsSearchTerm("")}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Scrollable list of ALREADY ADDED bill items */}
                  <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100 bg-slate-50/50 p-1 space-y-1.5">
                    {filteredAddedBillItems.length > 0 ? (
                      filteredAddedBillItems.map((item) => {
                        // Find the original index in billItems array for editing/removal
                        const actualIndex = billItems.findIndex((bItem) => bItem.id === item.id)
                        const isBeingEdited = editingItemIndex === actualIndex

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl transition-all border ${isBeingEdited
                                ? "bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-400/30"
                                : "bg-white border-gray-200/80 hover:border-blue-200 hover:shadow-sm"
                              }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-gray-400">#{actualIndex + 1}</span>
                                <span className="font-bold text-xs text-gray-900 truncate max-w-[150px] sm:max-w-[180px]">
                                  {item.productName}
                                </span>
                              </div>
                              <span className="text-xs font-extrabold text-blue-700">
                                PKR {item.total.toFixed(2)}
                              </span>
                            </div>

                            {(item.companyName || item.containerSize) && (
                              <div className="text-[11px] text-gray-500 font-medium mt-1 flex flex-wrap items-center gap-1">
                                {item.companyName && <span>🏢 {item.companyName}</span>}
                                {item.companyName && item.containerSize && <span>•</span>}
                                {item.containerSize && <span>📦 {item.containerSize}</span>}
                              </div>
                            )}

                            <div className="text-[11px] text-gray-600 mt-1 flex items-center justify-between">
                              <span>Qty: <strong>{item.quantity}</strong> @ PKR {item.rate.toFixed(2)}</span>
                              {(item.discount > 0 || item.extraDiscount > 0) && (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  Disc: {item.discount}% {item.extraDiscount ? `+ ${item.extraDiscount}%` : ""}
                                </span>
                              )}
                            </div>

                            {/* Bonus items sub-list inside side card */}
                            {item.bonusItems?.length > 0 && (
                              <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-200 space-y-1">
                                {item.bonusItems.map((bItem, bIdx) => (
                                  <div key={bIdx} className="text-[10px] font-semibold text-emerald-800 flex items-center justify-between bg-emerald-50/70 p-1 rounded">
                                    <div className="truncate flex items-center gap-1">
                                      <span>🎁 {bItem.productName}</span>
                                      {bItem.companyName && <span className="text-gray-500 font-normal">({bItem.companyName})</span>}
                                    </div>
                                    <span>Qty: {bItem.quantity} (FREE)</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Action buttons inside side card */}
                            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => editItemFromBill(actualIndex)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 ${isBeingEdited
                                    ? "bg-blue-600 text-white"
                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  }`}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                {isBeingEdited ? "Editing" : "Edit"}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItemFromBill(actualIndex)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Remove
                              </button>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-8 text-center text-xs text-gray-400">
                        {billItems.length === 0
                          ? "No products added to bill yet. Use the form on the right to add products!"
                          : `No added items match "${addedItemsSearchTerm}"`}
                      </div>
                    )}
                  </div>
                </div>

                {/* MAIN FORM PANEL */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {editingItemIndex !== null ? `Edit Item #${editingItemIndex + 1}` : "Add New Product"}
                    </h3>
                    {editingItemIndex !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItemIndex(null)
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
                          setProductSearchTerm("")
                        }}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        + Switch to Add New Item
                      </button>
                    )}
                  </div>

                  {/* MAIN PRODUCT ENTRY FORM */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      {/* Product Search Input Box */}
                      <div className="md:col-span-12 lg:col-span-4">
                        <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">
                          Product Name *
                        </label>
                        <div className="relative">
                          <div className="flex">
                            <input
                              type="text"
                              placeholder="Type product name to search..."
                              className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all"
                              value={productSearchTerm || ""}
                              onChange={(e) => handleProductSearchChange(e.target.value)}
                              onFocus={handleProductSearchFocus}
                              onKeyDown={handleProductKeyDown}
                              ref={productSearchRef}
                            />
                            {currentItem.productId && (
                              <button
                                onClick={clearProductSelection}
                                className="ml-2 p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
                                title="Clear selection"
                              >
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* Search Dropdown Popup */}
                          {showProductDropdown && productSearchTerm && filteredProducts(productSearchTerm).length > 0 && (
                            <div
                              className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-auto product-dropdown-container divide-y divide-gray-100"
                              ref={productDropdownRef}
                            >
                              {filteredProducts(productSearchTerm).map((product, productIndex) => (
                                <div
                                  key={product._id}
                                  className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors ${productIndex === selectedProductIndex ? "bg-blue-100/80" : ""
                                    }`}
                                  onClick={() => handleProductSelect(product._id)}
                                >
                                  <div className="font-semibold text-gray-900 text-sm">{product.productName}</div>
                                  {(product.companyName || product.containerSize) && (
                                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                      {product.companyName && <span>🏢 {product.companyName}</span>}
                                      {product.containerSize && <span>📦 {product.containerSize}</span>}
                                    </div>
                                  )}
                                  <div className="text-xs font-semibold text-blue-600 mt-1">
                                    PKR {product.productPrice.toFixed(2)}
                                    {product.hasInfiniteQuantity === false && ` (${product.quantity} in stock)`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Selected product detail pill with Company & Container Size */}
                          {currentItem.productId && (
                            <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl">
                              <div className="font-bold text-gray-900 text-xs">{currentItem.productName}</div>
                              {(currentItem.companyName || currentItem.containerSize) && (
                                <div className="text-[11px] text-gray-600 font-medium mt-0.5 flex flex-wrap items-center gap-1.5">
                                  {currentItem.companyName && <span>🏢 {currentItem.companyName}</span>}
                                  {currentItem.companyName && currentItem.containerSize && <span>•</span>}
                                  {currentItem.containerSize && <span>📦 {currentItem.containerSize}</span>}
                                </div>
                              )}
                              <div className="text-xs font-bold text-blue-700 mt-1">
                                PKR {currentItem.rate.toFixed(2)}
                                {currentItem.hasInfiniteQuantity === false && ` (Available: ${currentItem.availableQuantity})`}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-6 lg:col-span-2">
                        <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">
                          Quantity
                        </label>
                        <input
                          id="item-quantity"
                          type="number"
                          value={currentItem.quantity}
                          onChange={(e) => handleInputChange("quantity", e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold transition-all"
                          min="1"
                        />
                        {currentItem.productId && currentItem.hasInfiniteQuantity === false && (
                          <div className="text-[11px] text-gray-500 mt-1">Max: {currentItem.availableQuantity}</div>
                        )}
                      </div>

                      {/* Rate */}
                      <div className="md:col-span-6 lg:col-span-2">
                        <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">
                          Rate (PKR)
                        </label>
                        <input
                          type="number"
                          value={currentItem.rate}
                          onChange={(e) => handleInputChange("rate", e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold transition-all"
                          step="0.01"
                          min="0"
                        />
                      </div>

                      {/* Discount % */}
                      <div className="md:col-span-6 lg:col-span-2">
                        <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">
                          Disc %
                        </label>
                        <input
                          type="number"
                          value={currentItem.discount}
                          onChange={(e) => handleInputChange("discount", e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold transition-all"
                          min="0"
                          max="100"
                        />
                      </div>

                      {/* Extra Discount % */}
                      <div className="md:col-span-6 lg:col-span-2">
                        <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1.5">
                          Extra Disc %
                        </label>
                        <input
                          type="number"
                          value={currentItem.extraDiscount}
                          onChange={(e) => handleInputChange("extraDiscount", e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold transition-all"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>

                    {/* Subtotal Preview & Main Add Button */}
                    <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div>
                        <span className="text-xs uppercase font-bold text-gray-400">Calculated Item Total</span>
                        <div className="text-xl font-extrabold text-blue-700">
                          PKR {currentItem.total.toFixed(2)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={addCurrentItemToBill}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {editingItemIndex !== null ? "Update Product in Bill" : "Add Product to Bill"}
                      </button>
                    </div>
                  </div>

                  {/* BONUS ITEMS SECTION WITH COMPANY NAME DISPLAY */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        Bonus Items (Optional)
                      </h4>
                      <button
                        type="button"
                        onClick={addBonusItem}
                        className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors border border-emerald-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Bonus Item
                      </button>
                    </div>

                    {currentItem.bonusItems && currentItem.bonusItems.length > 0 && (
                      <div className="space-y-3">
                        {currentItem.bonusItems.map((bonusItem, bonusIndex) => {
                          const bonusKey = `${bonusIndex}`
                          return (
                            <div
                              key={bonusItem.id}
                              className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                            >
                              {/* Bonus Product Search Input */}
                              <div className="md:col-span-5">
                                <label className="block text-gray-700 text-xs font-bold mb-1">
                                  Bonus Product & Company
                                </label>
                                <div className="relative">
                                  <div className="flex">
                                    <input
                                      type="text"
                                      placeholder="Search bonus product or company..."
                                      className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                                      value={bonusProductSearchTerms[bonusKey] || ""}
                                      onChange={(e) => handleBonusProductSearchChange(bonusIndex, e.target.value)}
                                      onFocus={() => handleBonusProductSearchFocus(bonusIndex)}
                                      onKeyDown={(e) => handleBonusProductKeyDown(e, bonusIndex)}
                                      ref={(el) => (bonusProductSearchRefs.current[bonusKey] = el)}
                                    />
                                    {bonusItem.productId && (
                                      <button
                                        onClick={() => clearBonusProductSelection(bonusIndex)}
                                        className="ml-1 p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                                        title="Clear bonus selection"
                                      >
                                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                          <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </button>
                                    )}
                                  </div>

                                  {/* Bonus Product Search Dropdown Popup */}
                                  {showBonusProductDropdowns[bonusKey] &&
                                    bonusProductSearchTerms[bonusKey] &&
                                    filteredProducts(bonusProductSearchTerms[bonusKey]).length > 0 && (
                                      <div
                                        className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-auto bonus-product-dropdown-container divide-y divide-gray-100"
                                        ref={(el) => (bonusProductDropdownRefs.current[bonusKey] = el)}
                                      >
                                        {filteredProducts(bonusProductSearchTerms[bonusKey]).map((product, productIndex) => (
                                          <div
                                            key={product._id}
                                            className={`p-2 hover:bg-emerald-50 cursor-pointer text-xs ${productIndex === selectedBonusProductIndex[bonusKey] ? "bg-emerald-100" : ""
                                              }`}
                                            onClick={() => handleBonusProductSelect(bonusIndex, product._id)}
                                          >
                                            <div className="font-semibold text-gray-900">{product.productName}</div>
                                            {(product.companyName || product.containerSize) && (
                                              <div className="text-[11px] text-gray-500 mt-0.5">
                                                {product.companyName && <span>🏢 {product.companyName}</span>}
                                                {product.containerSize && <span> • 📦 {product.containerSize}</span>}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                  {/* Selected bonus item preview pill showing Company & Container Size */}
                                  {bonusItem.productId && (
                                    <div className="mt-1.5 p-2 bg-emerald-100/70 rounded-lg border border-emerald-200">
                                      <div className="font-bold text-xs text-emerald-950">{bonusItem.productName}</div>
                                      {(bonusItem.companyName || bonusItem.containerSize) && (
                                        <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex flex-wrap items-center gap-1.5">
                                          {bonusItem.companyName && <span>🏢 {bonusItem.companyName}</span>}
                                          {bonusItem.companyName && bonusItem.containerSize && <span>•</span>}
                                          {bonusItem.containerSize && <span>📦 {bonusItem.containerSize}</span>}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="md:col-span-3">
                                <label className="block text-gray-700 text-xs font-bold mb-1">Bonus Qty</label>
                                <input
                                  id={`bonus-quantity-${bonusIndex}`}
                                  type="number"
                                  value={bonusItem.quantity}
                                  onChange={(e) => handleBonusInputChange(bonusIndex, "quantity", e.target.value)}
                                  className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold"
                                  min="1"
                                />
                              </div>

                              <div className="md:col-span-3">
                                <label className="block text-gray-700 text-xs font-bold mb-1">Price Tag</label>
                                <div className="p-2 bg-emerald-100/80 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 text-center">
                                  FREE (Bonus)
                                </div>
                              </div>

                              <div className="md:col-span-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeBonusItem(bonusIndex)}
                                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                                  title="Remove bonus item"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* KEYBOARD SHORTCUTS INFO FOOTER */}
              <div className="mt-6 p-3.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-gray-600 flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-3">
                  <span>
                    <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[11px] font-semibold">Ctrl + Enter</kbd> Add item
                  </span>
                  <span>
                    <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[11px] font-semibold">Ctrl + B</kbd> Bonus item
                  </span>
                  <span>
                    <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[11px] font-semibold">Esc</kbd> Close modal
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="text-gray-500 hover:text-gray-800 font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BillGeneration
