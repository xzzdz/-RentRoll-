"use client";

import { useState } from "react";
import { Check, EyeOff, Megaphone, Pencil, Pin, Trash2, X } from "lucide-react";
import { Field } from "@/components/Field";
import { SubmitButton } from "@/components/SubmitButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { deleteAnnouncement, togglePublish, updateAnnouncement } from "./actions";
import type { BuildingOption } from "./AnnouncementForm";

export type AnnouncementView = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  buildingId: string | null;
  buildingName: string | null;
  expiresAt: string;
  expiresLabel: string | null;
  expired: boolean;
  publishedLabel: string | null;
};

export function AnnouncementRow({ item, buildings }: { item: AnnouncementView; buildings: BuildingOption[] }) {
  const [editing, setEditing] = useState(false);
  const published = item.publishedLabel != null;

  if (!editing) {
    return (
      <Card className={published && !item.expired ? "" : "opacity-70"}>
        <CardContent className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {item.pinned && <Pin className="text-primary size-3.5" aria-label="ปักหมุด" />}
            <b className="font-display min-w-0 flex-1 text-[15px]">{item.title}</b>
            {!published && <Badge variant="muted">ฉบับร่าง</Badge>}
            {item.expired && <Badge variant="warn">หมดอายุแล้ว</Badge>}
            {published && !item.expired && <Badge variant="ok">แสดงอยู่</Badge>}
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} aria-label={`แก้ไข ${item.title}`}>
              <Pencil />
            </Button>
          </div>

          <p className="text-muted-foreground line-clamp-3 text-[13.5px] whitespace-pre-line">{item.body}</p>

          <div className="text-subtle flex flex-wrap items-center gap-x-2 text-[11.5px]">
            <span>{item.buildingName ? `เฉพาะ${item.buildingName}` : "ทุกตึก"}</span>
            {item.publishedLabel && <span>· ประกาศ {item.publishedLabel}</span>}
            {item.expiresLabel && <span>· แสดงถึง {item.expiresLabel}</span>}
          </div>

          <form action={togglePublish} className="border-t pt-2">
            <input type="hidden" name="id" value={item.id} />
            <SubmitButton variant={published ? "outline" : "default"} size="sm">
              {published ? <EyeOff /> : <Megaphone />}
              {published ? "เก็บกลับเป็นร่าง" : "ประกาศขึ้นบอร์ด"}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent>
        <form action={updateAnnouncement} className="grid gap-3">
          <input type="hidden" name="id" value={item.id} />
          <Field id={`t_${item.id}`} label="หัวข้อ">
            <Input id={`t_${item.id}`} name="title" defaultValue={item.title} required maxLength={120} />
          </Field>
          <Field id={`b_${item.id}`} label="เนื้อหา">
            <Textarea id={`b_${item.id}`} name="body" defaultValue={item.body} rows={5} required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`bd_${item.id}`} label="ประกาศถึง">
              <Select name="buildingId" defaultValue={item.buildingId ?? undefined}>
                <SelectTrigger id={`bd_${item.id}`}>
                  <SelectValue placeholder="ทุกตึก" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      เฉพาะ{b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id={`e_${item.id}`} label="แสดงถึงวันที่" hint="เว้นว่าง = แสดงตลอด">
              <Input id={`e_${item.id}`} name="expiresAt" type="date" defaultValue={item.expiresAt} />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id={`p_${item.id}`} name="pinned" defaultChecked={item.pinned} />
            <Label htmlFor={`p_${item.id}`} className="font-normal">
              ปักหมุดไว้บนสุด
            </Label>
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              <X /> ยกเลิก
            </Button>
            <SubmitButton pendingText="กำลังบันทึก…">
              <Check /> บันทึก
            </SubmitButton>
          </div>
        </form>

        {/* ฟอร์มลบต้องอยู่นอกฟอร์มแก้ไข — HTML ซ้อน form ไม่ได้ */}
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="text-destructive mt-2">
              <Trash2 /> ลบประกาศนี้
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ลบ &ldquo;{item.title}&rdquo;?</DialogTitle>
              <DialogDescription>ลบแล้วกู้คืนไม่ได้ ถ้าแค่อยากซ่อนจากบอร์ดให้กด &ldquo;เก็บกลับเป็นร่าง&rdquo; แทน</DialogDescription>
            </DialogHeader>
            <form action={deleteAnnouncement}>
              <input type="hidden" name="id" value={item.id} />
              <DialogFooter>
                <SubmitButton variant="destructive" pendingText="กำลังลบ…">
                  ลบประกาศ
                </SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
