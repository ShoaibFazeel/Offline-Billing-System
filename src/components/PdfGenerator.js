import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

// PDF Generator component for creating invoices
class PdfGenerator {
  constructor(bill, companyInfo) {
    this.bill = bill
    this.companyInfo = companyInfo
    this.doc = null
    this.pageWidth = 595.28 // A4 width in points (8.27 × 11.69 inches)
    this.pageHeight = 841.89 // A4 height in points
    this.margin = 40
    this.fontSize = {
      title: 16,
      subtitle: 12,
      header: 10,
      normal: 9,
      small: 8,
    }
    this.colors = {
      black: rgb(0, 0, 0),
      gray: rgb(0.5, 0.5, 0.5),
      lightGray: rgb(0.9, 0.9, 0.9),
      white: rgb(1, 1, 1),
      headerBg: rgb(0.95, 0.95, 0.95),
    }
  }

  async generateInvoicePdf(bill, client, companyInfo, fieldOfficer, salesman) {
    try {
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      let y = 800
      const left = 40
      const right = 555
      const lineHeight = 20 // Increased spacing
      const tableStartY = 570
      const pageBottom = 60 // Margin from bottom for footer

      // --- Header ---
      // Center the company name at the top
      const pageWidth = 595.28;
      const companyName = companyInfo.companyName || "Company Name";
      const companyAddress = companyInfo.companyAddress || "Address";
      const companyOwner = companyInfo.ownerName || "Owner";
      const companyOwnerPhone = companyInfo.ownerPhone || "Phone";

      const companyNameWidth = bold.widthOfTextAtSize(companyName, 16);
      const companyAddressWidth = font.widthOfTextAtSize(companyAddress, 10);
      const companyOwnerWidth = font.widthOfTextAtSize(companyOwner, 10);
      const companyOwnerPhoneWidth = font.widthOfTextAtSize(companyOwnerPhone, 10);

      page.drawText(companyName, {
        x: (pageWidth - companyNameWidth) / 2,
        y,
        size: 16,
        font: bold,
        color: rgb(0, 0, 0),
      })
      page.drawText(companyInfo.companyAddress || "Address", {
        x: (pageWidth - companyAddressWidth) / 2,
        y: y - 22,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      })
      page.drawText(
        `Owner: ${companyInfo.ownerName || "-"} ${companyInfo.ownerPhone || "-"}`,
        { x: (pageWidth - (companyOwnerWidth+companyOwnerPhoneWidth)) / 2, y: y - 40, size: 10, font, color: rgb(0, 0, 0) }
      )
      // Draw a line
      page.drawLine({ start: { x: left, y: y - 68 }, end: { x: right, y: y - 68 }, thickness: 1, color: rgb(0,0,0) })
      y -= 88

      // --- Invoice Info Row ---
      page.drawText(`Invoice No: ${bill.billId ? bill.billId : bill._id}` , { x: left, y, size: 12, font: bold })
      page.drawText(`Date: ${new Date(bill.billDate).toLocaleDateString()}` , { x: right - 120, y, size: 12, font })
      y -= lineHeight
      page.drawText(`Name: ${client.clientName || "N/A"}` , { x: left, y, size: 12, font })
      const now = new Date();
      page.drawText(`Printing Date: ${now.toLocaleDateString()}` , { x: right - 180, y, size: 11, font })
      y -= 14;
      page.drawText(`Printing Time: ${now.toLocaleTimeString()}` , { x: right - 180, y, size: 11, font })
      y -= lineHeight
      page.drawText(`Address: ${client.clientAddress || "N/A"}` , { x: left, y, size: 12, font })
      y -= lineHeight
      page.drawText(`F. Officer: ${fieldOfficer.name || "N/A"} ${fieldOfficer.phoneNumber || ""}` , { x: left, y, size: 12, font })
      page.drawText(`Salesman: ${salesman.name || "N/A"} ${salesman.phoneNumber || ""}` , { x: right - 180, y, size: 12, font })
      y -= lineHeight + 8

      // --- Table Header ---
      const col = [left, left+22, left+220, left+260, left+300, left+350, left+400, left+470]
      page.drawText("S#", { x: col[0], y, size: 11, font: bold })
      page.drawText("Description", { x: col[1], y, size: 11, font: bold })
      page.drawText("Qty", { x: col[2], y, size: 11, font: bold })
      page.drawText("Bns", { x: col[3], y, size: 11, font: bold })
      page.drawText("Rate", { x: col[4], y, size: 11, font: bold })
      page.drawText("Disc Net", { x: col[5], y, size: 11, font: bold })
      page.drawText("Total", { x: col[6], y, size: 11, font: bold })
      y -= 16
      page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0,0,0) })
      y -= 16 // More space before product list

      // --- Table Rows ---
      bill.items.forEach((item, idx) => {
        if (!item.productName) return
        page.drawText(String(idx + 1), { x: col[0], y, size: 11, font })
        page.drawText(item.productName, { x: col[1], y, size: 11, font })
        page.drawText(String(item.quantity), { x: col[2], y, size: 11, font })
        page.drawText(item.isBonus ? String(item.quantity) : "", { x: col[3], y, size: 11, font })
        page.drawText(item.rate.toFixed(2), { x: col[4], y, size: 11, font })
        const discNet = ((item.rate * item.quantity * (item.discount || 0)) / 100).toFixed(2)
        page.drawText(discNet, { x: col[5], y, size: 11, font })
        page.drawText(item.total.toFixed(2), { x: col[6], y, size: 11, font })
        y -= 18 // More space between rows
      })
      y -= 12
      page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0,0,0) })
      y -= 20

      // --- Totals Section ---
      const grossAmount = bill.items.reduce((sum, item) => !item.isBonus ? sum + item.quantity * item.rate : sum, 0)
      const totalDiscount = bill.items.reduce((sum, item) => !item.isBonus ? sum + ((item.rate * item.quantity * (item.discount || 0)) / 100) : sum, 0)
      const partyStatus = client.isFiler ? "FILER" : "NON FILER"
      const ntn = client.ntnNumber || ""
      page.drawText(`Party Status: ${partyStatus}`, { x: left, y, size: 11, font: bold })
      page.drawText(`NTN No: ${ntn}`, { x: left + 180, y, size: 11, font })
      page.drawText(`Gross Amount:`, { x: left + 300, y, size: 11, font })
      page.drawText(grossAmount.toFixed(2), { x: left + 400, y, size: 11, font })
      y -= 18
      page.drawText(`Advance Tax:`, { x: left + 300, y, size: 11, font })
      page.drawText("0.00", { x: left + 400, y, size: 11, font })
      y -= 18
      page.drawText(`Discount:`, { x: left + 300, y, size: 11, font })
      page.drawText(totalDiscount.toFixed(2), { x: left + 400, y, size: 11, font })
      y -= 18
      page.drawText(`TOTAL AMOUNT:`, { x: left + 300, y, size: 12, font: bold })
      page.drawText(bill.totalAmount.toFixed(2), { x: left + 430, y, size: 12, font: bold })
      y -= 30
      page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0,0,0) })

      // --- Footer: Always at the bottom ---
      let footerY = pageBottom
      // Draw a line just above the footer block
      page.drawLine({ start: { x: left, y: footerY + 75 }, end: { x: right, y: footerY + 75 }, thickness: 0.5, color: rgb(0,0,0) })
      page.drawText("Prepared By", { x: left + 40, y: footerY + 60, size: 11, font })
      page.drawText("Checked By", { x: left + 200, y: footerY + 60, size: 11, font })
      page.drawText("TOTAL AMOUNT:", { x: left + 350, y: footerY + 60, size: 11, font: bold })
      page.drawText(bill.totalAmount.toFixed(2), { x: left + 450, y: footerY + 60, size: 11, font: bold })
      // Warranty/Notes
      page.drawText("General Warranty: under alternative medicine & health products (enlistment) Rules 2014", { x: left, y: footerY + 44, size: 8, font })
      page.drawText("We as the authorised distributors/agents and on behalf of the Principals/Manufacturer hereby give warranty that the", { x: left, y: footerY + 34, size: 8, font })
      page.drawText("supplied alternative medicines & health products mentioned herein do not contravene any provision of the prevailing DRAP Act & rules", { x: left, y: footerY + 24, size: 8, font })
      page.drawText("Note: (A) For dated (expired) items, Please inform 6 months before actual expiry date.", { x: left, y: footerY + 14, size: 8, font })
      page.drawText("(B) This warranty does not apply to the ayurvedic, general items, unani, food items mentioned in this cash memo/invoice.", { x: left, y: footerY + 4, size: 8, font })
      page.drawText("Designed By: Shoaib Fazeel B - 24/7 Hours Help Line (0347-8405935, 0307-6341160)", { x: left, y: footerY - 10, size: 8, font })
      page.drawText("Page # 1", { x: right - 40, y: footerY - 10, size: 8, font })

      return await pdfDoc.save()
    } catch (error) {
      console.error("Error generating PDF:", error)
      throw error
    }
  }

  drawCompanyHeader(page, boldFont, regularFont, companyInfo, yPos) {
    const { width, height } = page.getSize()
    const centerX = width / 2

    // Company logo placeholder (you can replace this with an actual logo)
    page.drawText(companyInfo.companyName.toUpperCase(), {
      x: centerX,
      y: yPos,
      size: this.fontSize.title,
      font: boldFont,
      color: this.colors.black,
      align: "center",
    })

    yPos -= 20

    // Company address
    page.drawText(companyInfo.companyAddress, {
      x: centerX,
      y: yPos,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
      align: "center",
    })

    yPos -= 15

    // Owner information
    const ownerText = `Owner: ${companyInfo.ownerName} - ${companyInfo.ownerPhone}`
    page.drawText(ownerText, {
      x: centerX,
      y: yPos,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
      align: "center",
    })

    yPos -= 15

    // General Manager information
    const managerText = `General Manager: ${companyInfo.managerName} - ${companyInfo.managerPhone}`
    page.drawText(managerText, {
      x: centerX,
      y: yPos,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
      align: "center",
    })

    // Draw a line under the header
    yPos -= 10
    page.drawLine({
      start: { x: this.margin, y: yPos },
      end: { x: width - this.margin, y: yPos },
      thickness: 1,
      color: this.colors.gray,
    })

    return yPos - 15
  }

  drawInvoiceInfo(page, boldFont, regularFont, bill, yPos) {
    const { width } = page.getSize()

    // Left side - Invoice number
    page.drawText("Invoice #", {
      x: this.margin,
      y: yPos,
      size: this.fontSize.header,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText(bill._id.substring(0, 8), {
      x: this.margin + 80,
      y: yPos,
      size: this.fontSize.header,
      font: regularFont,
      color: this.colors.black,
    })

    // Right side - Date
    const dateLabel = "Date"
    const dateText = new Date(bill.billDate).toLocaleDateString()

    page.drawText(dateLabel, {
      x: width - this.margin - 150,
      y: yPos,
      size: this.fontSize.header,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText(dateText, {
      x: width - this.margin - 100,
      y: yPos,
      size: this.fontSize.header,
      font: regularFont,
      color: this.colors.black,
    })

    yPos -= 15

    // Printing date and time
    const printingDateLabel = "Printing Date & Time"
    const now = new Date()
    const printingDateText = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`

    page.drawText(printingDateLabel, {
      x: width - this.margin - 150,
      y: yPos,
      size: this.fontSize.small,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText(printingDateText, {
      x: width - this.margin - 100,
      y: yPos,
      size: this.fontSize.small,
      font: regularFont,
      color: this.colors.black,
    })

    return yPos - 15
  }

  drawClientInfo(page, boldFont, regularFont, client, fieldOfficer, salesman, yPos) {
    const { width } = page.getSize()

    // Client name
    page.drawText("Name", {
      x: this.margin,
      y: yPos,
      size: this.fontSize.header,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText(client.clientName, {
      x: this.margin + 80,
      y: yPos,
      size: this.fontSize.header,
      font: regularFont,
      color: this.colors.black,
    })

    yPos -= 15

    // Client address
    page.drawText("Address", {
      x: this.margin,
      y: yPos,
      size: this.fontSize.header,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText(client.clientAddress, {
      x: this.margin + 80,
      y: yPos,
      size: this.fontSize.header,
      font: regularFont,
      color: this.colors.black,
    })

    yPos -= 20

    // Field Officer and Salesman
    const fieldOfficerText = `F. Officer ${fieldOfficer.name} ${fieldOfficer.phoneNumber}`
    const salesmanText = `Salesman ${salesman.name} ${salesman.phoneNumber}`

    // Draw field officer info
    page.drawText(fieldOfficerText, {
      x: this.margin,
      y: yPos,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
    })

    // Draw salesman info
    page.drawText(salesmanText, {
      x: width / 2,
      y: yPos,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
    })

    // Draw a line under the client info
    yPos -= 10
    page.drawLine({
      start: { x: this.margin, y: yPos },
      end: { x: width - this.margin, y: yPos },
      thickness: 1,
      color: this.colors.gray,
    })

    return yPos - 15
  }

  drawItemsTable(page, boldFont, regularFont, items, yPos) {
    const { width } = page.getSize()
    const tableWidth = width - 2 * this.margin

    // Column widths as percentages of table width
    const colWidths = {
      sno: 0.05,
      description: 0.35,
      qty: 0.08,
      bonus: 0.08,
      rate: 0.1,
      discount: 0.08,
      extraDisc: 0.08,
      total: 0.18,
    }

    // Calculate column positions
    const colPos = {
      sno: this.margin,
      description: this.margin + tableWidth * colWidths.sno,
      qty: this.margin + tableWidth * (colWidths.sno + colWidths.description),
      bonus: this.margin + tableWidth * (colWidths.sno + colWidths.description + colWidths.qty),
      rate: this.margin + tableWidth * (colWidths.sno + colWidths.description + colWidths.qty + colWidths.bonus),
      discount:
        this.margin +
        tableWidth * (colWidths.sno + colWidths.description + colWidths.qty + colWidths.bonus + colWidths.rate),
      extraDisc:
        this.margin +
        tableWidth *
          (colWidths.sno +
            colWidths.description +
            colWidths.qty +
            colWidths.bonus +
            colWidths.rate +
            colWidths.discount),
      total:
        this.margin +
        tableWidth *
          (colWidths.sno +
            colWidths.description +
            colWidths.qty +
            colWidths.bonus +
            colWidths.rate +
            colWidths.discount +
            colWidths.extraDisc),
    }

    // Draw table header
    page.drawRectangle({
      x: this.margin,
      y: yPos - 15,
      width: tableWidth,
      height: 15,
      color: this.colors.headerBg,
    })

    // Draw header text
    page.drawText("S#", {
      x: colPos.sno + 2,
      y: yPos - 10,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText("Description", {
      x: colPos.description + 2,
      y: yPos - 10,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText("Qty", {
      x: colPos.qty + 2,
      y: yPos - 10,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText("Bns", {
      x: colPos.bonus + 2,
      y: yPos - 10,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText("Rate", {
      x: colPos.rate + 2,
      y: yPos - 10,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText("Disc", {
      x: colPos.discount + 2,
      y: yPos - 10,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText("Ex.Disc", {
      x: colPos.extraDisc + 2,
      y: yPos - 10,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText("Net Total", {
      x: colPos.total + 2,
      y: yPos - 10,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    yPos -= 15

    // Draw table rows
    const regularItems = items.filter((item) => !item.isBonus)
    const bonusItems = items.filter((item) => item.isBonus)

    // Group bonus items by their parent item (if applicable)
    const bonusByParent = {}

    // Draw regular items first
    regularItems.forEach((item, index) => {
      const rowHeight = 15
      yPos -= rowHeight

      // Draw alternating row background
      if (index % 2 === 0) {
        page.drawRectangle({
          x: this.margin,
          y: yPos,
          width: tableWidth,
          height: rowHeight,
          color: this.colors.lightGray,
        })
      }

      // Draw item data
      page.drawText((index + 1).toString(), {
        x: colPos.sno + 2,
        y: yPos + 4,
        size: this.fontSize.normal,
        font: regularFont,
        color: this.colors.black,
      })

      page.drawText(item.productName, {
        x: colPos.description + 2,
        y: yPos + 4,
        size: this.fontSize.normal,
        font: regularFont,
        color: this.colors.black,
      })

      page.drawText(item.quantity.toString(), {
        x: colPos.qty + 2,
        y: yPos + 4,
        size: this.fontSize.normal,
        font: regularFont,
        color: this.colors.black,
      })

      // Bonus column (0 for regular items)
      page.drawText("0", {
        x: colPos.bonus + 2,
        y: yPos + 4,
        size: this.fontSize.normal,
        font: regularFont,
        color: this.colors.black,
      })

      page.drawText(item.rate.toFixed(2), {
        x: colPos.rate + 2,
        y: yPos + 4,
        size: this.fontSize.normal,
        font: regularFont,
        color: this.colors.black,
      })

      // Calculate discount amount
      const discountAmount = (item.rate * item.quantity * item.discount) / 100

      page.drawText(discountAmount.toFixed(2), {
        x: colPos.discount + 2,
        y: yPos + 4,
        size: this.fontSize.normal,
        font: regularFont,
        color: this.colors.black,
      })

      // Extra discount
      const extraDiscount = item.extraDiscount || 0
      page.drawText(extraDiscount.toFixed(2), {
        x: colPos.extraDisc + 2,
        y: yPos + 4,
        size: this.fontSize.normal,
        font: regularFont,
        color: this.colors.black,
      })

      page.drawText(item.total.toFixed(2), {
        x: colPos.total + 2,
        y: yPos + 4,
        size: this.fontSize.normal,
        font: regularFont,
        color: this.colors.black,
      })
    })

    // Draw bonus items if any
    if (bonusItems.length > 0) {
      yPos -= 10

      page.drawText("Bonus Items:", {
        x: this.margin,
        y: yPos,
        size: this.fontSize.normal,
        font: boldFont,
        color: this.colors.black,
      })

      bonusItems.forEach((item, index) => {
        const rowHeight = 15
        yPos -= rowHeight

        // Draw alternating row background
        if (index % 2 === 0) {
          page.drawRectangle({
            x: this.margin,
            y: yPos,
            width: tableWidth,
            height: rowHeight,
            color: this.colors.lightGray,
          })
        }

        // Draw item data
        page.drawText((regularItems.length + index + 1).toString(), {
          x: colPos.sno + 2,
          y: yPos + 4,
          size: this.fontSize.normal,
          font: regularFont,
          color: this.colors.black,
        })

        page.drawText(item.productName, {
          x: colPos.description + 2,
          y: yPos + 4,
          size: this.fontSize.normal,
          font: regularFont,
          color: this.colors.black,
        })

        page.drawText(item.quantity.toString(), {
          x: colPos.qty + 2,
          y: yPos + 4,
          size: this.fontSize.normal,
          font: regularFont,
          color: this.colors.black,
        })

        // Bonus column (marked as bonus)
        page.drawText("BONUS", {
          x: colPos.bonus + 2,
          y: yPos + 4,
          size: this.fontSize.small,
          font: boldFont,
          color: this.colors.black,
        })

        page.drawText(item.rate.toFixed(2), {
          x: colPos.rate + 2,
          y: yPos + 4,
          size: this.fontSize.normal,
          font: regularFont,
          color: this.colors.black,
        })

        page.drawText("0.00", {
          x: colPos.discount + 2,
          y: yPos + 4,
          size: this.fontSize.normal,
          font: regularFont,
          color: this.colors.black,
        })

        page.drawText("FREE", {
          x: colPos.total + 2,
          y: yPos + 4,
          size: this.fontSize.normal,
          font: boldFont,
          color: this.colors.black,
        })
      })
    }

    return yPos - 20
  }

  drawTotals(page, boldFont, regularFont, bill, yPos) {
    const { width } = page.getSize()
    const tableWidth = width - 2 * this.margin

    // Draw totals box
    const boxHeight = 60
    page.drawRectangle({
      x: width - this.margin - 200,
      y: yPos,
      width: 200,
      height: boxHeight,
      borderColor: this.colors.gray,
      borderWidth: 1,
      color: this.colors.lightGray,
    })

    // Draw party status
    page.drawText("Party Status:", {
      x: this.margin,
      y: yPos - 15,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    // Get client filer status from the bill
    const filerStatus = "NON FILER" // This should come from client data

    page.drawText(filerStatus, {
      x: this.margin + 80,
      y: yPos - 15,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
    })

    // Draw NTN if available
    if (filerStatus === "FILER") {
      page.drawText("NTN No:", {
        x: this.margin,
        y: yPos - 30,
        size: this.fontSize.normal,
        font: boldFont,
        color: this.colors.black,
      })

      // NTN number would come from client data
      const ntnNumber = "12345-6789"

      page.drawText(ntnNumber, {
        x: this.margin + 80,
        y: yPos - 30,
        size: this.fontSize.normal,
        font: regularFont,
        color: this.colors.black,
      })
    }

    // Draw totals
    const startY = yPos - 15
    const lineHeight = 15

    // Headers
    page.drawText("Gross Amount", {
      x: width - this.margin - 190,
      y: startY,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText("Advance Tax", {
      x: width - this.margin - 120,
      y: startY,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    page.drawText("Discount", {
      x: width - this.margin - 60,
      y: startY,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    // Calculate gross amount (before discounts)
    const grossAmount = bill.items.reduce((sum, item) => {
      if (!item.isBonus) {
        return sum + item.quantity * item.rate
      }
      return sum
    }, 0)

    // Calculate total percentage discount
    const totalPercentDiscount = bill.items.reduce((sum, item) => {
      if (!item.isBonus) {
        return sum + (item.rate * item.quantity * item.discount) / 100
      }
      return sum
    }, 0)

    // Calculate total extra discount
    const totalExtraDiscount = bill.items.reduce((sum, item) => {
      if (!item.isBonus) {
        return sum + (item.extraDiscount || 0)
      }
      return sum
    }, 0)

    // Total discount is the sum of percentage and extra discounts
    const totalDiscount = totalPercentDiscount + totalExtraDiscount

    // Values
    page.drawText(grossAmount.toFixed(2), {
      x: width - this.margin - 190,
      y: startY - lineHeight,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
    })

    page.drawText("0.00", {
      // Advance tax
      x: width - this.margin - 120,
      y: startY - lineHeight,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
    })

    page.drawText(totalDiscount.toFixed(2), {
      x: width - this.margin - 60,
      y: startY - lineHeight,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
    })

    // Total amount header
    page.drawText("TOTAL AMOUNT", {
      x: width - this.margin - 190,
      y: startY - 2 * lineHeight,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    // Total amount value
    page.drawText(bill.totalAmount.toFixed(2), {
      x: width - this.margin - 60,
      y: startY - 2 * lineHeight,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    // Draw a line under the totals
    yPos = yPos - boxHeight - 10
    page.drawLine({
      start: { x: this.margin, y: yPos },
      end: { x: width - this.margin, y: yPos },
      thickness: 1,
      color: this.colors.gray,
    })

    return yPos - 15
  }

  drawWarrantyAndNotes(page, boldFont, regularFont, yPos) {
    const { width } = page.getSize()

    // Draw prepared by and checked by
    page.drawText("Prepared By", {
      x: this.margin + 50,
      y: yPos,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
    })

    page.drawText("Checked By", {
      x: width / 2,
      y: yPos,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
    })

    page.drawText("TOTAL AMOUNT:", {
      x: width - this.margin - 150,
      y: yPos,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    // Draw signature lines
    yPos -= 15

    page.drawLine({
      start: { x: this.margin, y: yPos },
      end: { x: this.margin + 100, y: yPos },
      thickness: 1,
      color: this.colors.gray,
    })

    page.drawLine({
      start: { x: width / 2 - 50, y: yPos },
      end: { x: width / 2 + 50, y: yPos },
      thickness: 1,
      color: this.colors.gray,
    })

    // Draw warranty and notes box
    yPos -= 30
    const boxHeight = 80

    page.drawRectangle({
      x: this.margin,
      y: yPos - boxHeight,
      width: width - 2 * this.margin,
      height: boxHeight,
      borderColor: this.colors.gray,
      borderWidth: 1,
    })

    // Draw warranty title
    page.drawText("General Warranty:", {
      x: this.margin + 5,
      y: yPos - 15,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    // Draw warranty text - Fixed: Removed newlines and will handle manually
    const warrantyText =
      "We as the authorized distributors/agents and on behalf of the Principal(s)/Manufacturer hereby give warranty that the supplied products mentioned herein do not contravene any provision of the prevailing laws & rules."

    // Draw the warranty text
    this.drawWrappedText(
      page,
      warrantyText,
      this.margin + 5,
      yPos - 30,
      width - 2 * this.margin - 10,
      regularFont,
      this.fontSize.small,
      this.colors.black,
    )

    // Draw note title
    page.drawText("Note:", {
      x: this.margin + 5,
      y: yPos - 50,
      size: this.fontSize.normal,
      font: boldFont,
      color: this.colors.black,
    })

    // Draw note text - Fixed: Split into separate paragraphs
    const noteTextA = "(A) For dated (expired) items, Please inform 6 months before actual expiry date."
    const noteTextB =
      "(B) This warranty does not applied to the ayurvedic, general items, unani food items mentioned in the cash memo/invoice."

    // Draw the first note
    page.drawText(noteTextA, {
      x: this.margin + 40,
      y: yPos - 50,
      size: this.fontSize.small,
      font: regularFont,
      color: this.colors.black,
    })

    // Draw the second note
    this.drawWrappedText(
      page,
      noteTextB,
      this.margin + 40,
      yPos - 65,
      width - 2 * this.margin - 45,
      regularFont,
      this.fontSize.small,
      this.colors.black,
    )

    return yPos - boxHeight - 15
  }

  drawFooter(page, regularFont, italicFont) {
    const { width, height } = page.getSize()

    // Draw page number
    page.drawText("Page #", {
      x: width - this.margin - 50,
      y: this.margin + 15,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
    })

    page.drawText("1", {
      x: width - this.margin - 15,
      y: this.margin + 15,
      size: this.fontSize.normal,
      font: regularFont,
      color: this.colors.black,
    })

    // Draw designer information
    const designerText = "Designed By: Your Name - Contact: your-email@example.com"

    page.drawText(designerText, {
      x: this.margin,
      y: this.margin,
      size: this.fontSize.small,
      font: italicFont,
      color: this.colors.gray,
    })
  }

  // Helper function to draw wrapped text - Fixed to handle newlines properly
  drawWrappedText(page, text, x, y, maxWidth, font, fontSize, color) {
    // Split the text into words
    const words = text.split(" ")
    let line = ""
    let lineY = y
    const lineHeight = fontSize * 1.2

    for (const word of words) {
      // Test if adding this word would exceed the max width
      const testLine = line + (line ? " " : "") + word
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)

      if (testWidth > maxWidth && line !== "") {
        // Draw the current line and move to the next line
        page.drawText(line, {
          x,
          y: lineY,
          size: fontSize,
          font,
          color,
        })

        line = word
        lineY -= lineHeight
      } else {
        line = testLine
      }
    }

    // Draw the last line if there's any text left
    if (line) {
      page.drawText(line, {
        x,
        y: lineY,
        size: fontSize,
        font,
        color,
      })
    }

    return lineY - lineHeight
  }
}

export default PdfGenerator
