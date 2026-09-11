import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2.5">
            <span className="bg-foreground text-background rounded-md px-2 py-0.5 font-display text-[15px] font-bold tracking-wide">บส</span>
            <CardTitle className="text-lg">ระบบจัดการหอพัก</CardTitle>
          </div>
          <CardDescription>สำหรับเจ้าของและช่าง · ผู้เช่าเข้าใช้งานผ่าน LINE</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} />
        </CardContent>
      </Card>
    </main>
  );
}
