export type ShipmentRequest = {
  orderNumber: number;
  name: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  postalCode: string;
  weightKg: number;
  pieces: number;
  declaredValue: number;
  codAmount: number;
  description: string;
};

export type ShipmentResult = { trackingNumber: string; labelUrl: string; test: boolean };

export type TrackingEvent = { date: string; status: string; location: string };

export const shipper = () => ({
  name: process.env.SHIPPER_NAME || "Store",
  phone: process.env.SHIPPER_PHONE || "966500000000",
  city: process.env.SHIPPER_CITY || "الرياض",
  district: process.env.SHIPPER_DISTRICT || "",
  address: process.env.SHIPPER_ADDRESS || "",
  postal: process.env.SHIPPER_POSTAL || "",
});

export function testShipment(prefix: string): ShipmentResult {
  return { trackingNumber: `TEST-${prefix}-${Date.now().toString().slice(-8)}`, labelUrl: "", test: true };
}
