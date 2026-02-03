/**
 * Sentinel Webhook Relay Integration
 *
 * Generic webhook relay to forward Sentinel events to custom endpoints.
 */

export { createHandler } from './handler';
export type { IntegrationConfig, HandlerContext, PayloadEnvelope } from './types';
export type { RelayOptions, RelayResult } from './relay';
export { matchesEventPatterns, buildRelayHeaders, transformPayload } from './relay';
