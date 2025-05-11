"use client"

import { useState, useRef, useEffect } from "react"

const SearchBar = ({ placeholder, items, displayProperty, onSelect, className = "", initialValue = "" }) => {
  const [searchTerm, setSearchTerm] = useState(initialValue)
  const [filteredItems, setFilteredItems] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Filter items based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems([])
      return
    }

    const filtered = items.filter((item) => item[displayProperty].toLowerCase().includes(searchTerm.toLowerCase()))
    setFilteredItems(filtered.slice(0, 10)) // Limit to 10 results for performance
  }, [searchTerm, items, displayProperty])

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
    setSearchTerm(value)
    setShowDropdown(true)
    setSelectedIndex(-1)
  }

  const handleItemClick = (item) => {
    onSelect(item)
    setSearchTerm(item[displayProperty])
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
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
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowDropdown(searchTerm.trim() !== "")}
        placeholder={placeholder}
        className="w-full p-2 border border-gray-300 rounded-md"
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
