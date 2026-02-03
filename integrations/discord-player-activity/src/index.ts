/**
 * Sentinel Player Activity Integration
 *
 * Sends player connection/disconnection events to Discord webhooks with rich embeds.
 */

export { createHandler, EVENT_TO_CONFIG } from './handler';
export type { IntegrationConfig, HandlerContext } from './types';
export type { DiscordEmbed, DiscordEmbedField, DiscordWebhookPayload, RetryOptions, WebhookResult } from './discord';
