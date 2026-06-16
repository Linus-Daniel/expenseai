"use client";
import { useEffect, useState, useCallback } from "react";
import { api, Summary, Txn, ForecastResult, Recommendation } from "@/lib/api";

function fmt(n: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n); }

function DonutChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const colors = ["#0d9488","#0891b2","#6366f1","#ec4899","#f59e0b","#84cc16"];
  let cumulative = 0;
  const slices = entries.map(([k, v], i) => {
    const pct = v / total;
    const [start, end] = [cumulative, cumulative + pct];
    cumulative += pct;
    return { label: k, value: v, pct, start, end, color: colors[i % colors.length] };
  });

  const cx = 100, cy = 100, r = 70;
  const polarToCart = (angle: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (start: number, end: number) => {
    const s = polarToCart(start * 360);
    const e = polarToCart(end * 360);
    const large = (end - start) > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 200 200" className="w-40 h-40 shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={describeArc(s.start, s.end)} fill={s.color} opacity={0.9} />
        ))}
        <circle cx={cx} cy={cy} r={40} fill="white" />
      </svg>
      <div className="space-y-2 w-full">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 flex-1 truncate">{s.label}</span>
            <span className="font-medium text-gray-900">{fmt(s.value)}</span>
            <span className="text-gray-400 text-xs w-10 text-right">{(s.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v));
  return (
    <div className="flex flex-col gap-2.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-3 text-sm">
          <span className="w-32 text-gray-600 truncate text-xs">{k}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div className="bg-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="font-medium text-gray-900 w-16 text-right">{fmt(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [recentTxns, setRecentTxns] = useState<Txn[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, f, t, r] = await Promise.all([
        api.transactions.summary(),
        api.forecast.spend(7),
        api.transactions.list({ limit: 8 }),
        api.recommendations.list().catch(() => [] as Recommendation[]),
      ]);
      setSummary(s);
      setForecast(f);
      setRecentTxns(t);
      setRecs(r);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="space-y-4"><LoadingSkeleton /></div>;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your financial overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Income" value={fmt(summary?.total_income || 0)} color="teal" />
        <KPICard label="Total Expenses" value={fmt(summary?.total_expenses || 0)} color="rose" />
        <KPICard label="Net Savings" value={fmt(summary?.net_savings || 0)} color={summary?.net_savings && summary.net_savings >= 0 ? "emerald" : "rose"} />
        <KPICard label="Anomalies" value={String(summary?.anomaly_count || 0)} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Spending by Category</h2>
          {summary?.category_breakdown && Object.keys(summary.category_breakdown).length > 0 ? (
            <BarChart data={summary.category_breakdown} />
          ) : (
            <EmptyState msg="No transaction data yet. Add your first transaction." />
          )}
        </div>

        {/* 7-day forecast */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">7-Day Forecast</h2>
          <p className="text-xs text-gray-400 mb-4">Predicted spending</p>
          {forecast ? (
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{fmt(forecast.predicted_amount)}</div>
              <div className="mt-2 flex items-center gap-1 justify-center text-xs text-gray-500">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
                  {Math.round(forecast.confidence * 100)}% confidence
                </span>
              </div>
              <p className="mt-4 text-xs text-gray-500">Based on your last 90 days of spending history</p>
            </div>
          ) : (
            <EmptyState msg="Not enough data for forecasting." />
          )}
        </div>
      </div>

      {/* Recent transactions + recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Transactions</h2>
          <div className="divide-y divide-gray-100">
            {recentTxns.length === 0 ? (
              <EmptyState msg="No transactions yet." />
            ) : recentTxns.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.transaction_type === "income" ? "bg-emerald-50" : "bg-rose-50"}`}>
                  <span className="text-xs font-bold">{tx.transaction_type === "income" ? "+" : "-"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{tx.merchant || tx.description}</p>
                  <p className="text-xs text-gray-400">{tx.predicted_category || tx.category || "Uncategorized"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${tx.transaction_type === "income" ? "text-emerald-600" : "text-gray-900"}`}>
                    {tx.transaction_type === "income" ? "+" : "-"}{fmt(tx.amount)}
                  </p>
                  {tx.is_anomaly && (
                    <span className="inline-flex items-center text-xs text-amber-600 font-medium">
                      <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                      Anomaly
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">AI Recommendations</h2>
          <div className="space-y-3">
            {recs.length === 0 ? (
              <EmptyState msg="Add transactions to get personalized advice." />
            ) : recs.slice(0, 5).map(r => (
              <div key={r.id} className={`p-3 rounded-lg border text-sm ${
                r.priority === 1 ? "bg-rose-50 border-rose-200" :
                r.priority === 2 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"
              }`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    r.priority === 1 ? "bg-rose-500 text-white" : r.priority === 2 ? "bg-amber-500 text-white" : "bg-gray-400 text-white"
                  }`}>!</span>
                  <div>
                    <p className="font-medium text-gray-900">{r.title}</p>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">{r.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, color }: { label: string; value: string; color: string }) {
  const bg: Record<string, string> = { teal: "bg-teal-50", rose: "bg-rose-50", emerald: "bg-emerald-50", amber: "bg-amber-50" };
  const fg: Record<string, string> = { teal: "text-teal-600", rose: "text-rose-600", emerald: "text-emerald-600", amber: "text-amber-600" };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${fg[color] || "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <div className="py-8 text-center text-sm text-gray-400">{msg}</div>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 bg-gray-100 rounded w-32 animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );
}
