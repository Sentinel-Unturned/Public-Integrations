import type { ChatEventPayload } from '@sentinel-unturned/integration-sdk';
import type { IntegrationConfig, ChatChannel } from './types';

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
  title?: string;
  description?: string;
  color: number;
  fields?: DiscordEmbedField[];
  timestamp: string;
  author?: { name: string; icon_url?: string };
  footer?: { text: string };
}

/**
 * Discord webhook payload structure.
 */
export interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
}

/**
 * Default embed color.
 */
const DEFAULT_EMBED_COLOR = 0x5865f2; // Discord Blurple

/**
 * Channel indicators for display.
 */
const CHANNEL_INDICATORS: Record<ChatChannel, string> = {
  global: '[Global]',
  group: '[Group]',
  local: '[Local]',
  admin: '[Admin]',
};

/**
 * Channel colors for embeds.
 */
const CHANNEL_COLORS: Record<ChatChannel, number> = {
  global: 0x5865f2, // Blue
  group: 0x57f287, // Green
  local: 0xfee75c, // Yellow
  admin: 0xed4245, // Red
};

/**
 * Escape special Discord markdown characters.
 */
function escapeMarkdown(text: string): string {
  return text.replace(/([*_`~|\\])/g, '\\$1');
}

/**
 * Checks if a message passes the channel filter.
 */
export function passesChannelFilter(
  channel: ChatChannel,
  filter: ChatChannel[] | undefined
): boolean {
  if (!filter || filter.length === 0) return true;
  return filter.includes(channel);
}

/**
 * Checks if a message passes the prefix filter.
 */
export function passesPrefixFilter(
  message: string,
  prefix: string | undefined
): boolean {
  if (!prefix) return true;
  return message.startsWith(prefix);
}

/**
 * Processes a message based on prefix settings.
 */
function processMessage(
  message: string,
  prefix: string | undefined,
  stripPrefix: boolean
): string {
  if (prefix && stripPrefix && message.startsWith(prefix)) {
    return message.slice(prefix.length).trimStart();
  }
  return message;
}

/**
 * Builds a simple text message for Discord.
 */
export function buildSimpleMessage(
  payload: ChatEventPayload,
  config: IntegrationConfig
): DiscordWebhookPayload {
  const showChannel = config.showChannelIndicator ?? true;
  const showSteamId = config.showSteamId ?? false;
  const stripPrefix = config.stripPrefix ?? false;

  const message = processMessage(payload.message, config.messagePrefix, stripPrefix);
  const playerName = escapeMarkdown(payload.player.name);

  let content = '';

  if (showChannel) {
    content += `${CHANNEL_INDICATORS[payload.channel]} `;
  }

  content += `**${playerName}**`;

  if (showSteamId) {
    content += ` (\`${payload.player.steam64Id}\`)`;
  }

  content += `: ${escapeMarkdown(message)}`;

  return { content };
}

/**
 * Builds a rich embed message for Discord.
 */
export function buildEmbedMessage(
  payload: ChatEventPayload,
  config: IntegrationConfig
): DiscordWebhookPayload {
  const showChannel = config.showChannelIndicator ?? true;
  const showSteamId = config.showSteamId ?? false;
  const stripPrefix = config.stripPrefix ?? false;
  const color = config.embedColor ?? CHANNEL_COLORS[payload.channel] ?? DEFAULT_EMBED_COLOR;

  const message = processMessage(payload.message, config.messagePrefix, stripPrefix);

  const embed: DiscordEmbed = {
    color,
    description: message,
    timestamp: payload.timestamp,
    author: {
      name: payload.player.name,
      icon_url: payload.player.avatarUrl,
    },
  };

  const footerParts: string[] = [];

  if (showChannel) {
    footerParts.push(CHANNEL_INDICATORS[payload.channel]);
  }

  if (showSteamId) {
    footerParts.push(payload.player.steam64Id);
  }

  if (footerParts.length > 0) {
    embed.footer = { text: footerParts.join(' | ') };
  }

  return { embeds: [embed] };
}

/**
 * Builds the appropriate Discord payload based on config.
 */
export function buildChatMessage(
  payload: ChatEventPayload,
  config: IntegrationConfig
): DiscordWebhookPayload {
  if (config.embedMode) {
    return buildEmbedMessage(payload, config);
  }
  return buildSimpleMessage(payload, config);
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
