const tehranOffsetMinutes = 210;

export function toUtcIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute - tehranOffsetMinutes)).toISOString();
}

export function formatTehran(utc: string) {
  const value = new Date(utc);
  const date = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", dateStyle: "short" }).format(value);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", timeStyle: "short", hour12: false }).format(value);
  return { date, time };
}
