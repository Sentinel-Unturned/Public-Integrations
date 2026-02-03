import type { PlayerEventPayload } from '@sentinel-unturned/integration-sdk';
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
  color: number;
  fields: DiscordEmbedField[];
  timestamp: string;
  thumbnail?: { url: string };
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
  JOIN: 0x57f287,   // Green
  LEAVE: 0xed4245,  // Red
} as const;

/**
 * Convert ISO 3166-1 alpha-2 country code to flag emoji.
 * @param countryCode - Two letter country code (e.g., "US", "GB")
 * @returns Flag emoji or empty string if invalid
 */
function countryCodeToFlag(countryCode: string | undefined): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = [...countryCode.toUpperCase()].map(
    char => 0x1f1e6 + char.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
}

/**
 * Formats player name with optional country flag.
 */
function formatPlayerName(
  player: { name: string; countryCode?: string },
  showFlag: boolean
): string {
  const flag = showFlag ? countryCodeToFlag(player.countryCode) : '';
  return flag ? `${flag} ${player.name}` : player.name;
}

/**
 * Builds a Discord embed for a player connected event.
 */
export function buildPlayerConnectedEmbed(
  payload: PlayerEventPayload,
  config: IntegrationConfig
): DiscordWebhookPayload {
  const color = config.joinEmbedColor ?? DEFAULT_COLORS.JOIN;
  const showFlag = config.showCountryFlag ?? true;
  const showSteamId = config.showSteamId ?? true;

  const fields: DiscordEmbedField[] = [
    {
      name: 'Player',
      value: formatPlayerName(payload, showFlag),
      inline: true,
    },
  ];

  if (showSteamId) {
    fields.push({
      name: 'Steam ID',
      value: `\`${payload.steam64Id}\``,
      inline: true,
    });
  }

  const embed: DiscordEmbed = {
    title: '-> Player Joined',
    color,
    fields,
    timestamp: payload.timestamp,
  };

  if (payload.avatarUrl) {
    embed.thumbnail = { url: payload.avatarUrl };
  }

  return { embeds: [embed] };
}

/**
 * Builds a Discord embed for a player disconnected event.
 */
export function buildPlayerDisconnectedEmbed(
  payload: PlayerEventPayload,
  config: IntegrationConfig
): DiscordWebhookPayload {
  const color = config.leaveEmbedColor ?? DEFAULT_COLORS.LEAVE;
  const showFlag = config.showCountryFlag ?? true;
  const showSteamId = config.showSteamId ?? true;

  const fields: DiscordEmbedField[] = [
    {
      name: 'Player',
      value: formatPlayerName(payload, showFlag),
      inline: true,
    },
  ];

  if (showSteamId) {
    fields.push({
      name: 'Steam ID',
      value: `\`${payload.steam64Id}\``,
      inline: true,
    });
  }

  const embed: DiscordEmbed = {
    title: '<- Player Left',
    color,
    fields,
    timestamp: payload.timestamp,
  };

  if (payload.avatarUrl) {
    embed.thumbnail = { url: payload.avatarUrl };
  }

  return { embeds: [embed] };
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
