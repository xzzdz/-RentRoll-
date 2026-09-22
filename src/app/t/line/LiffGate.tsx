"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { AlertTriangle, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/Field";
import { lineLogin, linkLineAccount, type LineLoginState } from "./actions";

/** ส่วนของ LIFF SDK ที่เราใช้จริง — ประกาศเองเพราะโหลดจาก CDN ไม่ได้มาจาก npm */
type Liff = {
  init(config: { liffId: string }): Promise<void>;
  isLoggedIn(): boolean;
  login(options?: { redirectUri?: string }): void;
  getIDToken(): string | null;
};
declare global {
  interface Window {
    liff?: Liff;
  }
}

type Phase = "booting" | "verifying" | "link" | "failed";

export function LiffGate({ liffId }: { liffId: string }) {
  const [state, action] = useActionState<LineLoginState, FormData>(lineLogin, undefined);
  const [linkState, linkAction, linking] = useActionState<LineLoginState, FormData>(linkLineAccount, undefined);
  const [idToken, setIdToken] = useState("");
  const [phase, setPhase] = useState<Phase>("booting");
  const [fatal, setFatal] = useState("");
  const autoForm = useRef<HTMLFormElement>(null);
  const sent = useRef(false);

  // SDK พร้อมแล้วค่อยเริ่ม — เรียกก่อนหน้านั้น window.liff จะยังไม่มี
  async function boot() {
    const liff = window.liff;
    if (!liff) return setFatal("โหลด LINE SDK ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่"), setPhase("failed");
    try {
      await liff.init({ liffId });
      if (!liff.isLoggedIn()) return liff.login(); // เด้งไปหน้า LINE แล้วกลับมาที่หน้านี้เอง
      const token = liff.getIDToken();
      if (!token) {
        setFatal("ไม่ได้รับข้อมูลยืนยันตัวตนจาก LINE — ตรวจว่าเปิดสิทธิ์ openid ให้ LIFF แล้ว");
        return setPhase("failed");
      }
      setIdToken(token);
      setPhase("verifying");
    } catch (e) {
      setFatal(e instanceof Error ? e.message : "เชื่อมต่อ LINE ไม่สำเร็จ");
      setPhase("failed");
    }
  }

  // ได้ token แล้วยิงเข้าเซิร์ฟเวอร์ทันที ผู้เช่าไม่ต้องกดอะไรเลยถ้าเคยผูกไว้แล้ว
  useEffect(() => {
    if (!idToken || sent.current) return;
    sent.current = true;
    autoForm.current?.requestSubmit();
  }, [idToken]);

  useEffect(() => {
    if (state?.needLink || linkState?.needLink) setPhase("link");
    else if (state?.error) setPhase("failed"), setFatal(state.error);
  }, [state, linkState]);

  return (
    <>
      <Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" onReady={() => void boot()} onError={() => (setFatal("โหลด LINE SDK ไม่สำเร็จ"), setPhase("failed"))} />

      {/* ฟอร์มที่ยิงเอง ไม่ต้องให้ผู้ใช้เห็น */}
      <form ref={autoForm} action={action} hidden>
        <input type="hidden" name="idToken" value={idToken} />
      </form>

      {(phase === "booting" || phase === "verifying") && (
        <div role="status" className="grid justify-items-center gap-3 py-10 text-center">
          <Loader2 className="text-primary size-7 animate-spin" aria-hidden />
          <p className="text-muted-foreground text-[13.5px]">
            {phase === "booting" ? "กำลังเชื่อมต่อ LINE…" : "กำลังตรวจสอบบัญชี…"}
          </p>
        </div>
      )}

      {phase === "link" && (
        <form action={linkAction} className="grid gap-4">
          <input type="hidden" name="idToken" value={idToken} />
          <div className="bg-muted grid gap-1 rounded-lg p-3">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold">
              <KeyRound className="size-4" aria-hidden /> ผูกบัญชีครั้งแรก
            </span>
            <p className="text-muted-foreground text-[12.5px] leading-snug">
              กรอกรหัสที่ได้จากสำนักงานหนึ่งครั้ง ครั้งต่อไปเปิดจาก LINE แล้วเข้าได้เลย
            </p>
          </div>

          <Field id="code" label="รหัสเข้าใช้งาน">
            <Input id="code" name="code" required autoFocus autoComplete="one-time-code" className="num h-12 tracking-[0.18em] uppercase" placeholder="XXXX-XXXX" />
          </Field>
          <Field id="phone" label="เบอร์โทรที่ให้ไว้ในสัญญา">
            <Input id="phone" name="phone" type="tel" inputMode="tel" required className="num h-12" placeholder="08xxxxxxxx" />
          </Field>

          {linkState?.error && (
            <p role="alert" className="bg-bad-soft text-destructive rounded-md px-3 py-2 text-[13px]">
              {linkState.error}
            </p>
          )}

          <Button type="submit" disabled={linking} className="h-12 text-[15px]">
            {linking && <Loader2 className="animate-spin" />}
            {linking ? "กำลังผูกบัญชี…" : "ผูกบัญชีและเข้าใช้งาน"}
          </Button>
        </form>
      )}

      {phase === "failed" && (
        <div className="grid justify-items-center gap-3 py-8 text-center">
          <span className="bg-bad-soft text-destructive grid size-11 place-items-center rounded-full">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <p className="text-[13.5px] leading-relaxed">{fatal || "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ"}</p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <Button onClick={() => location.reload()}>ลองใหม่</Button>
            <Button variant="outline" asChild>
              <Link href="/t/login">เข้าด้วยรหัสแทน</Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
