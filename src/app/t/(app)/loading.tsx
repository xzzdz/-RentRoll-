import { PageSkeleton } from "@/components/Skeleton";

/** ฝั่งผู้เช่าเป็นจอแคบ ไม่มีแถว KPI สี่ช่องเหมือนฝั่งเจ้าของ */
export default function Loading() {
  return <PageSkeleton kpis={2} rows={4} />;
}
