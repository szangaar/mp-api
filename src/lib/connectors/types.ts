// Универсальные типы для коннекторов маркетплейсов

export interface NormalizedStock {
  sku: string;
  externalId?: string;
  barcode?: string;
  name?: string;
  warehouse?: string;
  quantity: number;
  price?: number;
}

export interface NormalizedOrder {
  externalOrderId: string;
  sku?: string;
  status?: string;
  amount?: number;
  quantity?: number;
  createdAtPlatform?: Date;
  raw?: any;
}

export interface ConnectorResult {
  stocks: NormalizedStock[];
  orders: NormalizedOrder[];
}

export interface ConnectorCredentials {
  clientId?: string | null;
  apiKey: string;
}

export class ConnectorError extends Error {
  status?: number;
  body?: string;
  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
