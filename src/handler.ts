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
  buildBanCreatedEmbed,
  buildBanRemovedEmbed,
  buildKickCreatedEmbed,
  buildWarnCreatedEmbed,
  buildMuteCreatedEmbed,
  buildMuteRemovedEmbed,
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
const EVENT_TO_CONFIG: Record<string, keyof IntegrationConfig> = {
  [EVENTS.MODERATION.BAN_CREATED]: 'banCreatedWebhookUrl',
  [EVENTS.MODERATION.BAN_REMOVED]: 'banRemovedWebhookUrl',
  [EVENTS.MODERATION.KICK_CREATED]: 'kickCreatedWebhookUrl',
  [EVENTS.MODERATION.WARN_CREATED]: 'warnCreatedWebhookUrl',
  [EVENTS.MODERATION.MUTE_CREATED]: 'muteCreatedWebhookUrl',
  [EVENTS.MODERATION.MUTE_REMOVED]: 'muteRemovedWebhookUrl',
};

/**
 * Creates a webhook handler for Sentinel moderation events.
 *
 * @param ctx - Handler context containing config and optional webhook secret
 * @returns Async function to handle incoming webhooks
 */
export function createHandler(ctx: HandlerContext) {
  const router = createWebhookRouter({
    [EVENTS.MODERATION.BAN_CREATED]: async (payload) => {
      const url = ctx.config.banCreatedWebhookUrl;
      if (!url) return successResponse('Webhook URL not configured, skipping');

      const embed = buildBanCreatedEmbed(payload.data);
      const result = await sendDiscordWebhook(url, embed);

      if (!result.success) {
        return errorResponse(formatErrorMessage(result));
      }
      return successResponse(formatSuccessMessage(result));
    },

    [EVENTS.MODERATION.BAN_REMOVED]: async (payload) => {
      const url = ctx.config.banRemovedWebhookUrl;
      if (!url) return successResponse('Webhook URL not configured, skipping');

      const embed = buildBanRemovedEmbed(payload.data);
      const result = await sendDiscordWebhook(url, embed);

      if (!result.success) {
        return errorResponse(formatErrorMessage(result));
      }
      return successResponse(formatSuccessMessage(result));
    },

    [EVENTS.MODERATION.KICK_CREATED]: async (payload) => {
      const url = ctx.config.kickCreatedWebhookUrl;
      if (!url) return successResponse('Webhook URL not configured, skipping');

      const embed = buildKickCreatedEmbed(payload.data);
      const result = await sendDiscordWebhook(url, embed);

      if (!result.success) {
        return errorResponse(formatErrorMessage(result));
      }
      return successResponse(formatSuccessMessage(result));
    },

    [EVENTS.MODERATION.WARN_CREATED]: async (payload) => {
      const url = ctx.config.warnCreatedWebhookUrl;
      if (!url) return successResponse('Webhook URL not configured, skipping');

      const embed = buildWarnCreatedEmbed(payload.data);
      const result = await sendDiscordWebhook(url, embed);

      if (!result.success) {
        return errorResponse(formatErrorMessage(result));
      }
      return successResponse(formatSuccessMessage(result));
    },

    [EVENTS.MODERATION.MUTE_CREATED]: async (payload) => {
      const url = ctx.config.muteCreatedWebhookUrl;
      if (!url) return successResponse('Webhook URL not configured, skipping');

      const embed = buildMuteCreatedEmbed(payload.data);
      const result = await sendDiscordWebhook(url, embed);

      if (!result.success) {
        return errorResponse(formatErrorMessage(result));
      }
      return successResponse(formatSuccessMessage(result));
    },

    [EVENTS.MODERATION.MUTE_REMOVED]: async (payload) => {
      const url = ctx.config.muteRemovedWebhookUrl;
      if (!url) return successResponse('Webhook URL not configured, skipping');

      const embed = buildMuteRemovedEmbed(payload.data);
      const result = await sendDiscordWebhook(url, embed);

      if (!result.success) {
        return errorResponse(formatErrorMessage(result));
      }
      return successResponse(formatSuccessMessage(result));
    },
  });

  /**
   * Main handler function for incoming webhooks.
   *
   * @param rawBody - Raw request body as string (for signature verification)
   * @param headers - Request headers (must include x-sentinel-signature if secret configured)
   * @returns Webhook response
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

    // Parse and route
    const payload = JSON.parse(rawBody) as WebhookPayload;
    return router(payload);
  };
}

// Re-export EVENT_TO_CONFIG for potential use in Phase 4
export { EVENT_TO_CONFIG };
