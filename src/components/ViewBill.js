"use client"

import { Fragment, useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import configService from "../services/ConfigService"
import dataService from "../services/DataService"
import storageService from "../services/StorageService"
import PdfGenerator from "./PdfGenerator"

// Helper function to generate a unique ID
function generateUniqueId() {
  return `item_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
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

  // Search terms for edit mode entity pickers
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [fieldOfficerSearchTerm, setFieldOfficerSearchTerm] = useState("")
  const [salesmanSearchTerm, setSalesmanSearchTerm] = useState("")

  const [originalItems, setOriginalItems] = useState([])
  const [showDiscountAsAmount, setShowDiscountAsAmount] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Modal & Side List State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [addedItemsSearchTerm, setAddedItemsSearchTerm] = useState("")

  // Current item state inside modal
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

  // Modal Product Search & Dropdown states
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [bonusProductSearchTerms, setBonusProductSearchTerms] = useState({})
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [showBonusProductDropdowns, setShowBonusProductDropdowns] = useState({})
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1)
  const [selectedBonusProductIndex, setSelectedBonusProductIndex] = useState({})

  // Dropdown index states
  const [selectedClientIndex, setSelectedClientIndex] = useState(-1)
  const [selectedFieldOfficerIndex, setSelectedFieldOfficerIndex] = useState(-1)
  const [selectedSalesmanIndex, setSelectedSalesmanIndex] = useState(-1)

  // Refs
  const clientSearchRef = useRef(null)
  const fieldOfficerSearchRef = useRef(null)
  const salesmanSearchRef = useRef(null)
  const productSearchRef = useRef(null)
  const bonusProductSearchRefs = useRef({})
  const clientDropdownRef = useRef(null)
  const fieldOfficerDropdownRef = useRef(null)
  const salesmanDropdownRef = useRef(null)
  const productDropdownRef = useRef(null)
  const bonusProductDropdownRefs = useRef({})

  useEffect(() => {
    fetchBill()
    fetchClients()
    fetchProducts()
    fetchFieldOfficers()
    fetchSalesmen()
  }, [id])

  // Helper to group flat items (from DB) into primary items with nested bonusItems
  const groupBillItems = (items) => {
    if (!items || items.length === 0) return []
    const grouped = []
    let currentGroup = null

    items.forEach((item) => {
      // If item already has bonusItems array populated
      if (item.bonusItems && Array.isArray(item.bonusItems) && item.bonusItems.length > 0) {
        grouped.push({
          ...item,
          id: item._id || item.id || generateUniqueId(),
          bonusItems: item.bonusItems.map((b) => ({
            ...b,
            id: b._id || b.id || generateUniqueId(),
          })),
        })
      } else if (!item.isBonus) {
        currentGroup = {
          ...item,
          id: item._id || item.id || generateUniqueId(),
          bonusItems: [],
        }
        grouped.push(currentGroup)
      } else {
        // Flat bonus item belonging to previous primary item
        if (currentGroup) {
          currentGroup.bonusItems.push({
            ...item,
            id: item._id || item.id || generateUniqueId(),
          })
        } else {
          grouped.push({
            ...item,
            id: item._id || item.id || generateUniqueId(),
            bonusItems: [],
          })
        }
      }
    })
    return grouped
  }

  // Helper to flatten grouped items for database update
  const flattenBillItems = (items) => {
    const flat = []
    items.forEach((item) => {
      if (item.productId) {
        flat.push({
          _id: item._id || item.id || generateUniqueId(),
          productId: item.productId,
          productName: item.productName,
          companyName: item.companyName || "",
          containerSize: item.containerSize || "",
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount,
          extraDiscount: item.extraDiscount || 0,
          total: item.total,
          isBonus: false,
        })
      }

      if (item.bonusItems && item.bonusItems.length > 0) {
        item.bonusItems.forEach((bItem) => {
          if (bItem.productId) {
            flat.push({
              _id: bItem._id || bItem.id || generateUniqueId(),
              productId: bItem.productId,
              productName: bItem.productName,
              companyName: bItem.companyName || "",
              containerSize: bItem.containerSize || "",
              quantity: bItem.quantity,
              rate: bItem.rate,
              discount: bItem.discount || 0,
              extraDiscount: 0,
              total: 0,
              isBonus: true,
            })
          }
        })
      }
    })
    return flat
  }

  const fetchBill = async () => {
    try {
      const data = await window.api.getBill(id)
      setBill(data)
      const groupedItems = groupBillItems(data.items || [])
      setEditedBill({
        ...JSON.parse(JSON.stringify(data)),
        items: groupedItems,
      })
      setOriginalItems(JSON.parse(JSON.stringify(data.items || [])))
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

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(event.target) &&
        clientSearchRef.current &&
        !clientSearchRef.current.contains(event.target)
      ) {
        setClientSearchTerm("")
      }

      if (
        fieldOfficerDropdownRef.current &&
        !fieldOfficerDropdownRef.current.contains(event.target) &&
        fieldOfficerSearchRef.current &&
        !fieldOfficerSearchRef.current.contains(event.target)
      ) {
        setFieldOfficerSearchTerm("")
      }

      if (
        salesmanDropdownRef.current &&
        !salesmanDropdownRef.current.contains(event.target) &&
        salesmanSearchRef.current &&
        !salesmanSearchRef.current.contains(event.target)
      ) {
        setSalesmanSearchTerm("")
      }

      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target) &&
        productSearchRef.current &&
        !productSearchRef.current.contains(event.target)
      ) {
        setShowProductDropdown(false)
      }

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

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isProductModalOpen) {
        e.preventDefault()
        closeProductModal()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (isProductModalOpen && currentItem.productId) {
          e.preventDefault()
          addCurrentItemToBill()
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) {
        if (isProductModalOpen) {
          e.preventDefault()
          if (currentItem.productId) {
            addBonusItem()
          } else {
            toast.error("Please select a product first before adding a bonus item")
          }
        }
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        if (isEditing) {
          e.preventDefault()
          saveBill()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [currentItem, editedBill, isProductModalOpen, editingItemIndex, isEditing])

  // Focus product search on modal open
  useEffect(() => {
    if (isProductModalOpen) {
      setTimeout(() => {
        if (productSearchRef.current) {
          productSearchRef.current.focus()
        }
      }, 150)
    }
  }, [isProductModalOpen])

  const handleClientSelect = (client) => {
    setEditedBill({
      ...editedBill,
      clientId: client._id,
      clientName: client.clientName,
      clientAddress: client.clientAddress,
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

  const handleDateChange = (e) => {
    setEditedBill({
      ...editedBill,
      billDate: new Date(`${e.target.value}T00:00:00`),
    })
  }

  // Product Selection inside Modal
  const handleProductSelect = async (productId) => {
    const product = products.find((p) => p._id === productId)
    if (!product) return

    let rate = product.productPrice
    let discount = 0
    let extraDiscount = 0

    if (editedBill?.clientId) {
      try {
        const clientProduct = await window.api.getClientProduct(editedBill.clientId, productId)
        if (clientProduct) {
          rate = clientProduct.rate
          discount = clientProduct.discount
          extraDiscount = clientProduct.extraDiscount || 0
        }
      } catch (error) {
        console.error("Error fetching client-product history:", error)
      }
    }

    const calculatedTotal = currentItem.isBonus
      ? 0
      : calculateItemTotal(currentItem.quantity, rate, discount, extraDiscount)

    setCurrentItem({
      ...currentItem,
      productId,
      productName: product.productName,
      companyName: product.companyName || "",
      containerSize: product.containerSize || "",
      rate,
      discount,
      extraDiscount,
      total: calculatedTotal,
      availableQuantity: product.hasInfiniteQuantity !== false ? Number.POSITIVE_INFINITY : product.quantity,
      hasInfiniteQuantity: product.hasInfiniteQuantity !== false,
    })

    setProductSearchTerm("")
    setShowProductDropdown(false)

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

    if (field === "quantity" && !currentItem.hasInfiniteQuantity && value > currentItem.availableQuantity) {
      toast.error(`Only ${currentItem.availableQuantity} units of ${currentItem.productName} are available`)
      value = currentItem.availableQuantity
    }

    const updatedItem = {
      ...currentItem,
      [field]: value,
    }

    if (field === "quantity" || field === "rate" || field === "discount" || field === "extraDiscount") {
      updatedItem.total = updatedItem.isBonus
        ? 0
        : calculateItemTotal(
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

    if (field === "quantity" && bonusItem.hasInfiniteQuantity === false && value > bonusItem.availableQuantity) {
      toast.error(`Only ${bonusItem.availableQuantity} units of ${bonusItem.productName} are available`)
      value = bonusItem.availableQuantity
    }

    updatedBonusItems[bonusIndex] = {
      ...updatedBonusItems[bonusIndex],
      [field]: value,
    }

    updatedBonusItems[bonusIndex].total = 0

    setCurrentItem({
      ...currentItem,
      bonusItems: updatedBonusItems,
    })
  }

  const calculateItemTotal = (quantity, rate, discount, extraDiscount = 0) => {
    const afterDiscount = quantity * rate * (1 - discount / 100)
    const finalTotal = afterDiscount * (1 - extraDiscount / 100)
    return Math.round(finalTotal * 100) / 100
  }

  const calculateBillTotal = (items) => {
    const total = items.reduce((sum, item) => {
      if (!item.isBonus && item.total !== undefined && item.total !== null && !isNaN(item.total)) {
        return sum + item.total
      }
      return sum
    }, 0)
    return Math.round(total * 100) / 100
  }

  const openAddProductModal = () => {
    if (!editedBill?.clientId) {
      toast.error("Please select a client first")
    }
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
      total: currentItem.isBonus
        ? 0
        : calculateItemTotal(currentItem.quantity, currentItem.rate, currentItem.discount, currentItem.extraDiscount),
    }

    const currentBillItems = editedBill.items || []

    if (editingItemIndex !== null) {
      const updatedList = [...currentBillItems]
      updatedList[editingItemIndex] = itemToAdd
      const updatedTotal = calculateBillTotal(updatedList)
      setEditedBill({
        ...editedBill,
        items: updatedList,
        totalAmount: updatedTotal,
      })
      toast.success("Item updated in bill")
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
    } else {
      const updatedList = [...currentBillItems, itemToAdd]
      const updatedTotal = calculateBillTotal(updatedList)
      setEditedBill({
        ...editedBill,
        items: updatedList,
        totalAmount: updatedTotal,
      })
      toast.success(`${itemToAdd.productName} added to bill`)

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

      setTimeout(() => {
        if (productSearchRef.current) {
          productSearchRef.current.focus()
        }
      }, 100)
    }
  }

  const removeItemFromBill = (index) => {
    const updatedItems = editedBill.items.filter((_, i) => i !== index)
    const updatedTotal = calculateBillTotal(updatedItems)
    setEditedBill({
      ...editedBill,
      items: updatedItems,
      totalAmount: updatedTotal,
    })
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
    const targetItem = editedBill.items[index]
    setCurrentItem({
      ...JSON.parse(JSON.stringify(targetItem)),
      bonusItems: targetItem.bonusItems ? JSON.parse(JSON.stringify(targetItem.bonusItems)) : [],
    })
    setEditingItemIndex(index)
    setProductSearchTerm("")
    setIsProductModalOpen(true)
  }

  const addBonusItem = () => {
    const updatedBonusItems = [
      ...(currentItem.bonusItems || []),
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
      const bonusKey = updatedBonusItems.length - 1
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
      total: 0,
      isBonus: true,
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

  const filteredAddedBillItems = addedItemsSearchTerm
    ? (editedBill?.items || []).filter(
        (item) =>
          item.productName.toLowerCase().includes(addedItemsSearchTerm.toLowerCase()) ||
          (item.companyName && item.companyName.toLowerCase().includes(addedItemsSearchTerm.toLowerCase())) ||
          (item.bonusItems && item.bonusItems.some((b) => b.productName.toLowerCase().includes(addedItemsSearchTerm.toLowerCase()))),
      )
    : editedBill?.items || []

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

  // Inventory validation for edit mode
  const checkInventoryLevels = (flatItemsToValidate) => {
    const productQuantities = new Map()

    flatItemsToValidate.forEach((item) => {
      if (item.productId && !item.isBonus) {
        const currentQty = productQuantities.get(item.productId) || 0
        productQuantities.set(item.productId, currentQty + item.quantity)
      }
      if (item.isBonus && item.productId) {
        const currentQty = productQuantities.get(item.productId) || 0
        productQuantities.set(item.productId, currentQty + item.quantity)
      }
    })

    originalItems.forEach((item) => {
      if (item.productId) {
        const currentQty = productQuantities.get(item.productId) || 0
        productQuantities.set(item.productId, currentQty - item.quantity)
      }
    })

    let hasInsufficientInventory = false

    productQuantities.forEach((netQuantity, productId) => {
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
    if (!editedBill.clientId) {
      toast.error("Please select a client")
      return
    }

    if (!editedBill.items || editedBill.items.length === 0) {
      toast.error("Please add at least one product to the bill")
      return
    }

    try {
      const flatItems = flattenBillItems(editedBill.items)

      if (!checkInventoryLevels(flatItems)) {
        return
      }

      const billToSave = {
        ...editedBill,
        items: flatItems,
        totalAmount: calculateBillTotal(editedBill.items),
      }

      await window.api.updateBill(billToSave)
      dataService.invalidateCacheOnModification("bills")
      toast.success("Bill updated successfully")
      setIsEditing(false)
      fetchBill()
    } catch (error) {
      console.error("Error updating bill:", error)
      toast.error("Failed to update bill")
    }
  }

  // PDF Generation helpers
  const generatePdfBytes = async () => {
    const client = await window.api.getClient(bill.clientId)
    const fieldOfficer = await window.api.getFieldOfficer(bill.fieldOfficerId)
    const salesman = await window.api.getSalesman(bill.salesmanId)
    const companyInfo = await window.api.getCompanyInfo()

    const pdfGenerator = new PdfGenerator()
    return await pdfGenerator.generateInvoicePdf(bill, client, companyInfo, fieldOfficer, salesman, showDiscountAsAmount, products)
  }

  const generatePDF = async () => {
    try {
      const pdfBytes = await generatePdfBytes()
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

        if (!printWindow) {
          URL.revokeObjectURL(blobUrl)
          toast.error("Popup blocked. Please allow popups to print.")
          return
        }

        const cleanup = () => {
          URL.revokeObjectURL(blobUrl)
          printWindow.onbeforeunload = null
          printWindow.onafterprint = null
        }

        printWindow.onload = () => {
          printWindow.focus()
          printWindow.print()
        }
        printWindow.onafterprint = cleanup
        printWindow.onbeforeunload = cleanup
        toast.success("Print dialog opened")
      }
    } catch (error) {
      console.error("Error printing PDF:", error)
      toast.error("Failed to print PDF")
    }
  }

  const deleteBill = () => {
    setConfirmDelete(true)
  }

  const performDelete = async () => {
    if (!bill) return
    setDeleting(true)
    try {
      await window.api.deleteBill(bill._id)
      toast.success("Bill deleted successfully")
      const sourcePage = storageService.getLocalItem("billSourcePage") || "bills"
      storageService.removeLocalItem("billSourcePage")
      const targetRoute = sourcePage === "dashboard" ? "#/" : sourcePage === "reports" ? "#/reports" : "#/bills"
      window.location.hash = targetRoute
    } catch (error) {
      console.error("Error deleting bill:", error)
      toast.error("Failed to delete bill")
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm font-medium text-gray-600">Loading invoice details...</p>
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold text-gray-800">Bill Not Found</h2>
        <p className="text-sm text-gray-500 mt-1">The requested bill does not exist or was deleted.</p>
        <button onClick={() => navigate("/bills")} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">
          Return to Bill History
        </button>
      </div>
    )
  }

  const calculateExtraDiscountAmount = (item) => {
    const afterRegularDiscount = item.quantity * item.rate * (1 - item.discount / 100)
    return afterRegularDiscount * (item.extraDiscount / 100)
  }

  const fieldOfficer = fieldOfficers.find((o) => String(o._id) === String(bill.fieldOfficerId))
  const salesman = salesmen.find((s) => String(s._id) === String(bill.salesmanId))
  const editedFieldOfficer = fieldOfficers.find((o) => String(o._id) === String(editedBill?.fieldOfficerId))
  const editedSalesman = salesmen.find((s) => String(s._id) === String(editedBill?.salesmanId))
  const editedFieldOfficerName = editedFieldOfficer?.name || editedBill?.fieldOfficerName || "Selected officer"
  const editedFieldOfficerPhone = editedFieldOfficer?.phoneNumber || editedBill?.fieldOfficerPhone
  const editedSalesmanName = editedSalesman?.name || editedBill?.salesmanName || "Selected salesman"
  const editedSalesmanPhone = editedSalesman?.phoneNumber || editedBill?.salesmanPhone
  const activeClient = clients.find((c) => c._id === (isEditing ? editedBill.clientId : bill.clientId))

  const filteredClients = clientSearchTerm
    ? clients.filter(
        (c) => c.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase()) || c.clientNumber.includes(clientSearchTerm),
      )
    : []

  const filteredFieldOfficers = fieldOfficerSearchTerm
    ? fieldOfficers.filter(
        (o) => o.name.toLowerCase().includes(fieldOfficerSearchTerm.toLowerCase()) || o.phoneNumber.includes(fieldOfficerSearchTerm),
      )
    : []

  const filteredSalesmen = salesmanSearchTerm
    ? salesmen.filter(
        (s) => s.name.toLowerCase().includes(salesmanSearchTerm.toLowerCase()) || s.phoneNumber.includes(salesmanSearchTerm),
      )
    : []

  const displayBillTotal = isEditing ? calculateBillTotal(editedBill.items || []) : bill.totalAmount

  return (
    <div className="max-w-7xl mx-auto pb-12 px-2 sm:px-4">
      {/* Top Header Card */}
      <div className="mb-6 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl shadow-xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.preventDefault()
              const sourcePage = storageService.getLocalItem("billSourcePage") || "bills"
              storageService.removeLocalItem("billSourcePage")
              const targetRoute = sourcePage === "dashboard" ? "#/" : sourcePage === "reports" ? "#/reports" : "#/bills"
              window.location.hash = targetRoute
            }}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md border border-white/15 transition-all"
            title="Back to History"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Bill #{bill.billId ? bill.billId : bill._id.substring(0, 8)}
              </h1>
              {isEditing && (
                <span className="px-2.5 py-0.5 bg-amber-400 text-amber-950 font-black text-xs uppercase rounded-full shadow-sm">
                  EDIT MODE
                </span>
              )}
            </div>
            <p className="text-blue-200 text-sm mt-0.5">
              Issued on: {configService.formatDate(bill.billDate)}
            </p>
          </div>
        </div>

        {/* Action Controls & Total Chip */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15">
            <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold">Bill Total:</span>
            <span className="text-lg font-extrabold text-white">
              PKR {displayBillTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setShowDiscountAsAmount(!showDiscountAsAmount)}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-md border border-white/15 transition-all"
                  title="Toggle discount column view"
                >
                  Show Disc as: <strong>{showDiscountAsAmount ? "Amount" : "%"}</strong>
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Bill
                </button>
                <button
                  onClick={generatePDF}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-md transition-all flex items-center gap-1"
                >
                  Download PDF
                </button>
                <button
                  onClick={printPDF}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-md transition-all flex items-center gap-1"
                >
                  Print PDF
                </button>
                {confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={performDelete}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-md"
                    >
                      {deleting ? "Deleting..." : "Confirm Delete"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="bg-gray-200 text-gray-800 font-bold px-2.5 py-2 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={deleteBill}
                    className="bg-red-600/80 hover:bg-red-600 text-white font-bold px-3 py-2 rounded-xl text-xs transition-all"
                  >
                    Delete
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={saveBill}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-lg transition-all flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    fetchBill()
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white font-bold px-4 py-2 rounded-xl text-xs backdrop-blur-md transition-all"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bill Header Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Party / Client Info */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5">
          <label className="block text-gray-800 font-semibold text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Party Information
          </label>
          {isEditing ? (
            <div className="relative">
              <input
                type="text"
                placeholder="Search client by name or phone..."
                className="w-full pl-3 pr-4 py-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
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
                      className={`p-3 hover:bg-blue-50 cursor-pointer text-sm font-medium ${
                        index === selectedClientIndex ? "bg-blue-100/70" : ""
                      }`}
                      onClick={() => handleClientSelect(client)}
                    >
                      <div className="font-semibold text-gray-900">{client.clientName}</div>
                      <div className="text-xs text-gray-500">📞 {client.clientNumber} • {client.clientAddress}</div>
                    </div>
                  ))}
                </div>
              )}
              {editedBill.clientId && (
                <div className="mt-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <div className="font-bold text-gray-900 text-base">{editedBill.clientName}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    <span>Address: {editedBill.clientAddress || "N/A"}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="font-bold text-gray-900 text-base">{bill.clientName}</div>
              {activeClient && (
                <div className="text-xs text-gray-600 mt-1.5 space-y-1">
                  <div>📞 <strong>Phone:</strong> {activeClient.clientNumber}</div>
                  <div>📍 <strong>Address:</strong> {activeClient.clientAddress}</div>
                  <div>
                    <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 ${
                      activeClient.isFiler ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {activeClient.isFiler ? `Filer (NTN: ${activeClient.ntnNumber})` : "Non-Filer"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date & Officer / Salesman Info */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 space-y-4">
          <div>
            <label className="block text-gray-800 font-semibold text-sm mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Invoice Date
            </label>
            {isEditing ? (
              <input
                type="date"
                value={configService.formatIsoDate(editedBill.billDate)}
                onChange={handleDateChange}
                className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold text-gray-800">
                {configService.formatDate(bill.billDate)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field Officer Picker/Display */}
            <div>
              <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1">Field Officer</label>
              {isEditing ? (
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search officer..."
                      className="w-full p-2 bg-slate-50 border border-gray-300 rounded-xl text-xs"
                      value={fieldOfficerSearchTerm}
                      onChange={(e) => setFieldOfficerSearchTerm(e.target.value)}
                      onKeyDown={handleFieldOfficerKeyDown}
                      ref={fieldOfficerSearchRef}
                    />
                    {fieldOfficerSearchTerm && filteredFieldOfficers.length > 0 && (
                      <div
                        className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-auto field-officer-dropdown-container divide-y divide-gray-100 text-xs"
                        ref={fieldOfficerDropdownRef}
                      >
                        {filteredFieldOfficers.map((officer, index) => (
                          <div
                            key={officer._id}
                            className={`p-2 hover:bg-indigo-50 cursor-pointer ${
                              index === selectedFieldOfficerIndex ? "bg-indigo-100" : ""
                            }`}
                            onClick={() => handleFieldOfficerSelect(officer)}
                          >
                            <div className="font-semibold text-gray-900">{officer.name}</div>
                            <div className="text-gray-500">{officer.phoneNumber}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {(editedBill.fieldOfficerId || editedBill.fieldOfficerName) && (
                    <div className="mt-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                      <div className="font-bold text-gray-900 text-sm">
                        {editedFieldOfficerName}
                      </div>
                      {editedFieldOfficerPhone && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          📞 {editedFieldOfficerPhone}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-gray-800">
                  {fieldOfficer?.name || bill.fieldOfficerName || "Not specified"}
                </div>
              )}
            </div>

            {/* Salesman Picker/Display */}
            <div>
              <label className="block text-gray-700 text-xs font-bold uppercase tracking-wider mb-1">Salesman</label>
              {isEditing ? (
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search salesman..."
                      className="w-full p-2 bg-slate-50 border border-gray-300 rounded-xl text-xs"
                      value={salesmanSearchTerm}
                      onChange={(e) => setSalesmanSearchTerm(e.target.value)}
                      onKeyDown={handleSalesmanKeyDown}
                      ref={salesmanSearchRef}
                    />
                    {salesmanSearchTerm && filteredSalesmen.length > 0 && (
                      <div
                        className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-auto salesman-dropdown-container divide-y divide-gray-100 text-xs"
                        ref={salesmanDropdownRef}
                      >
                        {filteredSalesmen.map((salesman, index) => (
                          <div
                            key={salesman._id}
                            className={`p-2 hover:bg-emerald-50 cursor-pointer ${
                              index === selectedSalesmanIndex ? "bg-emerald-100" : ""
                            }`}
                            onClick={() => handleSalesmanSelect(salesman)}
                          >
                            <div className="font-semibold text-gray-900">{salesman.name}</div>
                            <div className="text-gray-500">{salesman.phoneNumber}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {(editedBill.salesmanId || editedBill.salesmanName) && (
                    <div className="mt-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                      <div className="font-bold text-gray-900 text-sm">
                        {editedSalesmanName}
                      </div>
                      {editedSalesmanPhone && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          📞 {editedSalesmanPhone}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-gray-800">
                  {salesman?.name || bill.salesmanName || "Not specified"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bill Items Section Container */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Products in Bill</h2>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
              {(isEditing ? editedBill.items : bill.items).length} { (isEditing ? editedBill.items : bill.items).length === 1 ? "product" : "products" }
            </span>
          </div>

          {/* Action button in edit mode to trigger product modal */}
          {isEditing && (
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
          )}
        </div>

        {/* Table of Bill Items */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">S#</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {!isEditing && showDiscountAsAmount ? "Disc Amt" : "Disc %"}
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {!isEditing && showDiscountAsAmount ? "Extra Disc Amt" : "Extra Disc %"}
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                {isEditing && (
                  <th className="px-4 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(isEditing ? editedBill.items : bill.items).map((item, index) => {
                const productInfo = products.find((p) => p._id === item.productId)
                const compName = item.companyName || productInfo?.companyName
                const contSize = item.containerSize || productInfo?.containerSize
                const isBonusItem = item.isBonus === true

                return (
                  <Fragment key={item._id || item.id || index}>
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
                        {(compName || contSize) && (
                          <div className={`text-xs font-normal mt-0.5 flex items-center gap-1.5 ${isBonusItem ? "text-emerald-700" : "text-gray-500"}`}>
                            {compName && <span>🏢 {compName}</span>}
                            {compName && contSize && <span>•</span>}
                            {contSize && <span>📦 {contSize}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">PKR {item.rate.toFixed(2)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {isBonusItem ? "-" : (!isEditing && showDiscountAsAmount
                          ? `PKR ${((item.rate * item.quantity * item.discount) / 100).toFixed(2)}`
                          : `${item.discount}%`)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {isBonusItem ? "-" : (!isEditing && showDiscountAsAmount
                          ? `PKR ${calculateExtraDiscountAmount(item).toFixed(2)}`
                          : `${item.extraDiscount || 0}%`)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold">
                        {isBonusItem ? (
                          <span className="px-2.5 py-1 text-xs font-extrabold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                            FREE (Bonus)
                          </span>
                        ) : (
                          <span className="text-blue-700">PKR {item.total.toFixed(2)}</span>
                        )}
                      </td>
                      {isEditing && (
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
                      )}
                    </tr>

                    {/* Bonus Items Sub Rows */}
                    {item.bonusItems?.length > 0 &&
                      item.bonusItems.map((bonusItem, bonusIndex) => (
                        <tr key={`${item._id || item.id || index}-bonus-${bonusIndex}`} className="bg-emerald-50/50">
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
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">PKR {bonusItem.rate ? bonusItem.rate.toFixed(2) : "0.00"}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{bonusItem.discount || 0}%</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">-</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-emerald-700">
                            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                              FREE
                            </span>
                          </td>
                          {isEditing && <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-400 font-medium">-</td>}
                        </tr>
                      ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={openAddProductModal}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Another Item
              </button>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs uppercase font-bold text-gray-400">Invoice Total</span>
            <div className="text-2xl font-black text-gray-900">
              PKR {displayBillTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
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
                  PKR {displayBillTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Right/Middle: Immutable Client Name Banner */}
              <div className="flex items-center gap-2 bg-white/10 border border-white/15 px-3.5 py-1.5 rounded-xl shadow-inner">
                <svg className="w-4 h-4 text-blue-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Client:</span>
                <span className="text-sm font-extrabold text-white truncate max-w-[200px] sm:max-w-[300px]">
                  {editedBill?.clientName || "No Client Selected"}
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

                {/* SIDE PANEL: ALREADY ADDED ITEMS IN BILL (WITH NESTED BONUS ITEMS IN SAME BLOCK) */}
                <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[540px]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Items in Bill
                    </h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {(editedBill?.items || []).length} {(editedBill?.items || []).length === 1 ? "item" : "items"}
                    </span>
                  </div>

                  {/* Search Input at Top of Added Items List */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder="Search added items..."
                      className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 font-medium"
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
                        const actualIndex = editedBill.items.findIndex((bItem) => (bItem._id && bItem._id === item._id) || (bItem.id && bItem.id === item.id))
                        const isBeingEdited = editingItemIndex === actualIndex

                        return (
                          <div
                            key={item._id || item.id || actualIndex}
                            className={`p-3 rounded-xl transition-all border ${
                              isBeingEdited
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

                            {/* Bonus items sub-list inside SAME block */}
                            {item.bonusItems?.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-dashed border-emerald-200 space-y-1 bg-emerald-50/60 p-2 rounded-lg">
                                {item.bonusItems.map((bItem, bIdx) => (
                                  <div key={bIdx} className="text-[11px] font-semibold text-emerald-900 flex items-center justify-between">
                                    <div className="truncate flex items-center gap-1">
                                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-emerald-200 text-emerald-900 rounded">
                                        BONUS
                                      </span>
                                      <span>🎁 {bItem.productName}</span>
                                      {bItem.companyName && <span className="text-emerald-700 font-normal">({bItem.companyName})</span>}
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-800">Qty: {bItem.quantity} (FREE)</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Action buttons inside side card */}
                            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => editItemFromBill(actualIndex)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 ${
                                  isBeingEdited
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
                        {editedBill.items.length === 0
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
                              className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
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
                                  className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors ${
                                    productIndex === selectedProductIndex ? "bg-blue-100/80" : ""
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

                          {/* Selected product detail pill */}
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
                          className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-semibold transition-all"
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
                          className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-semibold transition-all"
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
                          className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-semibold transition-all"
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
                          className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-semibold transition-all"
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
                        {editingItemIndex !== null ? "Update Item in Bill" : "Add Item to Bill"}
                      </button>
                    </div>
                  </div>

                  {/* BONUS ITEMS SECTION AT BOTTOM OF FORM */}
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
                              key={bonusItem.id || bonusIndex}
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
                                      placeholder="Search bonus product..."
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

                                  {/* Bonus Dropdown Popup */}
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
                                            className={`p-2 hover:bg-emerald-50 cursor-pointer text-xs ${
                                              productIndex === selectedBonusProductIndex[bonusKey] ? "bg-emerald-100" : ""
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

export default ViewBill
