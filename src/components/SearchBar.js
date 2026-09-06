"use client"

import { useState, useRef, useEffect, useMemo } from "react"

const SearchBar = ({
  placeholder = "Select or search...",
  items = [],
  displayProperty = "name",
  secondaryProperty = "",
  onSelect,
  className = "",
  inputClassName = "",
  initialValue = "",
  searchTerm,
  setSearchTerm,
  disabled = false,
  iconType = "search", // 'search' | 'address' | 'company' | 'product' | 'user'
  accentColor = "blue", // 'blue' | 'emerald' | 'purple'
}) => {
  const isExternalState = searchTerm !== undefined && setSearchTerm !== undefined
  const [internalSearchTerm, setInternalSearchTerm] = useState(initialValue)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const currentSearchTerm = isExternalState ? searchTerm : internalSearchTerm

  // Filter items: if searchTerm matches an exact item or user is typing
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return []
    const term = (currentSearchTerm || "").trim().toLowerCase()

    if (!term) {
      // Return first 30 items when input is empty so user can browse immediately!
      return items.slice(0, 30)
    }

    const filtered = items.filter((item) => {
      if (!item) return false
      const val = item[displayProperty]
      const secVal = secondaryProperty ? item[secondaryProperty] : ""
      const compVal = item.companyName || ""
      const containerVal = item.containerSize || ""

      const textToSearch = `${val || ""} ${secVal || ""} ${compVal} ${containerVal}`.toLowerCase()
      return textToSearch.includes(term)
    })

    return filtered.slice(0, 30)
  }, [items, currentSearchTerm, displayProperty, secondaryProperty])

  // Scroll selected item into view
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
    setShowDropdown(true)
    setSelectedIndex(-1)

    // If cleared by user typing, notify onSelect(null)
    if (!value.trim() && onSelect) {
      onSelect(null)
    }
  }

  const handleItemClick = (item) => {
    const displayVal = item ? String(item[displayProperty] || "") : ""

    if (isExternalState) {
      setSearchTerm(displayVal)
    } else {
      setInternalSearchTerm(displayVal)
    }

    if (onSelect) {
      onSelect(item)
    }

    setShowDropdown(false)
    setSelectedIndex(-1)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    if (isExternalState) {
      setSearchTerm("")
    } else {
      setInternalSearchTerm("")
    }
    if (onSelect) {
      onSelect(null)
    }
    setShowDropdown(false)
    setSelectedIndex(-1)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const toggleDropdown = () => {
    if (disabled) return
    setShowDropdown((prev) => !prev)
    if (!showDropdown && inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (disabled) return

    if (!showDropdown) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault()
        setShowDropdown(true)
        return
      }
    }

    if (filteredItems.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1))
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault()
      handleItemClick(filteredItems[selectedIndex])
    } else if (e.key === "Escape") {
      setShowDropdown(false)
    }
  }

  useEffect(() => {
    if (!isExternalState) {
      setInternalSearchTerm(initialValue)
    }
  }, [initialValue, isExternalState])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Icon rendering helper
  const renderIcon = () => {
    if (iconType === "address") {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
    if (iconType === "company") {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }
    if (iconType === "product") {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    }
    if (iconType === "user") {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
  }

  // Accent ring classes
  const ringFocusClass =
    accentColor === "emerald"
      ? "focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      : accentColor === "purple"
      ? "focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
      : "focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

  const activeItemBg =
    accentColor === "emerald"
      ? "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 pl-2.5"
      : accentColor === "purple"
      ? "bg-purple-50 text-purple-800 border-l-4 border-purple-600 pl-2.5"
      : "bg-blue-50 text-blue-800 border-l-4 border-blue-600 pl-2.5"

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        {/* Left Icon */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center w-4 h-4">
          {renderIcon()}
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          value={currentSearchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onClick={() => {
            if (!disabled) setShowDropdown(true)
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={
            inputClassName ||
            `w-full pl-10 pr-14 h-11 bg-slate-50 border border-gray-300 rounded-xl ${ringFocusClass} text-sm font-medium transition-all text-gray-800 placeholder-gray-400 shadow-sm ${
              disabled ? "opacity-60 cursor-not-allowed bg-slate-100" : "hover:border-gray-400 cursor-pointer"
            }`
          }
          autoComplete="off"
        />

        {/* Action icons on Right: Clear Button & Dropdown Chevron */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
          {!disabled && currentSearchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-slate-200/80 rounded-full transition-colors"
              title="Clear selection"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={toggleDropdown}
            disabled={disabled}
            className={`p-1 text-gray-400 hover:text-gray-600 transition-transform duration-200 ${
              showDropdown ? "rotate-180 text-blue-600" : ""
            }`}
            title="Toggle dropdown list"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dropdown Popup Menu */}
      {showDropdown && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-40 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-72 overflow-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const mainText = item[displayProperty] || ""
              const isCurrentlySelected =
                (currentSearchTerm || "").trim().toLowerCase() === String(mainText).trim().toLowerCase()

              return (
                <div
                  key={item._id || index}
                  onClick={() => handleItemClick(item)}
                  className={`px-3.5 py-2.5 cursor-pointer transition-colors text-sm flex items-center justify-between ${
                    index === selectedIndex
                      ? activeItemBg
                      : isCurrentlySelected
                      ? "bg-slate-100/90 font-semibold text-gray-900"
                      : "text-gray-800 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-semibold text-gray-900 truncate">{mainText}</div>

                    {/* Rich Subtitles */}
                    {(item.companyName || item.containerSize || item.companiesCount !== undefined) && (
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
                        {item.companyName && (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                            🏢 {item.companyName}
                          </span>
                        )}
                        {item.containerSize && (
                          <span className="inline-flex items-center gap-1 text-gray-500">
                            📦 {item.containerSize}
                          </span>
                        )}
                        {item.companiesCount !== undefined && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                            {item.companiesCount} compan{item.companiesCount === 1 ? "y" : "ies"}
                          </span>
                        )}
                      </div>
                    )}

                    {(item.clientNumber || item.phoneNumber) && (
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <span>📞</span> {item.clientNumber || item.phoneNumber}
                      </div>
                    )}

                    {item.clientAddress && item.clientAddress !== mainText && (
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <span>📍</span> {item.clientAddress}
                      </div>
                    )}
                  </div>

                  {isCurrentlySelected && (
                    <div className="text-blue-600 shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="px-4 py-4 text-xs text-gray-500 italic text-center">
              No options match "{currentSearchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar
