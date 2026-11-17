// "ใช้มาแล้ว 25 นาที" style duration text.
export function usedFor(checkedInAt: string, nowMs: number): string {
  const mins = Math.max(0, Math.floor((nowMs - new Date(checkedInAt).getTime()) / 60000));
  if (mins < 1) return "ใช้มาแล้วไม่ถึง 1 นาที";
  if (mins < 60) return `ใช้มาแล้ว ${mins} นาที`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `ใช้มาแล้ว ${h} ชม.` : `ใช้มาแล้ว ${h} ชม. ${m} นาที`;
}
