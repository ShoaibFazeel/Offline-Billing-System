function importAllData(db, data, { generateId, ensureItemsHaveIds, toIsoDate }) {
  const requiredCollections = ["products", "clients", "bills", "fieldOfficers", "salesmen"]
  if (!data || typeof data !== "object" || requiredCollections.some((key) => !Array.isArray(data[key]))) {
    throw new Error("Backup file is missing one or more required data collections")
  }

  for (const key of [...requiredCollections, "clientProducts"]) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      throw new Error(`Backup collection '${key}' must be an array`)
    }
  }
  for (const key of ["companyInfo", "credentials", "appConfig"]) {
    if (data[key] !== undefined && (!data[key] || typeof data[key] !== "object" || Array.isArray(data[key]))) {
      throw new Error(`Backup ${key} is invalid`)
    }
  }

  db.transaction(() => {
    for (const table of ["products", "clients", "bills", "field_officers", "salesmen", "client_products"]) {
      db.prepare(`DELETE FROM ${table}`).run()
    }

    const insertProduct = db.prepare(
      "INSERT INTO products(_id,productName,productPrice,purchasePrice,quantity,hasInfiniteQuantity,companyName,containerSize) VALUES(?,?,?,?,?,?,?,?)"
    )
    for (const product of data.products) {
      insertProduct.run(
        product._id || generateId(), product.productName || "", Number(product.productPrice) || 0,
        Number(product.purchasePrice != null ? product.purchasePrice : product.productPrice) || 0,
        Number(product.quantity) || 0, product.hasInfiniteQuantity === false ? 0 : 1,
        product.companyName || "", product.containerSize || ""
      )
    }

    const insertClient = db.prepare(
      "INSERT INTO clients(_id,clientName,clientNumber,clientAddress,isFiler,ntnNumber) VALUES(?,?,?,?,?,?)"
    )
    for (const client of data.clients) {
      insertClient.run(
        client._id || generateId(), client.clientName || "", client.clientNumber || "",
        client.clientAddress || "", client.isFiler ? 1 : 0, client.ntnNumber || ""
      )
    }

    const insertOfficer = db.prepare("INSERT INTO field_officers(_id,name,phoneNumber) VALUES(?,?,?)")
    for (const officer of data.fieldOfficers) {
      insertOfficer.run(officer._id || generateId(), officer.name || "", officer.phoneNumber || "")
    }

    const insertSalesman = db.prepare("INSERT INTO salesmen(_id,name,phoneNumber) VALUES(?,?,?)")
    for (const salesman of data.salesmen) {
      insertSalesman.run(salesman._id || generateId(), salesman.name || "", salesman.phoneNumber || "")
    }

    const sortedBills = [...data.bills].sort((a, b) => String(a.billDate || "").localeCompare(String(b.billDate || "")))
    const insertBill = db.prepare(
      "INSERT INTO bills(_id,billId,clientId,clientName,clientAddress,fieldOfficerId,salesmanId,billDate,totalAmount,items) VALUES(?,?,?,?,?,?,?,?,?,?)"
    )
    for (const bill of sortedBills) {
      const items = ensureItemsHaveIds(Array.isArray(bill.items) ? bill.items : [])
      insertBill.run(
        bill._id || String(bill.billId || generateId()), bill.billId || null, bill.clientId || "",
        bill.clientName || "", bill.clientAddress || "", bill.fieldOfficerId || "", bill.salesmanId || "",
        bill.billDate ? toIsoDate(bill.billDate) : "", Number(bill.totalAmount) || 0, JSON.stringify(items)
      )
    }

    if (Array.isArray(data.clientProducts)) {
      const insertHistory = db.prepare(
        "INSERT INTO client_products(_id,clientId,productId,rate,discount,extraDiscount,lastUsed) VALUES(?,?,?,?,?,?,?)"
      )
      for (const history of data.clientProducts) {
        insertHistory.run(
          history._id || generateId(), history.clientId || "", history.productId || "",
          Number(history.rate) || 0, Number(history.discount) || 0, Number(history.extraDiscount) || 0,
          history.lastUsed ? toIsoDate(history.lastUsed) : ""
        )
      }
    } else {
      const upsertHistory = db.prepare(
        "INSERT OR REPLACE INTO client_products(_id,clientId,productId,rate,discount,extraDiscount,lastUsed) VALUES(?,?,?,?,?,?,?)"
      )
      for (const bill of sortedBills) {
        for (const item of Array.isArray(bill.items) ? bill.items : []) {
          if (item.isBonus || !bill.clientId || !item.productId) continue
          upsertHistory.run(
            generateId(), bill.clientId, item.productId, Number(item.rate) || 0,
            Number(item.discount) || 0, Number(item.extraDiscount) || 0,
            bill.billDate ? toIsoDate(bill.billDate) : ""
          )
        }
      }
    }

    const insertSetting = db.prepare("INSERT OR REPLACE INTO settings(type,data) VALUES(?,?)")
    for (const [key, value] of [["company-info", data.companyInfo], ["credentials", data.credentials], ["app-config", data.appConfig]]) {
      if (value !== undefined) insertSetting.run(key, JSON.stringify(value))
    }
  })()

  return { success: true }
}

module.exports = { importAllData }
