import jsPDF from "jspdf";
import autoTable, { UserOptions } from "jspdf-autotable";
import { RegisterDefinition, RegisterEntryRow, AppSettings, Officer } from "../types.ts";
import { MONTH_NAMES_ID, formatDateIndonesian, getClosingDateForPeriod } from "./date-utils.ts";

export interface GeneratePdfOptions {
  register: RegisterDefinition;
  entries: RegisterEntryRow[];
  settings: AppSettings;
  officers: Officer[];
  tahunTakwim?: number;
  selectedMonth?: number | "all";
  customClosingDate?: string;
  orientationOverride?: "landscape" | "portrait";
}

export function generateRegisterPdf(options: GeneratePdfOptions): jsPDF {
  const {
    register,
    entries,
    settings,
    officers,
    tahunTakwim = 2026,
    selectedMonth = "all",
    customClosingDate,
    orientationOverride,
  } = options;
  const isLandscape = (orientationOverride || register.orientation) === "landscape";

  // Determine actual closing date for period
  const rawClosingDate =
    customClosingDate ||
    (typeof selectedMonth === "number"
      ? getClosingDateForPeriod(settings, tahunTakwim, selectedMonth)
      : settings.tanggalDokumen || new Date().toISOString().split("T")[0]);

  const closingDateFormatted = formatDateIndonesian(rawClosingDate, false);
  const closingDateWithDay = formatDateIndonesian(rawClosingDate, true);

  const monthLabel =
    typeof selectedMonth === "number"
      ? `${MONTH_NAMES_ID[selectedMonth - 1]} ${tahunTakwim}`
      : `Tahun ${tahunTakwim}`;

  // Create jsPDF document
  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const marginTop = 14;
  const marginBottom = 14;
  const contentWidth = pageWidth - marginX * 2;

  // Officer lookup map helper
  const officerMap = new Map<number, Officer>();
  officers.forEach((o) => officerMap.set(o.id, o));

  const formatOfficerNames = (ids: any): string => {
    if (!ids) return "-";
    if (Array.isArray(ids)) {
      const names = ids
        .map((id) => {
          const off = officerMap.get(Number(id));
          return off ? `${off.nama} (${off.pangkat} / NIP. ${off.nip})` : null;
        })
        .filter(Boolean);
      return names.length > 0 ? names.join("\n") : "-";
    }
    if (typeof ids === "number") {
      const off = officerMap.get(ids);
      return off ? `${off.nama} (${off.pangkat} / NIP. ${off.nip})` : String(ids);
    }
    return String(ids);
  };

  // Build table headers (multi-level if subColumns exist)
  const headRows: any[] = [];
  const colNumberRow: any[] = [];

  const hasSubCols = register.columns.some((c) => c.subColumns && c.subColumns.length > 0);

  if (!hasSubCols) {
    // 1-level header
    const topRow = register.columns.map((c) => ({
      content: c.label,
      styles: { halign: "center", valign: "middle", fontStyle: "bold" },
    }));
    headRows.push(topRow);

    const numRow = register.columns.map((c) => ({
      content: String(c.colNumber),
      styles: { halign: "center", valign: "middle", fontStyle: "bold", fillColor: [245, 245, 245] },
    }));
    headRows.push(numRow);
  } else {
    // 2-level header
    const row1: any[] = [];
    const row2: any[] = [];
    const numRow: any[] = [];

    register.columns.forEach((c) => {
      if (c.subColumns && c.subColumns.length > 0) {
        row1.push({
          content: c.label,
          colSpan: c.subColumns.length,
          styles: { halign: "center", valign: "middle", fontStyle: "bold" },
        });
        c.subColumns.forEach((sc) => {
          row2.push({
            content: sc.label,
            styles: { halign: "center", valign: "middle", fontStyle: "bold" },
          });
          numRow.push({
            content: String(sc.colNumber),
            styles: { halign: "center", valign: "middle", fontStyle: "bold", fillColor: [245, 245, 245] },
          });
        });
      } else {
        row1.push({
          content: c.label,
          rowSpan: 2,
          styles: { halign: "center", valign: "middle", fontStyle: "bold" },
        });
        numRow.push({
          content: String(c.colNumber),
          styles: { halign: "center", valign: "middle", fontStyle: "bold", fillColor: [245, 245, 245] },
        });
      }
    });

    headRows.push(row1);
    headRows.push(row2);
    headRows.push(numRow);
  }

  // Build table data rows
  const bodyRows: any[] = [];

  entries.forEach((entry, index) => {
    const rowValues: any[] = [];
    const rowData = entry.data || {};

    register.columns.forEach((col) => {
      if (col.subColumns && col.subColumns.length > 0) {
        col.subColumns.forEach((subCol) => {
          let val = rowData[subCol.key] ?? "";
          if (subCol.type === "officer_multi" || subCol.type === "officer_single") {
            val = formatOfficerNames(val);
          }
          rowValues.push(val || "-");
        });
      } else {
        let val = "";
        if (col.key === "no") {
          val = String(entry.nomorUrut || index + 1);
        } else if (col.type === "officer_multi" || col.type === "officer_single") {
          val = formatOfficerNames(rowData[col.key]);
        } else {
          val = rowData[col.key] ?? "";
        }
        rowValues.push(val || "-");
      }
    });

    bodyRows.push(rowValues);
  });

  // If empty, add 3 blank placeholder rows for official print preview
  if (bodyRows.length === 0) {
    const totalCols = register.columns.reduce(
      (sum, col) => sum + (col.subColumns ? col.subColumns.length : 1),
      0
    );
    for (let i = 1; i <= 3; i++) {
      const blankRow = new Array(totalCols).fill("");
      blankRow[0] = String(i);
      bodyRows.push(blankRow);
    }
  }

  // Function to draw header on every page
  const drawPageHeader = (docInstance: jsPDF, pageNum: number, totalPages?: number) => {
    docInstance.setDrawColor(40, 40, 40);
    docInstance.setLineWidth(0.3);

    // Document Code Top-Right
    docInstance.setFont("helvetica", "bold");
    docInstance.setFontSize(10);
    docInstance.text(register.code, pageWidth - marginX, marginTop + 4, { align: "right" });

    // Kejaksaan Left Header
    docInstance.setFont("helvetica", "bold");
    docInstance.setFontSize(9.5);
    const kejaksaanText = `${settings.kejaksaanName.toUpperCase()}*)`;
    docInstance.text(kejaksaanText, marginX, marginTop + 4);

    // Title Centered
    let currentY = marginTop + 10;
    docInstance.setFont("helvetica", "bold");
    docInstance.setFontSize(11);

    // Split title lines
    const titleLines = docInstance.splitTextToSize(register.title, contentWidth - 40);
    docInstance.text(titleLines, pageWidth / 2, currentY, { align: "center" });
    currentY += titleLines.length * 4.5;

    if (register.subtitle) {
      docInstance.setFont("helvetica", "bold");
      docInstance.setFontSize(8.5);
      const subLines = docInstance.splitTextToSize(register.subtitle, contentWidth - 20);
      docInstance.text(subLines, pageWidth / 2, currentY, { align: "center" });
      currentY += subLines.length * 3.8;
    }

    // Monthly Period Line in Header
    docInstance.setFont("helvetica", "bold");
    docInstance.setFontSize(8);
    docInstance.text(
      `PERIODE: ${typeof selectedMonth === "number" ? `BULAN ${MONTH_NAMES_ID[selectedMonth - 1].toUpperCase()}` : "SEMUA BULAN"} - TAHUN ${tahunTakwim}`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    currentY += 3.5;

    return currentY + 2;
  };

  const startY = drawPageHeader(doc, 1);

  // Render Table with autoTable
  autoTable(doc, {
    head: headRows,
    body: bodyRows,
    startY: startY,
    margin: { left: marginX, right: marginX, top: marginTop + 24, bottom: marginBottom + 38 },
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: isLandscape ? 7.5 : 8,
      cellPadding: 2,
      lineColor: [40, 40, 40],
      lineWidth: 0.25,
      textColor: [20, 20, 20],
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      lineWidth: 0.25,
      lineColor: [40, 40, 40],
    },
    didDrawPage: (data) => {
      // Re-draw top header on subsequent pages
      if (data.pageNumber > 1) {
        drawPageHeader(doc, data.pageNumber);
      }

      // Draw Outer Page Border Frame (Official Indonesian Kejaksaan Register Book Look)
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.4);
      doc.rect(marginX - 4, marginTop - 4, contentWidth + 8, pageHeight - (marginTop + marginBottom) + 8);
    },
  });

  // Calculate signature on the LAST page only!
  const totalPages = (doc as any).internal.getNumberOfPages();
  doc.setPage(totalPages);

  let finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 5 : pageHeight - 68;

  // Monthly Register Formal Closure Note (Catatan Penutupan Register Bulanan Kejaksaan)
  if (finalY + 12 > pageHeight - marginBottom - 42) {
    doc.addPage();
    drawPageHeader(doc, totalPages + 1);
    finalY = marginTop + 25;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  const closingClause = `Catatan Penutupan: Pada hari ini ${closingDateWithDay || closingDateFormatted}, Buku Register ${register.code} periode ${monthLabel} ini ditutup dengan ${entries.length} baris data register.`;
  const splitClosing = doc.splitTextToSize(closingClause, contentWidth - 8);
  doc.text(splitClosing, marginX, finalY);
  finalY += splitClosing.length * 4 + 2;
  doc.setTextColor(0, 0, 0);

  // Rekapitulasi Block if applicable
  if (register.hasRekapitulasi && register.rekapitulasiFields) {
    if (finalY + 28 > pageHeight - marginBottom - 40) {
      doc.addPage();
      drawPageHeader(doc, (doc as any).internal.getNumberOfPages());
      finalY = marginTop + 25;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Rekapitulasi :", marginX, finalY);
    finalY += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    register.rekapitulasiFields.forEach((rf, idx) => {
      // Calculate count from entries
      const count = entries.filter((e) => {
        const val = e.data?.[rf.key] || e.data?.jenis_produk;
        return val !== undefined && val !== "" && val !== null;
      }).length;

      doc.text(`${idx + 1}. ${rf.label}`, marginX + 4, finalY);
      doc.text(`:  ${count > 0 ? count : ".........."} ${rf.suffix || ""}`, marginX + 80, finalY);
      finalY += 4;
    });
    finalY += 4;
  }

  // Check if signature fits on the current page; if not, add a clean final page for signatures
  const signatureHeight = 42;
  if (finalY + signatureHeight > pageHeight - marginBottom - 10) {
    doc.addPage();
    drawPageHeader(doc, (doc as any).internal.getNumberOfPages());
    finalY = marginTop + 25;
  }

  // Draw Signatures (Supports both "split" and "center" alignment)
  const isCenter = settings.signatureAlignment === "center";
  const tglText = `${settings.tempatDokumen}, ${closingDateFormatted}`;

  if (isCenter) {
    // CENTERED SIGNATURES: Kajari on top center or Left-Right centered on columns with text-align: center
    // Format: Kolom Kiri (Mengetahui Kajari) terpusat pada sumbu kiri, Kolom Kanan (Kasi Intel) terpusat pada sumbu kanan
    const leftCenterX = marginX + contentWidth * 0.25;
    const rightCenterX = marginX + contentWidth * 0.75;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(tglText, rightCenterX, finalY, { align: "center" });
    finalY += 5;

    // Left Signer Title (Mengetahui: Kepala Kejaksaan Negeri)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Mengetahui:", leftCenterX, finalY, { align: "center" });
    finalY += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const leftTitleClean = settings.leftSignerTitle.replace("Mengetahui:\n", "").replace("Mengetahui:", "").trim();
    const leftTitleLines = doc.splitTextToSize(leftTitleClean, 75);
    doc.text(leftTitleLines, leftCenterX, finalY, { align: "center" });

    // Right Signer Title (Kepala Seksi Intelijen)
    const rightTitleLines = doc.splitTextToSize(settings.rightSignerTitle, 75);
    doc.text(rightTitleLines, rightCenterX, finalY, { align: "center" });

    finalY += 22;

    // Left Signer Name & NIP
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(settings.leftSignerName, leftCenterX, finalY, { align: "center" });
    doc.setLineWidth(0.2);
    const leftNameWidth = doc.getTextWidth(settings.leftSignerName);
    doc.line(leftCenterX - leftNameWidth / 2, finalY + 0.8, leftCenterX + leftNameWidth / 2, finalY + 0.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(settings.leftSignerPangkatNip, leftCenterX, finalY + 4.5, { align: "center" });

    // Right Signer Name & NIP
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(settings.rightSignerName, rightCenterX, finalY, { align: "center" });
    const rightNameWidth = doc.getTextWidth(settings.rightSignerName);
    doc.line(rightCenterX - rightNameWidth / 2, finalY + 0.8, rightCenterX + rightNameWidth / 2, finalY + 0.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(settings.rightSignerPangkatNip, rightCenterX, finalY + 4.5, { align: "center" });
  } else {
    // SPLIT SIGNATURES (Left: Kajari, Right: Kasi Intelijen)
    const leftX = marginX + (isLandscape ? 20 : 10);
    const rightX = pageWidth - marginX - (isLandscape ? 80 : 70);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    // Right Top Date (Using the monthly closing date)
    doc.text(tglText, rightX, finalY);
    finalY += 5;

    // Left Signer Title (Mengetahui: Kepala Kejaksaan Negeri Tabanan)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Mengetahui:", leftX, finalY);
    finalY += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const leftTitleLines = doc.splitTextToSize(settings.leftSignerTitle.replace("Mengetahui:\n", "").replace("Mengetahui:", ""), 80);
    doc.text(leftTitleLines, leftX, finalY);

    // Right Signer Title (Kepala Seksi Intelijen)
    const rightTitleLines = doc.splitTextToSize(settings.rightSignerTitle, 80);
    doc.text(rightTitleLines, rightX, finalY);

    // Signature space gap
    finalY += 22;

    // Left Signer Name & NIP
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(settings.leftSignerName, leftX, finalY);
    doc.setLineWidth(0.2);
    const leftNameWidth = doc.getTextWidth(settings.leftSignerName);
    doc.line(leftX, finalY + 0.8, leftX + Math.max(leftNameWidth, 50), finalY + 0.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(settings.leftSignerPangkatNip, leftX, finalY + 4.5);

    // Right Signer Name & NIP
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(settings.rightSignerName, rightX, finalY);
    const rightNameWidth = doc.getTextWidth(settings.rightSignerName);
    doc.line(rightX, finalY + 0.8, rightX + Math.max(rightNameWidth, 50), finalY + 0.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(settings.rightSignerPangkatNip, rightX, finalY + 4.5);
  }

  // Footnote at bottom of last page
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  const footnoteY = pageHeight - marginBottom;
  doc.text(register.notes || "*) Kejaksaan ditulis hanya di sampul depan.", marginX, footnoteY);

  // Reset text color
  doc.setTextColor(0, 0, 0);

  return doc;
}
