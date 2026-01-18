/**
 * Integration configuration from manifest config fields.
 * All webhook URLs are optional — if not configured, that event is skipped.
 */
export interface IntegrationConfig {
  banCreatedWebhookUrl?: string;
  banRemovedWebhookUrl?: string;
  kickCreatedWebhookUrl?: string;
  warnCreatedWebhookUrl?: string;
  muteCreatedWebhookUrl?: string;
  muteRemovedWebhookUrl?: string;
}

/**
 * Context passed to the webhook handler factory.
 */
export interface HandlerContext {
  config: IntegrationConfig;
  webhookSecret?: string;
}
