/**
 * Sentinel Server Status Integration
 *
 * Sends game server status updates to Discord webhooks with rich embeds.
 */

export { createHandler } from './handler';
export type { IntegrationConfig, HandlerContext } from './types';
export type {
  DiscordEmbed,
  DiscordEmbedField,
  DiscordWebhookPayload,
  RetryOptions,
  WebhookResult,
} from './discord';
