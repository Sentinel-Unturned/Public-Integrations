/**
 * Integration configuration from manifest config fields.
 */
export interface IntegrationConfig {
  webhookUrl: string;
  notifyOnConnect?: boolean;
  notifyOnDisconnect?: boolean;
  notifyOnPlayerCountChange?: boolean;
  playerCountThreshold?: number;
  onlineColor?: number;
  offlineColor?: number;
  updateColor?: number;
  showServerAddress?: boolean;
  showMap?: boolean;
}

/**
 * Context passed to the webhook handler factory.
 */
export interface HandlerContext {
  config: IntegrationConfig;
  webhookSecret?: string;
}
