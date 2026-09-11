import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getInvoiceDoc } from "@/lib/invoice-doc";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { PrintBar } from "../../PrintBar";

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("OWNER");
  const { id } = await params;
  const doc = await getInvoiceDoc(id);
  if (!doc) notFound();
  return (
    <div className="min-h-screen bg-neutral-200 print:bg-white">
      <PrintBar title={`ใบแจ้งหนี้ ${doc.invoiceNo}`} />
      <div className="overflow-x-auto p-6 print:p-0">
        <InvoiceDocument doc={doc} />
      </div>
    </div>
  );
}
