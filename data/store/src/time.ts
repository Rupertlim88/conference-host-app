const formats = new Map<string, Intl.DateTimeFormat>();

/** Minutes the zone is ahead of UTC at an instant: -360 for Denver in October. */
function offsetMinutes(instantMs: number, timeZone: string): number {
  let format = formats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" });
    formats.set(timeZone, format);
  }
  const name = format.formatToParts(new Date(instantMs)).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** The instant when clocks in timeZone show date (YYYY-MM-DD) and time (HH:MM, 24-hour). */
export function zonedInstant(date: string, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const [h, mi] = time.split(":").map(Number) as [number, number];
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const first = wall - offsetMinutes(wall, timeZone) * 60_000;
  return new Date(wall - offsetMinutes(first, timeZone) * 60_000);
}
