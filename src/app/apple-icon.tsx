import { ImageResponse } from "next/og";

// iOS ไม่รองรับ SVG บนหน้าโฮม และไม่ทำมุมมนให้เอง จึงต้องเป็น PNG เต็มสี่เหลี่ยม
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** โลโก้เดียวกับ LogoMark — วาดด้วย div เพราะ ImageResponse ไม่รับ path ของ SVG */
export default function AppleIcon() {
  const bar = (width: number) => (
    <div style={{ width, height: 14, borderRadius: 7, background: "#ffffff" }} />
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 18,
          paddingLeft: 45,
          background: "#4f46e5",
        }}
      >
        {bar(90)}
        {bar(65)}
        {bar(39)}
      </div>
    ),
    size,
  );
}
