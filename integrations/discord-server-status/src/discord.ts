import type { GameServerEventPayload } from '@sentinel-unturned/integration-sdk';
import type { IntegrationConfig } from './types';

/**
 * Discord embed field structure.
 */
export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Discord embed structure.
 */
export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: DiscordEmbedField[];
  timestamp: string;
  footer?: { text: string };
}

/**
 * Discord webhook payload structure.
 */
export interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}

/**
 * Default color constants for Discord embeds.
 */
const DEFAULT_COLORS = {
  ONLINE: 0x57f287,  // Green
  OFFLINE: 0xed4245, // Red
  UPDATE: 0x5865f2,  // Blue
} as const;

/**
 * Builds server info fields common to all status embeds.
 */
function buildServerFields(
  payload: GameServerEventPayload,
  config: IntegrationConfig
): DiscordEmbedField[] {
  const fields: DiscordEmbedField[] = [
    {
      name: 'Server',
      value: payload.name,
      inline: true,
    },
    {
      name: 'Players',
      value: `${payload.currentPlayers}/${payload.maxPlayers}`,
      inline: true,
    },
  ];

  if (config.showServerAddress ?? true) {
    fields.push({
      name: 'Address',
      value: `\`${payload.address}:${payload.port}\``,
      inline: true,
    });
  }

  if (config.showMap ?? true) {
    fields.push({
      name: 'Map',
      value: payload.map || 'Unknown',
      inline: true,
    });
  }

  return fields;
}

/**
 * Builds a Discord embed for a server connected event.
 */
export function buildServerConnectedEmbed(
  payload: GameServerEventPayload,
  config: IntegrationConfig
): DiscordWebhookPayload {
  const color = config.onlineColor ?? DEFAULT_COLORS.ONLINE;

  return {
    embeds: [{
      title: 'Server Online',
      color,
      fields: buildServerFields(payload, config),
      timestamp: payload.timestamp,
    }],
  };
}

/**
 * Builds a Discord embed for a server disconnected event.
 */
export function buildServerDisconnectedEmbed(
  payload: GameServerEventPayload,
  config: IntegrationConfig
): DiscordWebhookPayload {
  const color = config.offlineColor ?? DEFAULT_COLORS.OFFLINE;

  return {
    embeds: [{
      title: 'Server Offline',
      color,
      fields: buildServerFields(payload, config),
      timestamp: payload.timestamp,
    }],
  };
}

/**
 * Builds a Discord embed for a server updated event.
 */
export function buildServerUpdatedEmbed(
  payload: GameServerEventPayload,
  config: IntegrationConfig
): DiscordWebhookPayload {
  const color = config.updateColor ?? DEFAULT_COLORS.UPDATE;

  return {
    embeds: [{
      title: 'Server Updated',
      color,
      fields: buildServerFields(payload, config),
      timestamp: payload.timestamp,
    }],
  };
}

/**
 * Options for retry behavior.
 */
export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

/**
 * Result of a Discord webhook send operation.
 */
export interface WebhookResult {
  success: boolean;
  error?: string;
  attempts: number;
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determines if an HTTP status code should trigger a retry.
 */
function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Sends a Discord webhook payload to the specified URL with retry logic.
 */
export async function sendDiscordWebhook(
  url: string,
  payload: DiscordWebhookPayload,
  options?: RetryOptions
): Promise<WebhookResult> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;

  let lastError = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return { success: true, attempts: attempt };
      }

      const text = await response.text().catch(() => 'Unknown error');
      lastError = `HTTP ${response.status}: ${text}`;

      if (!shouldRetry(response.status)) {
        return { success: false, error: lastError, attempts: attempt };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
    }

    if (attempt < maxAttempts) {
      const delay = baseDelayMs * Math.pow(2, attempt - 2);
      if (delay > 0) {
        await sleep(delay);
      }
    }
  }

  return { success: false, error: lastError, attempts: maxAttempts };
}
