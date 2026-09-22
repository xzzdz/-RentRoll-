import { LinkTabs } from "@/components/LinkTabs";

export function BuildingTabs({ buildings, current, basePath }: { buildings: { id: string; name: string }[]; current: string; basePath: string }) {
  return (
    <LinkTabs
      label="เลือกตึก"
      current={current}
      items={buildings.map((b) => ({ key: b.id, href: `${basePath}?b=${b.id}`, label: b.name }))}
    />
  );
}
