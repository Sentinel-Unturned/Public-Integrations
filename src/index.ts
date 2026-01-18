/**
 * Sentinel Moderation Webhooks Integration
 *
 * Sends moderation events to Discord webhooks with rich embeds.
 */

export { createHandler, EVENT_TO_CONFIG } from './handler';
export type { IntegrationConfig, HandlerContext } from './types';
