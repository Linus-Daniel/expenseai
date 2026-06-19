const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type Token = string | null;

function getToken(): Token {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/auth";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (data: { email: string; password: string; full_name?: string; monthly_income?: number; monthly_savings_goal?: number; risk_tolerance?: string }) =>
      request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  },

  transactions: {
    list: (params?: { skip?: number; limit?: number; start_date?: string; end_date?: string; category?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<Txn[]>(`/transactions/${qs ? "?" + qs : ""}`);
    },
    create: (data: TxnInput) =>
      request<Txn>("/transactions/", { method: "POST", body: JSON.stringify(data) }),
    summary: (params?: { start_date?: string; end_date?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<Summary>(`/transactions/summary${qs ? "?" + qs : ""}`);
    },
    categorize: (description: string, merchant: string = "") =>
      request<CategoryResult>(`/transactions/categorize?description=${encodeURIComponent(description)}&merchant=${encodeURIComponent(merchant)}`, { method: "POST" }),
  },

  budgets: {
    list: (month?: string) =>
      request<Budget[]>(`/budgets/${month ? `?month=${month}` : ""}`),
    create: (data: { category: string; monthly_limit: number; month: string }) =>
      request<Budget>("/budgets/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { category: string; monthly_limit: number; month: string }) =>
      request<Budget>(`/budgets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  forecast: {
    spend: (days: number = 7) =>
      request<ForecastResult>(`/forecast/spending?days=${days}`, { method: "POST" }),
  },

  recommendations: {
    list: () => request<Recommendation[]>("/recommendations/"),
    markRead: (id: string) =>
      request(`/recommendations/${id}/read`, { method: "PATCH" }),
    dismiss: (id: string) =>
      request(`/recommendations/${id}/dismiss`, { method: "PATCH" }),
  },
};

// ── Types ──────────────────────────────────────────────────────────────────────
export interface Txn {
  id: string; user_id: string; amount: number; transaction_type: "income" | "expense";
  description: string; merchant: string | null; category: string | null;
  predicted_category: string | null; is_anomaly: boolean; anomaly_score: number | null;
  transaction_date: string; created_at: string;
}
export interface TxnInput {
  amount: number; transaction_type: "income" | "expense";
  description: string; merchant?: string; transaction_date?: string;
}
export interface Summary {
  total_income: number; total_expenses: number; net_savings: number;
  top_category: string | null; category_breakdown: Record<string, number>; anomaly_count: number;
}
export interface CategoryResult {
  predicted_category: string; confidence: number; alternatives: Record<string, number>;
}
export interface Budget {
  id: string; user_id: string; category: string; monthly_limit: number;
  current_spent: number; month: string;
}
export interface ForecastResult {
  predicted_amount: number; period: string; confidence: number;
}
export interface Recommendation {
  id: string; recommendation_type: string; title: string; body: string;
  priority: number; is_read: boolean; created_at: string;
}
