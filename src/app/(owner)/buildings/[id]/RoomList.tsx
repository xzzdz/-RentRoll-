"use client";

import Link from "next/link";
import type { RoomStatus } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { ROOM_TILE } from "@/lib/room-style";
import { cn } from "@/lib/utils";
import { ROOM_STATUS } from "@/components/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteRoom } from "../actions";

export type RoomView = { id: string; number: string; floor: number; status: RoomStatus; typeName: string; locked: boolean };

export function RoomList({ rooms, floors }: { rooms: RoomView[]; floors: number[] }) {
  if (rooms.length === 0) {
    return <p className="bg-card text-muted-foreground rounded-xl border border-dashed p-6 text-center">ยังไม่มีห้องในตึกนี้</p>;
  }

  const count = (s: RoomStatus) => rooms.filter((r) => r.status === s).length;

  return (
    <Card>
      <CardContent className="grid gap-3">
        {/* สีเดียวกับหน้าผังห้อง จะได้ไม่ต้องจำสองชุด */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b pb-3 text-[12px]">
          <span className="eyebrow">สถานะห้อง</span>
          {(Object.keys(ROOM_TILE) as RoomStatus[]).map((s) => (
            <span key={s} className="text-muted-foreground inline-flex items-center gap-1.5">
              <i className={cn("inline-block size-4 rounded border", ROOM_TILE[s])} />
              {ROOM_STATUS[s][1]} <span className="num">({count(s)})</span>
            </span>
          ))}
        </div>

        {floors.map((f) => {
          const list = rooms.filter((r) => r.floor === f);
          if (list.length === 0) return null;
          return (
            <div key={f} className="grid gap-1.5 border-t border-dashed pt-3 first:border-0 first:pt-0">
              <div className="eyebrow">
                ชั้น {f} · {list.length} ห้อง
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-1.5">
                {list.map((r) => (
                  <div key={r.id} className={cn("flex items-center gap-1 rounded-lg border px-2 py-1.5", ROOM_TILE[r.status])}>
                    <Link href={`/rooms/${r.id}`} className="min-w-0 flex-1 hover:underline">
                      <span className="font-display num block text-[13.5px] font-bold">{r.number}</span>
                      <span className="block truncate text-[11px] opacity-80">
                        {r.typeName} · {ROOM_STATUS[r.status][1]}
                      </span>
                    </Link>
                    {!r.locked && <DeleteRoomDialog room={r} />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DeleteRoomDialog({ room }: { room: RoomView }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="hover:text-destructive size-7 shrink-0 p-0 opacity-60" aria-label={`ลบห้อง ${room.number}`}>
          <Trash2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ลบห้อง {room.number}?</DialogTitle>
          <DialogDescription>ห้องนี้ยังไม่เคยมีสัญญาหรืองานซ่อม ลบแล้วมิเตอร์ของห้องจะถูกลบไปด้วย</DialogDescription>
        </DialogHeader>
        <form action={deleteRoom}>
          <input type="hidden" name="id" value={room.id} />
          <DialogFooter>
            <SubmitButton variant="destructive" pendingText="กำลังลบ…">
              ลบห้อง
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
