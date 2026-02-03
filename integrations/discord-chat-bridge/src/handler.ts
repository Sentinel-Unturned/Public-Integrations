import {
  createWebhookRouter,
  verifyWebhookSignature,
  successResponse,
  errorResponse,
  EVENTS,
  type WebhookPayload,
  type WebhookResponse,
} from '@sentinel-unturned/integration-sdk';
import type { HandlerContext, ChatChannel } from './types';
import {
  buildChatMessage,
  sendDiscordWebhook,
  passesChannelFilter,
  passesPrefixFilter,
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
 * Creates a webhook handler for Sentinel chat events.
 *
 * @param ctx - Handler context containing config and optional webhook secret
 * @returns Async function to handle incoming webhooks
 */
export function createHandler(ctx: HandlerContext) {
  const router = createWebhookRouter({
    [EVENTS.CHAT.MESSAGE]: async (payload) => {
      const url = ctx.config.webhookUrl;
      if (!url) return successResponse('Webhook URL not configured, skipping');

      // Check channel filter
      const channel = payload.data.channel as ChatChannel;
      if (!passesChannelFilter(channel, ctx.config.channelFilter)) {
        return successResponse(`Channel '${channel}' filtered out, skipping`);
      }

      // Check prefix filter
      if (!passesPrefixFilter(payload.data.message, ctx.config.messagePrefix)) {
        return successResponse('Message prefix not matched, skipping');
      }

      const message = buildChatMessage(payload.data, ctx.config);
      const result = await sendDiscordWebhook(url, message);

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
