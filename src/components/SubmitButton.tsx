"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof Button> & { pendingText?: string };

/** ปุ่ม submit ที่แสดงสถานะกำลังทำงาน — ใช้กับ <form action={serverAction}> */
export function SubmitButton({ children, pendingText, disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
