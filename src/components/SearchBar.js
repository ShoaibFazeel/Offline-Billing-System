"use client"

import { useState, useRef, useEffect } from "react"

const SearchBar = ({
  placeholder,
  items = [],
  displayProperty,
  onSelect,
  className = "",
  inputClassName = "w-full p-2 border border-gray-300 rounded-md",
  initialValue = "",
  searchTerm,
  setSearchTerm,
}) => {
  // If searchTerm and setSearchTerm are provided, use them; otherwise, manage state internally
  const isExternalState = searchTerm !== undefined && setSearchTerm !== undefined
  const [internalSearchTerm, setInternalSearchTerm] = useState(initialValue)
  const [filteredItems, setFilteredItems] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Use the appropriate search term based on whether external state is provided
  const currentSearchTerm = isExternalState ? searchTerm : internalSearchTerm

  // Filter items based on search term
  useEffect(() => {
    if (!currentSearchTerm.trim() || !items || items.length === 0) {
      setFilteredItems([])
      return
    }

    const filtered = items.filter(
      (item) => item[displayProperty] && item[displayProperty].toLowerCase().includes(currentSearchTerm.toLowerCase()),
    )
    setFilteredItems(filtered.slice(0, 10)) // Limit to 10 results for performance
  }, [currentSearchTerm, items, displayProperty])

  // Scroll selected item into view if needed
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" })
      }
    }
  }, [selectedIndex])

  const handleInputChange = (e) => {
    const value = e.target.value
    if (isExternalState) {
      setSearchTerm(value)
    } else {
      setInternalSearchTerm(value)
    }
    setShowDropdown(value.trim() !== "")
    setSelectedIndex(-1)
  }

  const handleItemClick = (item) => {
    if (onSelect) {
      onSelect(item)
    }

    if (isExternalState) {
      setSearchTerm(item[displayProperty])
    } else {
      setInternalSearchTerm(item[displayProperty])
    }

    setShowDropdown(false)
    setSelectedIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (!showDropdown || filteredItems.length === 0) return

    // Arrow down
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : prev))
    }
    // Arrow up
    else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    }
    // Enter
    else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault()
      handleItemClick(filteredItems[selectedIndex])
    }
    // Escape
    else if (e.key === "Escape") {
      setShowDropdown(false)
    }
  }

  useEffect(() => {
    if (!isExternalState) {
      setInternalSearchTerm(initialValue)
    }
  }, [initialValue, isExternalState])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideInput = inputRef.current && inputRef.current.contains(event.target)
      const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target)

      if (!isInsideInput && !isInsideDropdown) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={currentSearchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowDropdown(currentSearchTerm.trim() !== "")}
        placeholder={placeholder}
        className={inputClassName}
        autoComplete="off"
      />

      {showDropdown && filteredItems.length > 0 && (
        <ul
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredItems.map((item, index) => (
            <li
              key={item._id || index}
              onClick={() => handleItemClick(item)}
              className={`p-2 hover:bg-gray-100 cursor-pointer ${index === selectedIndex ? "bg-blue-100" : ""}`}
            >
              <div className="font-medium">{item[displayProperty]}</div>
              {item.clientNumber && <div className="text-sm text-gray-500">{item.clientNumber}</div>}
              {item.phoneNumber && <div className="text-sm text-gray-500">{item.phoneNumber}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SearchBar
