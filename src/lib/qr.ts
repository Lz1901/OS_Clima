import QRCode from "qrcode";

export async function generateQrDataUrl(text: string, size = 256): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

export function getEquipamentoValidationUrl(equipamentoId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/validar/${equipamentoId}`;
}
