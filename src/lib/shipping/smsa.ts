// سمسا إكسبرس - SMSA eCommerce B2C API
import { CITY_EN } from "../cities";
import { shipper, testShipment, type ShipmentRequest, type ShipmentResult, type TrackingEvent } from "./types";

const base = () => (process.env.SMSA_API_URL || "https://ecomapis.smsaexpress.com").replace(/\/$/, "");
export const smsaConfigured = () => Boolean(process.env.SMSA_API_KEY);

export async function createSmsaShipment(r: ShipmentRequest): Promise<ShipmentResult> {
  if (!smsaConfigured()) return testShipment("SMSA");
  const s = shipper();
  const res = await fetch(`${base()}/api/shipment/b2c/new`, {
    method: "POST",
    headers: { apikey: process.env.SMSA_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      ConsigneeAddress: {
        ContactName: r.name,
        ContactPhoneNumber: r.phone,
        Country: "SA",
        City: CITY_EN[r.city] || r.city,
        District: r.district,
        PostalCode: r.postalCode,
        AddressLine1: r.address,
      },
      ShipperAddress: {
        ContactName: s.name,
        ContactPhoneNumber: s.phone,
        Country: "SA",
        City: CITY_EN[s.city] || s.city,
        District: s.district,
        PostalCode: s.postal,
        AddressLine1: s.address,
      },
      OrderNumber: String(r.orderNumber),
      DeclaredValue: r.declaredValue,
      CODAmount: r.codAmount,
      Parcels: r.pieces,
      ShipDate: new Date().toISOString(),
      ShipmentCurrency: "SAR",
      WaybillType: "PDF",
      Weight: r.weightKg,
      WeightUnit: "KG",
      ContentDescription: r.description.slice(0, 100),
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SMSA: ${res.status} ${text}`);
  const data = JSON.parse(text) as { sawb: string; waybills?: { awb: string; awbFile?: string }[] };
  const awb = data.waybills?.[0]?.awb || data.sawb;
  // ملف البوليصة يأتي PDF بصيغة base64
  const pdf = data.waybills?.[0]?.awbFile;
  return { trackingNumber: awb, labelUrl: pdf ? `data:application/pdf;base64,${pdf}` : "", test: false };
}

export async function trackSmsa(awb: string): Promise<TrackingEvent[]> {
  if (!smsaConfigured() || awb.startsWith("TEST-")) return [];
  const res = await fetch(`${base()}/api/track/single/${encodeURIComponent(awb)}`, {
    headers: { apikey: process.env.SMSA_API_KEY! },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { Scans?: { ScanDateTime: string; ScanDescription: string; City: string }[] };
  return (data.Scans || []).map((s) => ({ date: s.ScanDateTime, status: s.ScanDescription, location: s.City }));
}

export const smsaTrackingUrl = (awb: string) => `https://www.smsaexpress.com/sa/ar/trackingdetails?tracknumbers=${encodeURIComponent(awb)}`;
