import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getInvoiceDoc } from "@/lib/invoice-doc";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { PrintBar } from "../../PrintBar";

export default async function PrintReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("OWNER");
  const { id } = await params;
  const receipt = await db.receipt.findUnique({ where: { id }, include: { payment: { select: { invoiceId: true } } } });
  if (!receipt) notFound();
  const doc = await getInvoiceDoc(receipt.payment.invoiceId);
  if (!doc) notFound();
  return (
    <div className="min-h-screen bg-neutral-200 print:bg-white">
      <PrintBar title={`ใบเสร็จ ${receipt.receiptNo}`} />
      <div className="overflow-x-auto p-6 print:p-0">
        <InvoiceDocument doc={doc} receiptId={receipt.id} />
      </div>
    </div>
  );
}
