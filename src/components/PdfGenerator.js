import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import configService from "../services/ConfigService"

/**
 * PDF Generator component for creating invoices.
 * Refactored to improve maintainability and alignment of numeric columns.
 */
class PdfGenerator {
  constructor(bill, companyInfo) {
    this.bill = bill
    this.companyInfo = companyInfo
    this.doc = null
    this.pageWidth = 410 // 15cm in points
    this.pageHeight = 595.3 // 21cm in points
    this.margin = 15 // reduce margin for smaller page
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

  async generateInvoicePdf(bill, client, companyInfo, fieldOfficer, salesman, showDiscountAsAmount = false, products = []) {
    try {
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)

      let page = pdfDoc.addPage([this.pageWidth, this.pageHeight])
      let pageNo = 1
      let y = this.pageHeight - this.margin
      const left = this.margin
      const right = this.pageWidth - this.margin
      const minFooterSpace = 80
      const col = [left, left + 18, left + 235, left + 260, left + 285, left + 315, left + 350]

      // --- HEADER & INFO ---
      y = this._drawHeader(page, companyInfo, y, font, bold)
      y = this._drawInvoiceInfo(page, bill, client, fieldOfficer, salesman, y, font, bold, italic, right, left)
      y = this._drawTableHeader(page, y, col, font, bold, right, left)

      // --- TABLE ROWS ---
      for (let idx = 0; idx < bill.items.length; idx++) {
        const item = bill.items[idx]
        if (!item.productName) continue

        const product = products.find(p => p._id === item.productId) || {}
        const descColWidth = col[2] - col[1] - 4

        // Measure row height
        let tempY = y
        tempY = this.drawWrappedText(page, item.productName.trim(), col[1], tempY, descColWidth, bold, 10, this.colors.black, true)
        if (product.companyName || product.containerSize) {
          const companyText = product.companyName?.trim() || ""
          const sizeText = product.containerSize?.trim() || ""
          const extra = companyText + (companyText && sizeText ? " - " : "") + sizeText
          if (extra) {
            tempY = this.drawWrappedText(page, extra, col[1], tempY, descColWidth, font, 8, rgb(0.3, 0.3, 0.3), true)
          }
        }
        const rowHeight = y - tempY + 4

        // PAGE BREAK if not enough space
        if (y - rowHeight < minFooterSpace || (idx === bill.items.length - 1 && y < 170)) {
          this._drawWarrantyBox(page, left, 70, font, bold, right)
          page.drawText(`Page No: ${pageNo++}`, { x: right - 50, y: 70 - 37, size: 8, font })

          page = pdfDoc.addPage([this.pageWidth, this.pageHeight])
          y = this.pageHeight - this.margin
          y = this._drawInvoiceInfo(page, bill, client, fieldOfficer, salesman, y, font, bold, italic, right, left)
          y = this._drawTableHeader(page, y, col, font, bold, right, left)
        }

        // Draw Row Content
        page.drawText(String(idx + 1), { x: col[0], y, size: 10, font })

        let y2 = this.drawWrappedText(page, item.productName.trim(), col[1], y, descColWidth, bold, 8, this.colors.black)
        if (product.companyName || product.containerSize) {
          const companyText = product.companyName?.trim() || ""
          const sizeText = product.containerSize || ""
          const extra = companyText + (companyText && sizeText ? " - " : "") + sizeText
          if (extra) {
            y2 = this.drawWrappedText(page, extra, col[1], y2 + 1, descColWidth, font, 8, rgb(0.3, 0.3, 0.3))
          }
        }

        const colY = y - 2
        // Right Aligned Numeric Columns
        this._drawRightAlignedText(page, String(item.quantity), col[3] - 10, colY, 10, font, this.colors.black)
        this._drawRightAlignedText(page, item.isBonus ? String(item.quantity) : "-", col[4] - 8, colY, 10, font, this.colors.black)
        this._drawRightAlignedText(page, `${Math.round(item.rate)}`, col[5] - 8, colY, 10, font, this.colors.black)

        if (showDiscountAsAmount) {
          const discAmt = (item.rate * item.quantity * (item.discount || 0)) / 100
          this._drawRightAlignedText(page, `${Math.round(discAmt) !== 0 ? Math.round(discAmt) : "-"}`, col[6] - 11, colY, 10, font, this.colors.black)
        } else {
          this._drawRightAlignedText(page, `${item.discount || "-"}${item.discount ? "%" : ""}`, col[6] - 11, colY, 10, font, this.colors.black)
        }

        this._drawRightAlignedText(page, `${Math.round(item.total)}`, right - 5, colY, 10, font, this.colors.black)

        y -= Math.ceil(y - y2) + 1
      }

      y += 5
      page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: this.colors.black })
      y -= 15

      // --- TOTALS & FOOTER ---
      const grossAmount = bill.items.reduce((sum, item) => !item.isBonus ? sum + item.quantity * item.rate : sum, 0)
      const totalDiscount = bill.items.reduce((sum, item) => !item.isBonus ? sum + ((item.rate * item.quantity * (item.discount || 0)) / 100) : sum, 0)

      this._drawTotalsBox(page, y, left, right, grossAmount, totalDiscount, bill.totalAmount, client.isFiler, font, bold)
      this._drawFooter(page, bill.totalAmount, 70, left, right, font, bold, pageNo)
      this._drawWarrantyBox(page, left, 70, font, bold, right)

      return await pdfDoc.save()
    } catch (error) {
      console.error("Error generating PDF:", error)
      throw error
    }
  }

  _drawHeader(page, companyInfo, y, font, bold) {
    // Sanitize text to remove newlines that cause WinAnsi encoding errors
    const companyName = (companyInfo.companyName || "Company Name").replace(/[\r\n]+/g, " ")
    const companyAddress = (companyInfo.companyAddress || "Address").replace(/[\r\n]+/g, " ")
    const companyOwner = (companyInfo.ownerName || "Owner").replace(/[\r\n]+/g, " ")
    const companyOwnerPhone = (companyInfo.ownerPhone || "Phone").replace(/[\r\n]+/g, " ")

    const ownerText = `Owner: ${companyOwner} ${companyOwnerPhone}`
    const companyNameWidth = bold.widthOfTextAtSize(companyName, 15)
    const companyAddressWidth = font.widthOfTextAtSize(companyAddress, 10)
    const ownerWidth = bold.widthOfTextAtSize(ownerText, 9)

    page.drawText(companyName, { x: (this.pageWidth - companyNameWidth) / 2, y, size: 15, font: bold, color: this.colors.black })
    y -= 10
    page.drawText(companyAddress, { x: (this.pageWidth - companyAddressWidth) / 2, y, size: 10, font, color: this.colors.black })
    y -= 10
    page.drawText(ownerText, { x: (this.pageWidth - ownerWidth) / 2, y, size: 9, font: bold, color: this.colors.black })
    y -= 5
    page.drawLine({ start: { x: this.margin, y }, end: { x: this.pageWidth - this.margin, y }, thickness: 1, color: this.colors.black })
    return y - 10
  }

  _drawInvoiceInfo(page, bill, client, fieldOfficer, salesman, y, font, bold, italic, right, left) {
    const now = new Date()
    const invoiceNo = `Invoice No: ${bill.billId ? bill.billId : bill._id}`
    const dateText = `Date: ${configService.formatDate(bill.billDate)}`
    const printDate = `${configService.formatDate(now)}`
    const printTime = `${configService.formatTime(now)}`
    const today = configService.formatDate(new Date(), { weekday: "short" })

    page.drawText(invoiceNo, { x: left, y, size: 10, font: bold })
    page.drawText(dateText, { x: right - 160, y, size: 9, font })
    y -= 10
    page.drawText(`Name:`, { x: left, y, size: 10, font: bold })
    page.drawText(client.clientName || "N/A", { x: left + 50, y, size: 10, font: bold })
    // page.drawText(printDate, { x: right - 120, y, size: 10, font })
    y -= 10
    page.drawText(`Address:`, { x: left, y, size: 10, font })
    page.drawText(client.clientAddress || "N/A", { x: left + 50, y, size: 10, font })
    page.drawText("Print (Day - Date - Time)", { x: right - 160, y, size: 9, font: italic })
    y -= 10
    page.drawText(`${today} - ${printDate} - ${printTime}`, { x: right - 160, y, size: 9, font: italic })

    if (client.clientNumber) {
      page.drawText(`Phone:`, { x: left, y, size: 10, font })
      page.drawText(client.clientNumber, { x: left + 50, y, size: 10, font })
      y -= 10
    }

    page.drawText(`F. Officer: ${fieldOfficer.name || "N/A"} ${fieldOfficer.phoneNumber || ""}`, { x: left, y, size: 8, font })
    page.drawText(`Salesman: ${salesman.name || "N/A"} ${salesman.phoneNumber || ""}`, { x: right - 160, y, size: 8, font })
    return y - 5
  }

  _drawTableHeader(page, y, col, font, bold, right, left) {
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: this.colors.black })
    y -= 12
    page.drawText("S#", { x: col[0], y, size: 10, font: bold })
    page.drawText("Description", { x: col[1], y, size: 10, font: bold })
    page.drawText("Qty", { x: col[2], y, size: 10, font: bold })
    page.drawText("Bns", { x: col[3], y, size: 10, font: bold })
    page.drawText("Rate", { x: col[4], y, size: 10, font: bold })
    page.drawText("Disc", { x: col[5], y, size: 10, font: bold })
    page.drawText("Total", { x: col[6], y, size: 10, font: bold })
    y -= 5
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: this.colors.black })
    return y - 10
  }

  _drawTotalsBox(page, y, left, right, gross, discount, total, isFiler, font, bold) {
    const partyStatus = isFiler ? "FILER" : "NON FILER"
    page.drawText(`Party Status: ${partyStatus}`, { x: left, y, size: 10, font: bold })

    const boxX = left + 140
    const boxY = y + 10
    const boxWidth = 240
    const boxHeight = 40

    page.drawRectangle({ x: boxX, y: boxY - boxHeight, width: boxWidth, height: boxHeight, borderColor: this.colors.black, borderWidth: 1, color: rgb(0.97, 0.97, 0.97) })

    page.drawText(`Gross Amount`, { x: boxX + 4, y: boxY - 10, size: 8, font })
    page.drawText(gross.toFixed(2), { x: boxX + 14, y: boxY - 30, size: 9, font })

    page.drawText(`Advance Tax`, { x: boxX + 64, y: boxY - 10, size: 8, font })
    page.drawText("0.00", { x: boxX + 74, y: boxY - 30, size: 9, font })

    page.drawText(`Discount`, { x: boxX + 124, y: boxY - 10, size: 8, font })
    page.drawText(discount.toFixed(2), { x: boxX + 130, y: boxY - 30, size: 9, font })

    page.drawText(`TOTAL AMOUNT`, { x: boxX + 174, y: boxY - 10, size: 8, font })
    page.drawText(`${Math.round(total)}`, { x: boxX + 187, y: boxY - 30, size: 9, font })

    page.drawLine({ start: { x: boxX, y: boxY - 15 }, end: { x: boxX + boxWidth, y: boxY - 15 }, thickness: 0.5, color: this.colors.black })
  }

  _drawFooter(page, totalAmount, footerY, left, right, font, bold, pageNo) {
    page.drawLine({ start: { x: left, y: footerY + 38 }, end: { x: right, y: footerY + 38 }, thickness: 0.5, color: this.colors.black })
    page.drawLine({ start: { x: left, y: footerY + 37 }, end: { x: right, y: footerY + 37 }, thickness: 0.5, color: this.colors.black })
    page.drawLine({ start: { x: left + 8, y: footerY + 33 }, end: { x: left + 70, y: footerY + 33 }, thickness: 0.5, color: this.colors.black })
    page.drawLine({ start: { x: left + 88, y: footerY + 33 }, end: { x: left + 150, y: footerY + 33 }, thickness: 0.5, color: this.colors.black })

    page.drawText("Prepared By", { x: left + 10, y: footerY + 24, size: 9, font })
    page.drawText("Checked By", { x: left + 90, y: footerY + 24, size: 9, font })
    page.drawText("TOTAL AMOUNT:", { x: left + 250, y: footerY + 24, size: 9, font: bold })
    page.drawText(`${Math.round(totalAmount)}`, { x: left + 330, y: footerY + 24, size: 9, font: bold })

    page.drawText(`Page No: ${pageNo}`, { x: right - 50, y: footerY - 37, size: 8, font })
  }

  _drawWarrantyBox(page, left, footerY, font, bold, right) {
    page.drawRectangle({ x: left, y: footerY - 27, width: 380, height: 46, borderColor: this.colors.black, borderWidth: 1 })
    page.drawText("General Warranty:", { x: left + 5, y: footerY + 10, size: 8, font: bold })
    page.drawText(" under alternative medicine & health products (enlistment) Rules 2014", { x: left + 75, y: footerY + 10, size: 7, font: bold })

    const warrantyMsg1 = "We as the authorised distributors/agents and on behalf of the Principals/Manufacturer hereby give warranty that the"
    const warrantyMsg2 = "supplied alternative medicines & health products mentioned herein do not contravene any provision of the prevailing DRAP Act & rules"

    page.drawText(warrantyMsg1, { x: left + 6, y: footerY + 2, size: 6, font })
    page.drawText(warrantyMsg2, { x: left + 6, y: footerY - 6, size: 6, font })

    page.drawText("Note:", { x: left + 5, y: footerY - 15, size: 8, font: bold })
    page.drawText(" (A) For dated (expired) items, Please inform 6 months before actual expiry date.", { x: left + 25, y: footerY - 15, size: 6, font })
    page.drawText(" (B) This warranty does not apply to the ayurvedic, general items, unani, food items mentioned in this cash memo/invoice.", { x: left + 25, y: footerY - 22, size: 6, font })
    page.drawText("Designed By: Shoaib Fazeel Butt - 24/7 Hours Help Line (0347-8405935, 0307-6341160)", { x: left, y: footerY - 35, size: 7, font })
  }

  _drawRightAlignedText(page, text, xEnd, y, size, font, color) {
    const width = font.widthOfTextAtSize(text, size)
    page.drawText(text, { x: xEnd - width, y, size, font, color })
  }

  // Helper function to draw wrapped text - Fixed to handle newlines properly
  drawWrappedText(page, text, x, y, maxWidth, font, fontSize, color, measureOnly = false) {
    const words = text.split(" ")
    let line = ""
    let lineY = y
    const lineHeight = fontSize * 1.2
    for (const word of words) {
      const testLine = line + (line ? " " : "") + word
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)
      if (testWidth > maxWidth && line !== "") {
        if (!measureOnly) {
          page.drawText(line, { x, y: lineY, size: fontSize, font, color })
        }
        line = word
        lineY -= lineHeight
      } else {
        line = testLine
      }
    }
    if (line) {
      if (!measureOnly) {
        page.drawText(line, { x, y: lineY, size: fontSize, font, color })
      }
    }
    return lineY - lineHeight
  }
}

export default PdfGenerator
