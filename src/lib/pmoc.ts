export function calcNext(baseISO: string, period: string): string {
  const d = new Date(baseISO + "T00:00:00");
  switch (period) {
    case "mensal":     d.setMonth(d.getMonth() + 1); break;
    case "quinzenal":  d.setDate(d.getDate() + 15); break;
    case "bimestral":  d.setMonth(d.getMonth() + 2); break;
    case "trimestral": d.setMonth(d.getMonth() + 3); break;
    case "semestral":  d.setMonth(d.getMonth() + 6); break;
    case "anual":      d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}
