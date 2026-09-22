"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SubmitButton } from "@/components/SubmitButton";

/**
 * กล่องยืนยันก่อนลบ — ใช้ AlertDialog ไม่ใช่ Dialog ธรรมดา
 * เพราะเป็นการถามให้ตัดสินใจ โฟกัสจึงต้องไปตกที่ปุ่ม "ไม่ลบ" และปิดด้วยการกดพื้นหลังไม่ได้
 *
 * ปุ่มยืนยันเป็น submit ของฟอร์มที่ยิง server action ตรง ๆ (ไม่ใช่ AlertDialogAction)
 * เพื่อให้ปุ่มขึ้นสถานะ "กำลังลบ…" ได้จริง และกล่องไม่ปิดหนีไปก่อนที่งานจะเสร็จ
 */
export function ConfirmDelete({
  trigger,
  title,
  description,
  confirmText,
  pendingText = "กำลังลบ…",
  cancelText = "ไม่ลบ",
  action,
  fields,
}: {
  trigger: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmText: string;
  pendingText?: string;
  cancelText?: string;
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form action={action}>
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">{cancelText}</AlertDialogCancel>
            <SubmitButton variant="destructive" pendingText={pendingText}>
              {confirmText}
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
