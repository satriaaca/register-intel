import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { RegisterDefinition, RegisterEntryRow, AppSettings, Officer } from "../types.js";
import { MONTH_NAMES_ID, formatDateIndonesian, getClosingDateForPeriod } from "./date-utils.js";

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

  // Tentukan tanggal penutupan register aktif
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

  // Inisialisasi dokumen jsPDF
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

  // Map helper untuk lookup petugas
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

  // Susun header tabel (1-level atau 2-level jika ada subColumns)
  const headRows: any[] = [];
  const hasSubCols = register.columns.some((c) => c.subColumns && c.subColumns.length > 0);

  if (!hasSubCols) {
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

  // Susun baris data tabel
  const bodyRows: any[] = [];
  const isDataEmpty = entries.length === 0;

  if (isDataEmpty) {
    // 5 baris kosong bergaris untuk format register NIHIL
    const totalCols = register.columns.reduce(
      (sum, col) => sum + (col.subColumns ? col.subColumns.length : 1),
      0
    );
    for (let i = 0; i < 5; i++) {
      const emptyRow = new Array(totalCols).fill("");
      bodyRows.push(emptyRow);
    }
  } else {
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
  }

  // Fungsi menggambar judul dan kop register
  const drawPageHeader = (docInstance: jsPDF, _pageNum: number) => {
    docInstance.setDrawColor(40, 40, 40);
    docInstance.setLineWidth(0.3);

    // Kode Register di Kanan Atas
    docInstance.setFont("helvetica", "bold");
    docInstance.setFontSize(10);
    docInstance.text(String(register.code || ""), pageWidth - marginX, marginTop + 4, { align: "right" });

    // Satker di Kiri Atas
    docInstance.setFont("helvetica", "bold");
    docInstance.setFontSize(9.5);
    const kejaksaanText = `${String(settings.kejaksaanName || "").toUpperCase()}*)`;
    docInstance.text(kejaksaanText, marginX, marginTop + 4);

    // Judul Register di Tengah
    let currentY = marginTop + 10;
    docInstance.setFont("helvetica", "bold");
    docInstance.setFontSize(11);

    const titleLines = docInstance.splitTextToSize(String(register.title || ""), contentWidth - 40);
    docInstance.text(titleLines, pageWidth / 2, currentY, { align: "center" });
    currentY += titleLines.length * 4.5;

    if (register.subtitle) {
      docInstance.setFont("helvetica", "bold");
      docInstance.setFontSize(8.5);
      const subLines = docInstance.splitTextToSize(String(register.subtitle || ""), contentWidth - 20);
      docInstance.text(subLines, pageWidth / 2, currentY, { align: "center" });
      currentY += subLines.length * 3.8;
    }

    // Periode Register
    docInstance.setFont("helvetica", "bold");
    docInstance.setFontSize(8);
    const periodText = `PERIODE: ${typeof selectedMonth === "number" ? `BULAN ${MONTH_NAMES_ID[selectedMonth - 1].toUpperCase()}` : "SEMUA BULAN"} - TAHUN ${tahunTakwim}`;
    docInstance.text(periodText, pageWidth / 2, currentY, { align: "center" });
    currentY += 3.5;

    return currentY + 2;
  };

  const startY = drawPageHeader(doc, 1);

  // Render tabel menggunakan autoTable
  autoTable(doc, {
    head: headRows,
    body: bodyRows,
    startY: startY,
    margin: { left: marginX, right: marginX, top: marginTop + 24, bottom: marginBottom + 38 },
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: isLandscape ? 7.5 : 8,
      cellPadding: isDataEmpty ? 4 : 2, // Padding 4mm agar 5 baris proporsional & estetis
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
      if (data.pageNumber > 1) {
        drawPageHeader(doc, data.pageNumber);
      }

      // Border luar halaman (Bingkai Register Resmi)
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.4);
      doc.rect(marginX - 4, marginTop - 4, contentWidth + 8, pageHeight - (marginTop + marginBottom) + 8);
    },
  });

  const lastTable = (doc as any).lastAutoTable;
  const tableFinalY = lastTable ? Number(lastTable.finalY) : startY + 45;

  // Render Watermark "N I H I L" 60pt tepat di tengah 5 baris pada halaman 1
  if (isDataEmpty) {
    doc.setPage(1);
    const headerHeightEstimate = hasSubCols ? 18 : 12;
    const tableBodyStartY = startY + headerHeightEstimate;
    const centerY = (tableBodyStartY + tableFinalY) / 2;

    doc.saveGraphicsState();
    doc.setFont("times", "bold");
    doc.setFontSize(60);
    doc.setTextColor(175, 180, 190);
    doc.text("N  I  H  I  L", pageWidth / 2, centerY + 6, {
      align: "center",
    });
    doc.restoreGraphicsState();
  }

  // Pindah ke halaman terakhir untuk tanda tangan
  const totalPages = (doc as any).internal.getNumberOfPages();
  doc.setPage(totalPages);

  let finalY = tableFinalY + 5;

  // Catatan Penutupan Register
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

  // Rekapitulasi jika ada
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

  // Cek ruang penandatanganan
  const signatureHeight = 42;
  if (finalY + signatureHeight > pageHeight - marginBottom - 10) {
    doc.addPage();
    drawPageHeader(doc, (doc as any).internal.getNumberOfPages());
    finalY = marginTop + 25;
  }

  // Tanda Tangan
  const isCenter = settings.signatureAlignment === "center";
  const tglText = `${settings.tempatDokumen}, ${closingDateFormatted}`;

  if (isCenter) {
    const leftCenterX = marginX + contentWidth * 0.25;
    const rightCenterX = marginX + contentWidth * 0.75;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(tglText, rightCenterX, finalY, { align: "center" });
    finalY += 5;

    // Pejabat Kiri
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Mengetahui:", leftCenterX, finalY, { align: "center" });
    finalY += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const leftTitleClean = settings.leftSignerTitle.replace("Mengetahui:\n", "").replace("Mengetahui:", "").trim();
    const leftTitleLines = doc.splitTextToSize(leftTitleClean, 75);
    doc.text(leftTitleLines, leftCenterX, finalY, { align: "center" });

    // Pejabat Kanan
    const rightTitleLines = doc.splitTextToSize(settings.rightSignerTitle, 75);
    doc.text(rightTitleLines, rightCenterX, finalY, { align: "center" });

    finalY += 22;

    // Nama Pejabat Kiri
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(settings.leftSignerName, leftCenterX, finalY, { align: "center" });
    doc.setLineWidth(0.2);
    const leftNameWidth = doc.getTextWidth(settings.leftSignerName);
    doc.line(leftCenterX - leftNameWidth / 2, finalY + 0.8, leftCenterX + leftNameWidth / 2, finalY + 0.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(settings.leftSignerPangkatNip, leftCenterX, finalY + 4.5, { align: "center" });

    // Nama Pejabat Kanan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(settings.rightSignerName, rightCenterX, finalY, { align: "center" });
    const rightNameWidth = doc.getTextWidth(settings.rightSignerName);
    doc.line(rightCenterX - rightNameWidth / 2, finalY + 0.8, rightCenterX + rightNameWidth / 2, finalY + 0.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(settings.rightSignerPangkatNip, rightCenterX, finalY + 4.5, { align: "center" });
  } else {
    const leftX = marginX + (isLandscape ? 20 : 10);
    const rightX = pageWidth - marginX - (isLandscape ? 80 : 70);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(tglText, rightX, finalY);
    finalY += 5;

    // Pejabat Kiri
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Mengetahui:", leftX, finalY);
    finalY += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const leftTitleLines = doc.splitTextToSize(settings.leftSignerTitle.replace("Mengetahui:\n", "").replace("Mengetahui:", ""), 80);
    doc.text(leftTitleLines, leftX, finalY);

    // Pejabat Kanan
    const rightTitleLines = doc.splitTextToSize(settings.rightSignerTitle, 80);
    doc.text(rightTitleLines, rightX, finalY);

    finalY += 22;

    // Nama Pejabat Kiri
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(settings.leftSignerName, leftX, finalY);
    doc.setLineWidth(0.2);
    const leftNameWidth = doc.getTextWidth(settings.leftSignerName);
    doc.line(leftX, finalY + 0.8, leftX + Math.max(leftNameWidth, 50), finalY + 0.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(settings.leftSignerPangkatNip, leftX, finalY + 4.5);

    // Nama Pejabat Kanan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(settings.rightSignerName, rightX, finalY);
    const rightNameWidth = doc.getTextWidth(settings.rightSignerName);
    doc.line(rightX, finalY + 0.8, rightX + Math.max(rightNameWidth, 50), finalY + 0.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(settings.rightSignerPangkatNip, rightX, finalY + 4.5);
  }

  // Catatan Kaki
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  const footnoteY = pageHeight - marginBottom;
  doc.text(register.notes || "*) Kejaksaan ditulis hanya di sampul depan.", marginX, footnoteY);

  doc.setTextColor(0, 0, 0);

  return doc;
}