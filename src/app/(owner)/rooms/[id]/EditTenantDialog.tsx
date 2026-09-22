"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { updateTenant } from "./actions";

export type TenantInfo = {
  id: string;
  fullName: string;
  phone: string;
  idCardMasked: string | null;
  address: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
};

/** แก้ข้อมูลผู้เช่ารายคน — เปิดจากหน้าห้องและหน้ารายชื่อผู้เช่า */
export function EditTenantDialog({ tenant, back, label = "แก้ข้อมูล" }: { tenant: TenantInfo; back: string; label?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {/* ในตารางและการ์ดใช้ไอคอนเปล่า ๆ ไม่งั้นแถวจะยาวเกิน — แต่ต้องมีชื่อให้ screen reader เสมอ */}
        <Button
          variant="ghost"
          size={label ? "sm" : "icon-sm"}
          aria-label={label ? undefined : `แก้ข้อมูล ${tenant.fullName}`}
          className="text-muted-foreground hover:text-foreground -my-1"
        >
          <Pencil className="size-3.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ข้อมูล {tenant.fullName}</DialogTitle>
          <DialogDescription>
            ข้อมูลชุดนี้ใช้ในสัญญาและใบเสร็จ · เบอร์โทรใช้ล็อกอินเข้าเว็บฝั่งผู้เช่าคู่กับรหัสเข้าใช้งาน แก้แล้วต้องใช้เบอร์ใหม่เข้า
          </DialogDescription>
        </DialogHeader>

        <form action={updateTenant} className="grid gap-3">
          <input type="hidden" name="tenantId" value={tenant.id} />
          <input type="hidden" name="back" value={back} />

          <Field id={`name_${tenant.id}`} label="ชื่อ-นามสกุล">
            <Input id={`name_${tenant.id}`} name="fullName" defaultValue={tenant.fullName} required />
          </Field>

          <Field id={`phone_${tenant.id}`} label="เบอร์โทร" hint="ใช้ล็อกอินฝั่งผู้เช่า — ต้องเป็นเบอร์ที่ผู้เช่าใช้จริง">
            <Input id={`phone_${tenant.id}`} name="phone" type="tel" inputMode="tel" defaultValue={tenant.phone} className="num" required />
          </Field>

          <Field
            id={`idcard_${tenant.id}`}
            label="เลขบัตรประชาชน"
            hint={tenant.idCardMasked ? `ปัจจุบัน ${tenant.idCardMasked} · เว้นว่างไว้ถ้าไม่เปลี่ยน` : "ยังไม่ได้บันทึกไว้ · ใส่ 13 หลักถ้าต้องการเก็บ"}
          >
            <Input id={`idcard_${tenant.id}`} name="idCardNo" inputMode="numeric" maxLength={17} className="num" placeholder="ไม่เปลี่ยน" />
          </Field>

          <Field id={`addr_${tenant.id}`} label="ที่อยู่ตามบัตร" hint="ใช้พิมพ์ในสัญญา">
            <Input id={`addr_${tenant.id}`} name="address" defaultValue={tenant.address ?? ""} placeholder="ไม่ใส่ก็ได้" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`emname_${tenant.id}`} label="ผู้ติดต่อฉุกเฉิน">
              <Input id={`emname_${tenant.id}`} name="emergencyName" defaultValue={tenant.emergencyName ?? ""} placeholder="ไม่ใส่ก็ได้" />
            </Field>
            <Field id={`emphone_${tenant.id}`} label="เบอร์ผู้ติดต่อฉุกเฉิน">
              <Input
                id={`emphone_${tenant.id}`}
                name="emergencyPhone"
                type="tel"
                inputMode="tel"
                defaultValue={tenant.emergencyPhone ?? ""}
                className="num"
                placeholder="ไม่ใส่ก็ได้"
              />
            </Field>
          </div>

          <DialogFooter>
            <SubmitButton pendingText="กำลังบันทึก…">บันทึก</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
