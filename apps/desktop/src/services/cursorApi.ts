export interface CursorApiConfig {
  apiKey: string;
  teamId?: string;
}

export interface CursorUsageSummary {
  usagePercent?: number;
  spendUsd?: number;
  requestsToday?: number;
  message: string;
  raw?: unknown;
}

const CURSOR_API_BASE_URL = "https://api.cursor.com";

interface SpendMember {
  spendCents?: number;
  overallSpendCents?: number;
  fastPremiumRequests?: number;
  monthlyLimitDollars?: number | null;
  email?: string;
}

interface SpendResponse {
  teamMemberSpend?: SpendMember[];
}

interface DailyUsageRow {
  usageBasedReqs?: number;
  subscriptionIncludedReqs?: number;
  apiKeyReqs?: number;
}

interface DailyUsageResponse {
  data?: DailyUsageRow[];
}

interface ApiCallResult<T> {
  data: T | null;
  status: number | null;
}

export class CursorApiService {
  constructor(private readonly config: CursorApiConfig) {}

  async fetchUsageEvents(): Promise<unknown | null> {
    const endDate = Date.now();
    const startDate = endDate - 24 * 60 * 60 * 1000;
    const result = await this.safePost("/teams/filtered-usage-events", {
      startDate,
      endDate,
      page: 1,
      pageSize: 1,
    });
    return result.data;
  }

  async fetchSpendTracking(): Promise<SpendResponse | null> {
    const result = await this.safePost<SpendResponse>("/teams/spend", {
      page: 1,
      pageSize: 100,
    });
    return result.data;
  }

  async fetchTokenUsage(): Promise<DailyUsageResponse | null> {
    const result = await this.safePost<DailyUsageResponse>("/teams/daily-usage-data", {
      startDate: startOfTodayMs(),
      endDate: Date.now(),
    });
    return result.data;
  }

  async fetchUsageSummary(): Promise<CursorUsageSummary> {
    const apiKey = this.config.apiKey.trim();
    if (!apiKey) {
      return { message: "Add a Cursor API key in Settings." };
    }

    const [spendResult, dailyUsageResult] = await Promise.all([
      this.safePost<SpendResponse>("/teams/spend", { page: 1, pageSize: 100 }),
      this.safePost<DailyUsageResponse>("/teams/daily-usage-data", {
        startDate: startOfTodayMs(),
        endDate: Date.now(),
      }),
    ]);

    const authStatus = spendResult.status ?? dailyUsageResult.status;
    if (authStatus === 401) {
      return {
        message:
          "Cursor rejected the API key (401). Use a team Admin API key from Dashboard → Settings → Advanced → Admin API Keys, not a Cloud Agents user key.",
      };
    }

    if (authStatus === 403) {
      return {
        message:
          "This Cursor account does not have access to team usage endpoints (403). Admin usage data requires a team or enterprise plan with Admin API access.",
      };
    }

    const spend = spendResult.data;
    const dailyUsage = dailyUsageResult.data;

    if (!spend && !dailyUsage) {
      return {
        message:
          "Could not load Cursor usage. Confirm the Admin API key, team access, and Electron main-process logs.",
      };
    }

    const spendUsd = this.extractCycleSpendUsd(spend);
    const requestsToday = this.extractRequestsToday(dailyUsage);
    const usagePercent = this.extractUsagePercent(spend);
    const message = this.formatUsageMessage(spendUsd, requestsToday, usagePercent);

    return {
      usagePercent,
      spendUsd,
      requestsToday,
      message,
      raw: { spend, dailyUsage },
    };
  }

  private authHeaderVariants(): Record<string, string>[] {
    const apiKey = this.config.apiKey.trim();
    const basicToken = Buffer.from(`${apiKey}:`, "utf8").toString("base64");
    const baseHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const variants = [
      { ...baseHeaders, Authorization: `Basic ${basicToken}` },
      { ...baseHeaders, Authorization: `Bearer ${apiKey}` },
    ];

    const teamId = this.config.teamId?.trim();
    if (!teamId) {
      return variants;
    }

    return variants.map((headers) => ({
      ...headers,
      "X-Team-Id": teamId,
    }));
  }

  private async safePost<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<ApiCallResult<T>> {
    const url = `${CURSOR_API_BASE_URL}${path}`;

    for (const headers of this.authHeaderVariants()) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (response.ok) {
          return {
            data: (await response.json()) as T,
            status: response.status,
          };
        }

        const errorBody = await response.text();
        if (response.status !== 401) {
          console.warn(
            `[Pixel Agent] Cursor API request failed: ${response.status} ${path} ${errorBody}`,
          );
          return { data: null, status: response.status };
        }
      } catch (error) {
        console.warn("[Pixel Agent] Cursor API request error:", error);
        return { data: null, status: null };
      }
    }

    console.warn(`[Pixel Agent] Cursor API authentication failed for ${path}`);
    return { data: null, status: 401 };
  }

  private extractCycleSpendUsd(spend: SpendResponse | null): number | undefined {
    if (!spend?.teamMemberSpend?.length) {
      return undefined;
    }

    const totalCents = spend.teamMemberSpend.reduce(
      (sum, member) => sum + (member.overallSpendCents ?? member.spendCents ?? 0),
      0,
    );
    return totalCents / 100;
  }

  private extractRequestsToday(dailyUsage: DailyUsageResponse | null): number | undefined {
    if (!dailyUsage?.data?.length) {
      return undefined;
    }

    return dailyUsage.data.reduce(
      (sum, row) =>
        sum +
        (row.usageBasedReqs ?? 0) +
        (row.subscriptionIncludedReqs ?? 0) +
        (row.apiKeyReqs ?? 0),
      0,
    );
  }

  private extractUsagePercent(spend: SpendResponse | null): number | undefined {
    if (!spend?.teamMemberSpend?.length) {
      return undefined;
    }

    const totalSpendCents = spend.teamMemberSpend.reduce(
      (sum, member) => sum + (member.overallSpendCents ?? member.spendCents ?? 0),
      0,
    );
    const totalLimitDollars = spend.teamMemberSpend.reduce(
      (sum, member) => sum + (member.monthlyLimitDollars ?? 0),
      0,
    );

    if (totalLimitDollars <= 0) {
      return undefined;
    }

    return Math.min(100, Math.round((totalSpendCents / 100 / totalLimitDollars) * 100));
  }

  private formatUsageMessage(
    spendUsd: number | undefined,
    requestsToday: number | undefined,
    usagePercent: number | undefined,
  ): string {
    const parts: string[] = [];

    if (spendUsd !== undefined) {
      parts.push(`$${spendUsd.toFixed(2)} this billing cycle`);
    }

    if (requestsToday !== undefined) {
      parts.push(`${requestsToday.toLocaleString()} requests today`);
    }

    if (usagePercent !== undefined) {
      parts.push(`${usagePercent}% of monthly limit`);
    }

    if (parts.length === 0) {
      return "Cursor usage loaded, but no spend or request totals were returned.";
    }

    return parts.join(" · ");
  }
}

function startOfTodayMs(): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}
