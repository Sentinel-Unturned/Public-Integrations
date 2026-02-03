/**
 * Chat channel types from the SDK.
 */
export type ChatChannel = 'global' | 'group' | 'local' | 'admin';

/**
 * Integration configuration from manifest config fields.
 */
export interface IntegrationConfig {
  webhookUrl: string;
  channelFilter?: ChatChannel[];
  messagePrefix?: string;
  stripPrefix?: boolean;
  showChannelIndicator?: boolean;
  showSteamId?: boolean;
  embedMode?: boolean;
  embedColor?: number;
}

/**
 * Context passed to the webhook handler factory.
 */
export interface HandlerContext {
  config: IntegrationConfig;
  webhookSecret?: string;
}
