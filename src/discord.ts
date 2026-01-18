import type {
  BanEventPayload,
  KickEventPayload,
  WarnEventPayload,
  MuteEventPayload,
} from '@sentinel-unturned/integration-sdk';

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
  footer?: { text: string };
}

/**
 * Discord webhook payload structure.
 */
export interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}

/**
 * Color constants for Discord embeds by event type.
 */
const COLORS = {
  BAN: 0xed4245,    // Red
  UNBAN: 0x57f287,  // Green
  KICK: 0xffa500,   // Orange
  WARN: 0xfee75c,   // Yellow
  MUTE: 0x9b59b6,   // Purple
  UNMUTE: 0x57f287, // Green
} as const;

/**
 * Formats a duration in seconds to a human-readable string.
 * @param seconds - Duration in seconds, or null for permanent
 * @returns Formatted duration string
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Permanent';
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * Formats player info for embed field.
 */
function formatPlayer(player: { name: string; steam64Id: string }): string {
  return `${player.name} (\`${player.steam64Id}\`)`;
}

/**
 * Builds a Discord embed for a ban created event.
 */
export function buildBanCreatedEmbed(payload: BanEventPayload): DiscordWebhookPayload {
  return {
    embeds: [{
      title: '🔨 Player Banned',
      color: COLORS.BAN,
      fields: [
        { name: 'Player', value: formatPlayer(payload.player), inline: true },
        { name: 'Moderator', value: payload.admin.name, inline: true },
        { name: 'Reason', value: payload.reason || 'No reason provided', inline: false },
        { name: 'Duration', value: formatDuration(payload.duration), inline: true },
      ],
      timestamp: payload.timestamp,
    }],
  };
}

/**
 * Builds a Discord embed for a ban removed event.
 */
export function buildBanRemovedEmbed(payload: BanEventPayload): DiscordWebhookPayload {
  return {
    embeds: [{
      title: '✅ Player Unbanned',
      color: COLORS.UNBAN,
      fields: [
        { name: 'Player', value: formatPlayer(payload.player), inline: true },
        { name: 'Moderator', value: payload.admin.name, inline: true },
        { name: 'Reason', value: payload.reason || 'No reason provided', inline: false },
      ],
      timestamp: payload.timestamp,
    }],
  };
}

/**
 * Builds a Discord embed for a kick created event.
 */
export function buildKickCreatedEmbed(payload: KickEventPayload): DiscordWebhookPayload {
  return {
    embeds: [{
      title: '👢 Player Kicked',
      color: COLORS.KICK,
      fields: [
        { name: 'Player', value: formatPlayer(payload.player), inline: true },
        { name: 'Moderator', value: payload.admin.name, inline: true },
        { name: 'Reason', value: payload.reason || 'No reason provided', inline: false },
      ],
      timestamp: payload.timestamp,
    }],
  };
}

/**
 * Builds a Discord embed for a warn created event.
 */
export function buildWarnCreatedEmbed(payload: WarnEventPayload): DiscordWebhookPayload {
  const fields: DiscordEmbedField[] = [
    { name: 'Player', value: formatPlayer(payload.player), inline: true },
    { name: 'Moderator', value: payload.admin.name, inline: true },
    { name: 'Reason', value: payload.reason || 'No reason provided', inline: false },
  ];

  if (payload.severity !== undefined) {
    fields.push({ name: 'Severity', value: `${payload.severity}/5`, inline: true });
  }

  return {
    embeds: [{
      title: '⚠️ Player Warned',
      color: COLORS.WARN,
      fields,
      timestamp: payload.timestamp,
    }],
  };
}

/**
 * Builds a Discord embed for a mute created event.
 */
export function buildMuteCreatedEmbed(payload: MuteEventPayload): DiscordWebhookPayload {
  return {
    embeds: [{
      title: '🔇 Player Muted',
      color: COLORS.MUTE,
      fields: [
        { name: 'Player', value: formatPlayer(payload.player), inline: true },
        { name: 'Moderator', value: payload.admin.name, inline: true },
        { name: 'Reason', value: payload.reason || 'No reason provided', inline: false },
        { name: 'Duration', value: formatDuration(payload.duration), inline: true },
      ],
      timestamp: payload.timestamp,
    }],
  };
}

/**
 * Builds a Discord embed for a mute removed event.
 */
export function buildMuteRemovedEmbed(payload: MuteEventPayload): DiscordWebhookPayload {
  return {
    embeds: [{
      title: '🔊 Player Unmuted',
      color: COLORS.UNMUTE,
      fields: [
        { name: 'Player', value: formatPlayer(payload.player), inline: true },
        { name: 'Moderator', value: payload.admin.name, inline: true },
        { name: 'Reason', value: payload.reason || 'No reason provided', inline: false },
      ],
      timestamp: payload.timestamp,
    }],
  };
}

/**
 * Sends a Discord webhook payload to the specified URL.
 * @param url - Discord webhook URL
 * @param payload - Discord webhook payload
 * @returns Success status and optional error message
 */
export async function sendDiscordWebhook(
  url: string,
  payload: DiscordWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}
