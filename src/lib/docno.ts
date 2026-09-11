import type { DocType, Prisma } from "@prisma/client";
import { periodKey } from "./period";

export const DOC_PREFIX: Record<DocType, string> = {
  INVOICE: "INV",
  RECEIPT: "RC",
  CONTRACT: "CT",
  MAINTENANCE: "MT",
};

/**
 * ออกเลขที่เอกสารรันต่อเนื่องแยกประเภท/เดือน เช่น INV-202609-0001
 * ต้องเรียกภายใน transaction เดียวกับการสร้างเอกสาร (upsert + increment เป็น atomic ใน Postgres)
 */
export async function nextDocNo(tx: Prisma.TransactionClient, propertyId: string, docType: DocType, date: Date) {
  const period = periodKey(date);
  const prefix = DOC_PREFIX[docType];
  const seq = await tx.documentSequence.upsert({
    where: { propertyId_docType_period: { propertyId, docType, period } },
    create: { propertyId, docType, period, prefix, lastNo: 1 },
    update: { lastNo: { increment: 1 } },
  });
  return `${prefix}-${period}-${String(seq.lastNo).padStart(4, "0")}`;
}
