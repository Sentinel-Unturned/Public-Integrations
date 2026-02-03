/**
 * Sentinel Chat Bridge Integration
 *
 * Forwards in-game chat messages to Discord webhooks with filtering and formatting options.
 */

export { createHandler } from './handler';
export type { IntegrationConfig, HandlerContext, ChatChannel } from './types';
export type {
  DiscordEmbed,
  DiscordEmbedField,
  DiscordWebhookPayload,
  RetryOptions,
  WebhookResult,
} from './discord';
export { passesChannelFilter, passesPrefixFilter } from './discord';
