import { db } from "@/lib/db";
import { PageHead } from "@/components/PageHead";
import { BillingForm } from "./BillingForm";

export default async function BillingSettingsPage() {
  const property = await db.property.findFirstOrThrow({ include: { billingSetting: true } });
  const st = property.billingSetting;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="รอบบิล & ค่าปรับ" sub="กำหนดว่าระบบจะสร้างบิล ส่งบิล และคิดค่าปรับวันไหนของเดือน" />
      <BillingForm
        setting={{
          billingDay: st?.billingDay ?? 25,
          issueDay: st?.issueDay ?? 1,
          dueDay: st?.dueDay ?? 5,
          autoIssue: st?.autoIssue ?? false,
          prorateFirstMonth: st?.prorateFirstMonth ?? true,
          lateFeeMode: st?.lateFeeMode ?? "NONE",
          lateFeeAmount: st?.lateFeeAmount ? st.lateFeeAmount.toNumber() : null,
          lateFeeMax: st?.lateFeeMax ? st.lateFeeMax.toNumber() : null,
          graceDays: st?.graceDays ?? 0,
        }}
      />
    </div>
  );
}
