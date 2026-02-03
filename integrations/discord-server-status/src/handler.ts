import {
  createWebhookRouter,
  verifyWebhookSignature,
  successResponse,
  errorResponse,
  EVENTS,
  type WebhookPayload,
  type WebhookResponse,
} from '@sentinel-unturned/integration-sdk';
import type { HandlerContext } from './types';
import {
  buildServerConnectedEmbed,
  buildServerDisconnectedEmbed,
  buildServerUpdatedEmbed,
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
 * Creates a webhook handler for Sentinel game server events.
 *
 * @param ctx - Handler context containing config and optional webhook secret
 * @returns Async function to handle incoming webhooks
 */
export function createHandler(ctx: HandlerContext) {
  const router = createWebhookRouter({
    [EVENTS.GAMESERVER.CONNECTED]: async (payload) => {
      const url = ctx.config.webhookUrl;
      if (!url) return successResponse('Webhook URL not configured, skipping');

      if (!(ctx.config.notifyOnConnect ?? true)) {
        return successResponse('Connect notifications disabled, skipping');
      }

      const embed = buildServerConnectedEmbed(payload.data, ctx.config);
      const result = await sendDiscordWebhook(url, embed);

      if (!result.success) {
        return errorResponse(formatErrorMessage(result));
      }
      return successResponse(formatSuccessMessage(result));
    },

    [EVENTS.GAMESERVER.DISCONNECTED]: async (payload) => {
      const url = ctx.config.webhookUrl;
      if (!url) return successResponse('Webhook URL not configured, skipping');

      if (!(ctx.config.notifyOnDisconnect ?? true)) {
        return successResponse('Disconnect notifications disabled, skipping');
      }

      const embed = buildServerDisconnectedEmbed(payload.data, ctx.config);
      const result = await sendDiscordWebhook(url, embed);

      if (!result.success) {
        return errorResponse(formatErrorMessage(result));
      }
      return successResponse(formatSuccessMessage(result));
    },

    [EVENTS.GAMESERVER.UPDATED]: async (payload) => {
      const url = ctx.config.webhookUrl;
      if (!url) return successResponse('Webhook URL not configured, skipping');

      if (!(ctx.config.notifyOnPlayerCountChange ?? false)) {
        return successResponse('Update notifications disabled, skipping');
      }

      const embed = buildServerUpdatedEmbed(payload.data, ctx.config);
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
