// Xendit API client — server-side only
// Uses Basic Auth: secret key as username, empty password (Base64 encoded)
// Docs: https://docs.xendit.co/apidocs

import { env } from '@/env';

function getAuthHeader(): string {
  const credentials = `${env.XENDIT_SECRET_KEY}:`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

async function xenditFetch<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`https://api.xendit.co${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Xendit API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export interface XenditInvoiceParams {
  externalId: string;
  amount: number;
  currency: string;
  payerEmail: string;
  description: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
}

export interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  status: string;
  invoice_url: string;
  amount: number;
  currency: string;
  expiry_date: string;
}

export async function createInvoice(params: XenditInvoiceParams): Promise<XenditInvoiceResponse> {
  return xenditFetch<XenditInvoiceResponse>('/v2/invoices', {
    method: 'POST',
    body: JSON.stringify({
      external_id: params.externalId,
      amount: params.amount,
      currency: params.currency,
      payer_email: params.payerEmail,
      description: params.description,
      ...(params.successRedirectUrl !== undefined ? { success_redirect_url: params.successRedirectUrl } : {}),
      ...(params.failureRedirectUrl !== undefined ? { failure_redirect_url: params.failureRedirectUrl } : {}),
    }),
  });
}

export interface XenditRefundParams {
  invoiceId: string;
  amount: number;
  reason: string;
}

export interface XenditRefundResponse {
  id: string;
  invoice_id: string;
  amount: number;
  status: string;
  reason: string;
  created: string;
}

export async function createRefund(params: XenditRefundParams): Promise<XenditRefundResponse> {
  return xenditFetch<XenditRefundResponse>('/refunds', {
    method: 'POST',
    body: JSON.stringify({
      invoice_id: params.invoiceId,
      amount: params.amount,
      reason: params.reason,
    }),
  });
}
