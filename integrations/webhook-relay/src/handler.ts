import {
  verifyWebhookSignature,
  successResponse,
  errorResponse,
  type WebhookPayload,
  type WebhookResponse,
} from '@sentinel-unturned/integration-sdk';
import type { HandlerContext } from './types';
import {
  matchesEventPatterns,
  buildRelayHeaders,
  transformPayload,
  sendRelayRequest,
  type RelayResult,
} from './relay';

/**
 * Formats success message, including attempt count if retries occurred.
 */
function formatSuccessMessage(result: RelayResult): string {
  const base = `Relayed to ${result.statusCode ? `(${result.statusCode})` : 'target'}`;
  return result.attempts > 1
    ? `${base} (${result.attempts} attempts)`
    : base;
}

/**
 * Formats error message with attempt count.
 */
function formatErrorMessage(result: RelayResult): string {
  return `Relay failed after ${result.attempts} attempt${result.attempts !== 1 ? 's' : ''}: ${result.error}`;
}

/**
 * Creates a webhook handler for relaying Sentinel events.
 *
 * @param ctx - Handler context containing config and optional webhook secret
 * @returns Async function to handle incoming webhooks
 */
export function createHandler(ctx: HandlerContext) {
  /**
   * Main handler function for incoming webhooks.
   */
  return async function handleWebhook(
    rawBody: string,
    headers: Record<string, string>
  ): Promise<WebhookResponse> {
    // Verify signature if secret is configured
    if (ctx.webhookSecret) {
      const signature = headers['x-sentinel-signature'];
      if (!signature) {
        return errorResponse('Missing signature header');
      }
      if (!verifyWebhookSignature(rawBody, signature, ctx.webhookSecret)) {
        return errorResponse('Invalid signature');
      }
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;
    const url = ctx.config.targetUrl;

    if (!url) {
      return successResponse('Target URL not configured, skipping');
    }

    // Check if event matches configured patterns
    if (!matchesEventPatterns(payload.event, ctx.config.eventPatterns)) {
      return successResponse(`Event '${payload.event}' does not match patterns, skipping`);
    }

    // Build headers for relay request
    const relayHeaders = buildRelayHeaders(headers, ctx.config);

    // Transform payload if configured
    const relayBody = transformPayload(payload, ctx.config.transformPayload ?? false);

    // Send relay request
    const result = await sendRelayRequest(url, relayBody, relayHeaders, {
      maxAttempts: ctx.config.maxRetries ?? 3,
      baseDelayMs: ctx.config.retryDelayMs ?? 1000,
      timeoutMs: ctx.config.timeoutMs ?? 30000,
    });

    if (!result.success) {
      return errorResponse(formatErrorMessage(result));
    }
    return successResponse(formatSuccessMessage(result));
  };
}
