import type { Platform } from "@prisma/client";
import { syncWildberries, pingWildberries } from "./wb";
import { syncOzon, pingOzon } from "./ozon";
import { syncKaspi, pingKaspi } from "./kaspi";
import type { ConnectorCredentials, ConnectorResult } from "./types";

export async function syncByPlatform(
  platform: Platform,
  creds: ConnectorCredentials,
): Promise<ConnectorResult> {
  switch (platform) {
    case "WB":
      return syncWildberries(creds);
    case "OZON":
      return syncOzon(creds);
    case "KASPI":
      return syncKaspi(creds);
    case "FLIP":
      return { stocks: [], orders: [] }; // Flip — только ручной CSV-импорт
    default:
      throw new Error("Unsupported platform: " + platform);
  }
}

export async function pingByPlatform(
  platform: Platform,
  creds: ConnectorCredentials,
): Promise<boolean> {
  switch (platform) {
    case "WB":
      return pingWildberries(creds);
    case "OZON":
      return pingOzon(creds);
    case "KASPI":
      return pingKaspi(creds);
    case "FLIP":
      return true;
    default:
      throw new Error("Unsupported platform: " + platform);
  }
}

export * from "./types";
