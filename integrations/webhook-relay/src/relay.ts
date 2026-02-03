import {
  matchesPattern,
  type WebhookPayload,
} from '@sentinel-unturned/integration-sdk';
import type { IntegrationConfig, PayloadEnvelope } from './types';

/**
 * Options for relay behavior.
 */
export interface RelayOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Result of a relay operation.
 */
export interface RelayResult {
  success: boolean;
  error?: string;
  attempts: number;
  statusCode?: number;
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determines if an HTTP status code should trigger a retry.
 */
function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Check if an event matches any of the configured patterns.
 */
export function matchesEventPatterns(
  event: string,
  patterns: string[] | undefined
): boolean {
  if (!patterns || patterns.length === 0) return true;
  return patterns.some(pattern => matchesPattern(event, pattern));
}

/**
 * Build headers for the relay request.
 */
export function buildRelayHeaders(
  originalHeaders: Record<string, string>,
  config: IntegrationConfig
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Include original Sentinel headers if configured
  if (config.includeOriginalHeaders ?? true) {
    for (const [key, value] of Object.entries(originalHeaders)) {
      if (key.toLowerCase().startsWith('x-sentinel-')) {
        headers[key] = value;
      }
    }
  }

  // Add custom headers
  if (config.customHeaders) {
    for (const [key, value] of Object.entries(config.customHeaders)) {
      headers[key] = value;
    }
  }

  // Add secret header if configured
  if (config.secretHeader && config.secretValue) {
    headers[config.secretHeader] = config.secretValue;
  }

  return headers;
}

/**
 * Transform payload into envelope format if configured.
 */
export function transformPayload(
  payload: WebhookPayload,
  transform: boolean
): WebhookPayload | PayloadEnvelope {
  if (!transform) return payload;

  return {
    source: 'sentinel',
    event: payload.event,
    timestamp: payload.timestamp,
    organizationId: payload.organizationId,
    userId: payload.userId,
    data: payload.data,
  };
}

/**
 * Send a relay request with retry logic.
 */
export async function sendRelayRequest(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  options?: RelayOptions
): Promise<RelayResult> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const timeoutMs = options?.timeoutMs ?? 30000;

  let lastError = '';
  let lastStatusCode: number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastStatusCode = response.status;

      if (response.ok) {
        return { success: true, attempts: attempt, statusCode: response.status };
      }

      const text = await response.text().catch(() => 'Unknown error');
      lastError = `HTTP ${response.status}: ${text}`;

      if (!shouldRetry(response.status)) {
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          statusCode: response.status,
        };
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          lastError = `Request timeout (${timeoutMs}ms)`;
        } else {
          lastError = err.message;
        }
      } else {
        lastError = 'Unknown error';
      }
    }

    if (attempt < maxAttempts) {
      const delay = baseDelayMs * Math.pow(2, attempt - 2);
      if (delay > 0) {
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
    statusCode: lastStatusCode,
  };
}
