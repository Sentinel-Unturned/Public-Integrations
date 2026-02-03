/**
 * Integration configuration from manifest config fields.
 * Webhook URLs are optional — if not configured, that event is skipped.
 */
export interface IntegrationConfig {
  playerConnectedWebhookUrl?: string;
  playerDisconnectedWebhookUrl?: string;
  joinEmbedColor?: number;
  leaveEmbedColor?: number;
  showCountryFlag?: boolean;
  showSteamId?: boolean;
}

/**
 * Context passed to the webhook handler factory.
 */
export interface HandlerContext {
  config: IntegrationConfig;
  webhookSecret?: string;
}
