import { aramexTrackingUrl, createAramexShipment, trackAramex } from "./aramex";
import { createSmsaShipment, smsaTrackingUrl, trackSmsa } from "./smsa";
import type { ShipmentRequest } from "./types";

export function createShipment(company: string, r: ShipmentRequest) {
  return company === "aramex" ? createAramexShipment(r) : createSmsaShipment(r);
}

export function trackShipment(company: string, awb: string) {
  return company === "aramex" ? trackAramex(awb) : trackSmsa(awb);
}

export function trackingUrl(company: string, awb: string) {
  if (!awb || awb.startsWith("TEST-")) return "";
  return company === "aramex" ? aramexTrackingUrl(awb) : smsaTrackingUrl(awb);
}
