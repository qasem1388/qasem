// أرامكس - Aramex Shipping Services API (JSON)
import { CITY_EN } from "../cities";
import { shipper, testShipment, type ShipmentRequest, type ShipmentResult, type TrackingEvent } from "./types";

const base = () => (process.env.ARAMEX_API_URL || "https://ws.aramex.net/ShippingAPI.V2").replace(/\/$/, "");
export const aramexConfigured = () => Boolean(process.env.ARAMEX_USERNAME && process.env.ARAMEX_ACCOUNT_NUMBER);

const clientInfo = () => ({
  UserName: process.env.ARAMEX_USERNAME,
  Password: process.env.ARAMEX_PASSWORD,
  Version: "v1.0",
  AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,
  AccountPin: process.env.ARAMEX_ACCOUNT_PIN,
  AccountEntity: process.env.ARAMEX_ACCOUNT_ENTITY || "RUH",
  AccountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY || "SA",
  Source: 24,
});

const party = (p: { name: string; phone: string; city: string; address: string; postal: string; account?: string }) => ({
  Reference1: "",
  AccountNumber: p.account || "",
  PartyAddress: {
    Line1: p.address || p.city,
    City: CITY_EN[p.city] || p.city,
    PostCode: p.postal,
    CountryCode: "SA",
  },
  Contact: { PersonName: p.name, CompanyName: p.name, PhoneNumber1: p.phone, CellPhone: p.phone, EmailAddress: "" },
});

export async function createAramexShipment(r: ShipmentRequest): Promise<ShipmentResult> {
  if (!aramexConfigured()) return testShipment("ARX");
  const s = shipper();
  const now = Date.now();
  const body = {
    ClientInfo: clientInfo(),
    LabelInfo: { ReportID: 9201, ReportType: "URL" },
    Shipments: [
      {
        Reference1: String(r.orderNumber),
        Shipper: party({ ...s, postal: s.postal, account: process.env.ARAMEX_ACCOUNT_NUMBER }),
        Consignee: party({ name: r.name, phone: r.phone, city: r.city, address: `${r.district} ${r.address}`.trim(), postal: r.postalCode }),
        ShippingDateTime: `/Date(${now})/`,
        DueDate: `/Date(${now + 5 * 86400000})/`,
        Details: {
          ActualWeight: { Unit: "KG", Value: r.weightKg },
          ChargeableWeight: { Unit: "KG", Value: r.weightKg },
          DescriptionOfGoods: r.description.slice(0, 100),
          GoodsOriginCountry: "SA",
          NumberOfPieces: r.pieces,
          ProductGroup: "DOM",
          ProductType: "CDS",
          PaymentType: "P",
          Services: r.codAmount > 0 ? "CODS" : "",
          CashOnDeliveryAmount: r.codAmount > 0 ? { CurrencyCode: "SAR", Value: r.codAmount } : null,
          CustomsValueAmount: { CurrencyCode: "SAR", Value: r.declaredValue },
        },
      },
    ],
    Transaction: { Reference1: String(r.orderNumber) },
  };
  const res = await fetch(`${base()}/Shipping/Service_1_0.svc/json/CreateShipments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    HasErrors: boolean;
    Notifications?: { Message: string }[];
    Shipments?: { ID: string; HasErrors: boolean; Notifications?: { Message: string }[]; ShipmentLabel?: { LabelURL: string } }[];
  };
  const shipment = data.Shipments?.[0];
  if (!res.ok || data.HasErrors || !shipment || shipment.HasErrors) {
    const msg = [...(data.Notifications || []), ...(shipment?.Notifications || [])].map((n) => n.Message).join(" | ");
    throw new Error(`Aramex: ${msg || res.status}`);
  }
  return { trackingNumber: shipment.ID, labelUrl: shipment.ShipmentLabel?.LabelURL || "", test: false };
}

export async function trackAramex(awb: string): Promise<TrackingEvent[]> {
  if (!aramexConfigured() || awb.startsWith("TEST-")) return [];
  const res = await fetch(`${base()}/Tracking/Service_1_0.svc/json/TrackShipments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ClientInfo: clientInfo(), Shipments: [awb], GetLastTrackingUpdateOnly: false }),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    TrackingResults?: { Value: { UpdateDateTime: string; UpdateDescription: string; UpdateLocation: string }[] }[];
  };
  return (data.TrackingResults?.[0]?.Value || []).map((v) => ({
    date: v.UpdateDateTime,
    status: v.UpdateDescription,
    location: v.UpdateLocation,
  }));
}

export const aramexTrackingUrl = (awb: string) => `https://www.aramex.com/sa/ar/track/results?ShipmentNumber=${encodeURIComponent(awb)}`;
