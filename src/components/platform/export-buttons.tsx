"use client";
import { Icon } from "@/components/ui/icons";
import { type ReportRow, reportCsv, reportPdf } from "@/lib/report";

function save(data: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Téléchargement du compte de résultat (Excel ou PDF), généré dans le navigateur à partir des chiffres de la page. */
export function ExportButtons({ store, title, file, rows, total }: { store: string; title: string; file: string; rows: ReportRow[]; total: ReportRow }) {
  return (
    <>
      <button type="button" className="nx-btn" onClick={() => save(reportCsv([...rows, total]), "text/csv;charset=utf-8", `${file}.csv`)}><Icon name="download" size={16} /> Excel</button>
      <button type="button" className="nx-btn dark" onClick={() => save(reportPdf(store, title, rows, total) as BlobPart, "application/pdf", `${file}.pdf`)}><Icon name="download" size={16} /> PDF</button>
    </>
  );
}
