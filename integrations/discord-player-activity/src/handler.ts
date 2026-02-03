import {
  createWebhookRouter,
  verifyWebhookSignature,
  successResponse,
  errorResponse,
  EVENTS,
  type WebhookPayload,
  type WebhookResponse,
} from '@sentinel-unturned/integration-sdk';
import type { HandlerContext, IntegrationConfig } from './types';
import {
  buildPlayerConnectedEmbed,
  buildPlayerDisconnectedEmbed,
  sendDiscordWebhook,
  type WebhookResult,
} from './discord';

/**
 * Formats success message, including attempt count if retries occurred.
 */
function formatSuccessMessage(result: WebhookResult): string {
  return result.attempts > 1
    ? `Sent to Discord (${result.attempts} attempts)`
    : 'Sent to Discord';
}

/**
 * Formats error message with attempt count.
 */
function formatErrorMessage(result: WebhookResult): string {
  return `Discord webhook failed after ${result.attempts} attempt${result.attempts !== 1 ? 's' : ''}: ${result.error}`;
}

/**
 * Maps event types to their corresponding config field names.
 */
export const EVENT_TO_CONFIG: Record<string, keyof IntegrationConfig> = {
  [EVENTS.PLAYER.CONNECTED]: 'playerConnectedWebhookUrl',
  [EVENTS.PLAYER.DISCONNECTED]: 'playerDisconnectedWebhookUrl',
};

/**
 * Creates a webhook handler for Sentinel player activity events.
 *
 * @param ctx - Handler context containing config and optional webhook secret
 * @returns Async function to handle incoming webhooks
 */
export function createHandler(ctx: HandlerContext) {
  const router = createWebhookRouter({
    [EVENTS.PLAYER.CONNECTED]: async (payload) => {
      const url = ctx.config.playerConnectedWebhookUrl;
      if (!url) return successResponse('Webhook URL not configured, skipping');

      const embed = buildPlayerConnectedEmbed(payload.data, ctx.config);
      const result = await sendDiscordWebhook(url, embed);

      if (!result.success) {
        return errorResponse(formatErrorMessage(result));
      }
      return successResponse(formatSuccessMessage(result));
    },

    [EVENTS.PLAYER.DISCONNECTED]: async (payload) => {
      const url = ctx.config.playerDisconnectedWebhookUrl;
      if (!url) return successResponse('Webhook URL not configured, skipping');

      const embed = buildPlayerDisconnectedEmbed(payload.data, ctx.config);
      const result = await sendDiscordWebhook(url, embed);

      if (!result.success) {
        return errorResponse(formatErrorMessage(result));
      }
      return successResponse(formatSuccessMessage(result));
    },
  });

  /**
   * Main handler function for incoming webhooks.
   */
  return async function handleWebhook(
    rawBody: string,
    headers: Record<string, string>
  ): Promise<WebhookResponse> {
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
    return router(payload);
  };
}
