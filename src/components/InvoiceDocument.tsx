import type { InvoiceDoc } from "@/lib/invoice-doc";
import { bahtText, money, thDate, thPeriod } from "@/lib/format";

const METHOD_TH = { CASH: "เงินสด", TRANSFER: "โอนเงิน", PROMPTPAY: "PromptPay" } as const;

/**
 * ใบแจ้งหนี้ / ใบเสร็จรับเงิน (ไม่ใช่ใบกำกับภาษี) — รูปแบบมาตรฐาน A4
 * receiptId ระบุ → แสดงเป็นใบเสร็จของการชำระครั้งนั้น
 */
export function InvoiceDocument({ doc, receiptId }: { doc: InvoiceDoc; receiptId?: string }) {
  const payment = receiptId ? doc.payments.find((p) => p.receipt?.id === receiptId) : undefined;
  const receipt = payment?.receipt;
  const isReceipt = !!receipt;
  const amount = isReceipt ? receipt.amount : doc.total;
  const outstanding = doc.total - doc.paidAmount;

  return (
    <article className="mx-auto w-full max-w-[794px] min-w-[640px] bg-white p-10 text-[13px] leading-relaxed text-neutral-900 shadow-sm print:max-w-none print:min-w-0 print:p-0 print:shadow-none">
      <header className="flex justify-between gap-6 border-b-2 border-neutral-900 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold">{doc.property.name}</h1>
          <p>{doc.property.address}</p>
          {doc.property.phone && <p>โทร {doc.property.phone}</p>}
          {doc.property.taxId && <p>เลขประจำตัวผู้เสียภาษี {doc.property.taxId}</p>}
        </div>
        <div className="text-right">
          <h2 className="font-display text-xl font-bold">{isReceipt ? "ใบเสร็จรับเงิน" : "ใบแจ้งหนี้"}</h2>
          <p className="tracking-widest text-neutral-500">{isReceipt ? "RECEIPT" : "INVOICE"}</p>
          {isReceipt && receipt.voidedAt && <p className="mt-1 font-bold text-red-700">ยกเลิกแล้ว</p>}
          {!isReceipt && doc.status === "DRAFT" && <p className="mt-1 font-bold text-neutral-500">ร่าง</p>}
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1">
        <p>
          <b>ผู้เช่า:</b> {doc.tenant.name}
        </p>
        <p>
          <b>เลขที่:</b> <span className="num">{isReceipt ? receipt.receiptNo : doc.invoiceNo}</span>
        </p>
        <p>
          <b>ห้อง:</b> {doc.room.number} ({doc.room.typeName})
        </p>
        <p>
          <b>วันที่:</b> {isReceipt ? thDate(payment!.paidAt) : doc.issueDate ? thDate(doc.issueDate) : "—"}
        </p>
        {doc.tenant.address && (
          <p className="col-span-1">
            <b>ที่อยู่:</b> {doc.tenant.address}
          </p>
        )}
        <p>
          <b>รอบบิล:</b> {doc.periodMonth ? thPeriod(doc.periodMonth) : "—"}
        </p>
        <p>
          {isReceipt ? (
            <>
              <b>อ้างอิงใบแจ้งหนี้:</b> <span className="num">{doc.invoiceNo}</span>
            </>
          ) : (
            <>
              <b>ครบกำหนดชำระ:</b> {doc.dueDate ? thDate(doc.dueDate) : "—"}
            </>
          )}
        </p>
      </section>

      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="border-b border-neutral-500 bg-neutral-100 text-left text-xs">
            <th className="px-2 py-1.5">#</th>
            <th className="px-2 py-1.5">รายการ</th>
            <th className="px-2 py-1.5 text-right">เลขก่อน</th>
            <th className="px-2 py-1.5 text-right">เลขหลัง</th>
            <th className="px-2 py-1.5 text-right">จำนวน</th>
            <th className="px-2 py-1.5 text-right">ราคา/หน่วย</th>
            <th className="px-2 py-1.5 text-right">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((it, i) => (
            <tr key={it.id} className="border-b border-neutral-200">
              <td className="px-2 py-1.5">{i + 1}</td>
              <td className="px-2 py-1.5">{it.description}</td>
              <td className="num px-2 py-1.5 text-right">{it.prevReading != null ? money(it.prevReading, 0) : ""}</td>
              <td className="num px-2 py-1.5 text-right">{it.currReading != null ? money(it.currReading, 0) : ""}</td>
              <td className="num px-2 py-1.5 text-right">{money(it.quantity, it.quantity % 1 ? 2 : 0)}</td>
              <td className="num px-2 py-1.5 text-right">{money(it.unitPrice)}</td>
              <td className="num px-2 py-1.5 text-right">{money(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-3 flex items-start justify-between gap-6">
        <div className="flex-1 rounded bg-neutral-100 px-3 py-2">
          <b>({bahtText(amount)})</b>
        </div>
        <div className="min-w-[240px]">
          <div className="flex justify-between py-0.5">
            <span>รวมเป็นเงิน</span>
            <span className="num">{money(doc.total)}</span>
          </div>
          {isReceipt ? (
            <>
              <div className="flex justify-between py-0.5">
                <span>ชำระครั้งนี้</span>
                <span className="num">{money(receipt.amount)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-neutral-900 pt-1.5 text-[15px] font-bold">
                <span>รับเงินสุทธิ</span>
                <span className="num">{money(receipt.amount)}</span>
              </div>
            </>
          ) : (
            <>
              {doc.paidAmount > 0 && (
                <div className="flex justify-between py-0.5">
                  <span>ชำระแล้ว</span>
                  <span className="num">-{money(doc.paidAmount)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t border-neutral-900 pt-1.5 text-[15px] font-bold">
                <span>ยอดที่ต้องชำระ</span>
                <span className="num">{money(outstanding)}</span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="mt-4 text-[12.5px]">
        {isReceipt ? (
          <p>
            ชำระโดย: {METHOD_TH[payment!.method]} · วันที่ {thDate(payment!.paidAt)}
            {payment!.note ? ` · ${payment!.note}` : ""}
          </p>
        ) : (
          <p>
            ช่องทางชำระ:{" "}
            {[doc.property.promptPayId && `PromptPay ${doc.property.promptPayId}`, doc.property.bank].filter(Boolean).join(" · ") || "ติดต่อสำนักงาน"}
          </p>
        )}
        {doc.property.footer && <p className="mt-1 text-neutral-600">{doc.property.footer}</p>}
      </section>

      <footer className="mt-14 grid grid-cols-2 gap-16 text-center">
        <div className="border-t border-dotted border-neutral-500 pt-1.5">{isReceipt ? "ผู้รับเงิน" : "ผู้ออกใบแจ้งหนี้"}</div>
        <div className="border-t border-dotted border-neutral-500 pt-1.5">{isReceipt ? "ผู้จ่ายเงิน" : "ผู้รับใบแจ้งหนี้"}</div>
      </footer>
    </article>
  );
}
