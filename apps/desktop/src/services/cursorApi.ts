export interface CursorApiConfig {
  apiKey: string;
  teamId?: string;
}

export interface CursorUsageSummary {
  usagePercent?: number;
  spendUsd?: number;
  message?: string;
  raw?: unknown;
}

/**
 * Optional Cursor Admin API client.
 * The desktop app works without this service; Git and extension events drive the pet.
 */
export class CursorApiService {
  constructor(private readonly config: CursorApiConfig) {}

  /**
   * TODO: Confirm the official Cursor Admin API base URL from current documentation
   * before enabling live requests in production builds.
   */
  private getBaseUrl(): string | null {
    // TODO: Replace with the documented Cursor API base URL when available.
    return null;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.config.apiKey}`,
    };
    if (this.config.teamId) {
      headers["X-Team-Id"] = this.config.teamId;
    }
    return headers;
  }

  /**
   * TODO: Wire to the documented usage-events endpoint once confirmed.
   */
  async fetchUsageEvents(): Promise<unknown | null> {
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      return null;
    }
  // TODO: Replace path with documented usage-events route.
    const url = `${baseUrl}/usage-events`;
    return this.safeGet(url);
  }

  /**
   * TODO: Wire to the documented spend-tracking endpoint once confirmed.
   */
  async fetchSpendTracking(): Promise<unknown | null> {
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      return null;
    }
  // TODO: Replace path with documented spend-tracking route.
    const url = `${baseUrl}/spend`;
    return this.safeGet(url);
  }

  /**
   * TODO: Wire to the documented token-usage endpoint once confirmed.
   */
  async fetchTokenUsage(): Promise<unknown | null> {
    const baseUrl = this.getBaseUrl();
    if (!baseUrl) {
      return null;
    }
  // TODO: Replace path with documented token-usage route.
    const url = `${baseUrl}/token-usage`;
    return this.safeGet(url);
  }

  async fetchUsageSummary(): Promise<CursorUsageSummary | null> {
    if (!this.config.apiKey.trim()) {
      return null;
    }

    const [usageEvents, spend, tokenUsage] = await Promise.all([
      this.fetchUsageEvents(),
      this.fetchSpendTracking(),
      this.fetchTokenUsage(),
    ]);

    if (!usageEvents && !spend && !tokenUsage) {
      return null;
    }

    return {
      usagePercent: this.extractUsagePercent(usageEvents, tokenUsage),
      spendUsd: this.extractSpendUsd(spend),
      message: undefined,
      raw: { usageEvents, spend, tokenUsage },
    };
  }

  private async safeGet(url: string): Promise<unknown | null> {
    try {
      const response = await fetch(url, { headers: this.buildHeaders() });
      if (!response.ok) {
        console.warn(`[Pixel Agent] Cursor API request failed: ${response.status} ${url}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.warn("[Pixel Agent] Cursor API request error:", error);
      return null;
    }
  }

  private extractUsagePercent(...sources: Array<unknown | null>): number | undefined {
    for (const source of sources) {
      if (!source || typeof source !== "object") {
        continue;
      }
      const candidate = source as Record<string, unknown>;
      const value = candidate.usagePercent ?? candidate.percentUsed ?? candidate.percent;
      if (typeof value === "number") {
        return value;
      }
    }
    return undefined;
  }

  private extractSpendUsd(source: unknown): number | undefined {
    if (!source || typeof source !== "object") {
      return undefined;
    }
    const candidate = source as Record<string, unknown>;
    const value = candidate.spendUsd ?? candidate.totalSpend ?? candidate.amount;
    return typeof value === "number" ? value : undefined;
  }
}
