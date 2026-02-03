/**
 * Integration configuration from manifest config fields.
 */
export interface IntegrationConfig {
  targetUrl: string;
  eventPatterns?: string[];
  customHeaders?: Record<string, string>;
  includeOriginalHeaders?: boolean;
  transformPayload?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  secretHeader?: string;
  secretValue?: string;
}

/**
 * Context passed to the webhook handler factory.
 */
export interface HandlerContext {
  config: IntegrationConfig;
  webhookSecret?: string;
}

/**
 * Transformed payload envelope.
 */
export interface PayloadEnvelope {
  source: 'sentinel';
  event: string;
  timestamp: string;
  organizationId: string;
  userId?: string;
  data: unknown;
}
