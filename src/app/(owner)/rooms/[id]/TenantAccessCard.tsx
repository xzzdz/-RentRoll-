"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { formatInviteCode } from "@/lib/invite-code";
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
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/SubmitButton";
import { issueTenantCode } from "./actions";

/**
 * รหัสให้ผู้เช่าเข้าเว็บฝั่งผู้เช่า
 * ผู้เช่าเข้าด้วย รหัสนี้ + เบอร์ที่ให้ไว้ในสัญญา จึงไม่ต้องตั้งรหัสผ่านและไม่ต้องส่ง SMS
 */
export function TenantAccessCard({ tenantId, tenantName, code, back }: { tenantId: string; tenantName: string; code: string | null; back: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(formatInviteCode(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // เบราว์เซอร์บางตัวไม่ให้ก๊อปถ้าไม่ใช่ https — ผู้ใช้ยังอ่านรหัสจากจอไปพิมพ์เองได้
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <span className="eyebrow flex items-center gap-1.5">
        <KeyRound className="size-3.5" aria-hidden /> รหัสเข้าเว็บของผู้เช่า
      </span>

      {code ? (
        <div className="flex flex-wrap items-center gap-2">
          <b className="num bg-muted rounded-md px-3 py-1.5 text-[17px] tracking-[0.18em]">{formatInviteCode(code)}</b>
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {copied ? <Check className="text-ok" /> : <Copy />}
            {copied ? "ก๊อปแล้ว" : "ก๊อปรหัส"}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-[13px]">ยังไม่ได้ออกรหัส — ออกแล้วส่งให้ผู้เช่าเพื่อเข้าดูบิลและแจ้งซ่อมเองได้</p>
      )}

      <p className="text-subtle text-[12px] leading-snug">
        ผู้เช่าเข้าที่หน้า <span className="num">/t/login</span> ด้วยรหัสนี้คู่กับเบอร์โทรของตัวเอง · {tenantName}ต้องใช้เบอร์ที่ให้ไว้ในสัญญาเท่านั้น
      </p>

      {code ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="justify-self-start">
              <RefreshCw /> ออกรหัสใหม่
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ออกรหัสใหม่ให้ {tenantName}?</AlertDialogTitle>
              <AlertDialogDescription>
                รหัสเดิมจะใช้ไม่ได้ทันที ใช้เมื่อผู้เช่าทำรหัสหาย หรือกลัวว่ารหัสหลุดไปถึงคนอื่น · ถ้าเคยเข้าระบบไว้แล้วจะยังไม่ถูกเตะออก แต่ครั้งหน้าต้องใช้รหัสใหม่
              </AlertDialogDescription>
            </AlertDialogHeader>
            <form action={issueTenantCode}>
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="hidden" name="back" value={back} />
              <AlertDialogFooter>
                <AlertDialogCancel type="button">ไม่ออกใหม่</AlertDialogCancel>
                <SubmitButton variant="destructive" pendingText="กำลังออกรหัส…">
                  ออกรหัสใหม่
                </SubmitButton>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <form action={issueTenantCode} className="justify-self-start">
          <input type="hidden" name="tenantId" value={tenantId} />
          <input type="hidden" name="back" value={back} />
          <SubmitButton size="sm" pendingText="กำลังออกรหัส…">
            <KeyRound /> ออกรหัสให้ผู้เช่า
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
