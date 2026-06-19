"use client";
import { useEffect, useState, useCallback } from "react";
import { api, Summary, Txn, ForecastResult, Recommendation } from "@/lib/api";

function fmt(n: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n); }

// Vanilla SVGs for icons
const Icons = {
  ArrowUpRight: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7m0 0H8m9 0v9" /></svg>,
  ArrowDownRight: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7L7 17m0 0h9m-9 0V8" /></svg>,
  TrendingUp: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  AlertTriangle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Sparkles: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  RefreshCw: ({ className }: { className?: string }) => <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  CheckCircle2: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
};

function DonutChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const colors = ["#0d9488","#3b82f6","#8b5cf6","#ec4899","#f59e0b","#84cc16"];
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
    // Handle full circle
    if (end - start >= 1) return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 py-4">
      <svg viewBox="0 0 200 200" className="w-48 h-48 shrink-0 drop-shadow-md">
        {slices.map((s, i) => (
          <path key={i} d={describeArc(s.start, s.end)} fill={s.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
        ))}
        {/* Inner circle for donut hole */}
        <circle cx={cx} cy={cy} r={45} className="fill-card" />
      </svg>
      <div className="space-y-3 w-full">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground flex-1 truncate">{s.label}</span>
            <span className="font-semibold text-foreground">{fmt(s.value)}</span>
            <span className="text-muted-foreground text-xs w-10 text-right">{(s.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [recentTxns, setRecentTxns] = useState<Txn[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

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

  const handleSync = async () => {
    setSyncing(true);
    setSyncDone(false);
    await new Promise(r => setTimeout(r, 2000));
    setSyncing(false);
    setSyncDone(true);
    setTimeout(() => setSyncDone(false), 3000);
    load();
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Your financial overview and AI insights</p>
        </div>
        
        <button 
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-all disabled:opacity-70 shadow-lg shadow-primary/20"
        >
          {syncing ? <Icons.RefreshCw className="animate-spin" /> : syncDone ? <Icons.CheckCircle2 /> : <Icons.RefreshCw />}
          {syncing ? "Syncing Bank..." : syncDone ? "Synced Successfully" : "Sync Bank Accounts"}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <KPICard label="Total Income" value={fmt(summary?.total_income || 0)} icon={Icons.ArrowUpRight} color="text-emerald-500" bg="bg-emerald-500/10" />
        <KPICard label="Total Expenses" value={fmt(summary?.total_expenses || 0)} icon={Icons.ArrowDownRight} color="text-rose-500" bg="bg-rose-500/10" />
        <KPICard label="Net Savings" value={fmt(summary?.net_savings || 0)} icon={Icons.TrendingUp} color={(summary?.net_savings || 0) >= 0 ? "text-emerald-500" : "text-rose-500"} bg={(summary?.net_savings || 0) >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"} />
        <KPICard label="Anomalies Detected" value={String(summary?.anomaly_count || 0)} icon={Icons.AlertTriangle} color="text-amber-500" bg="bg-amber-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Breakdown */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Spending Breakdown</h2>
          {summary?.category_breakdown && Object.keys(summary.category_breakdown).length > 0 ? (
            <DonutChart data={summary.category_breakdown} />
          ) : (
            <EmptyState msg="No transaction data available yet." />
          )}
        </div>

        {/* 7-Day AI Forecast */}
        <div className="glass rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-primary"><Icons.Sparkles /></span>
            <h2 className="text-lg font-semibold text-foreground">7-Day Forecast</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">AI predicted spending</p>
          
          {forecast ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="text-5xl font-bold text-foreground relative z-10 tracking-tight">
                  {fmt(forecast.predicted_amount)}
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2 justify-center text-sm font-medium">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {Math.round(forecast.confidence * 100)}% Confidence
                </span>
              </div>
              <p className="mt-6 text-sm text-muted-foreground max-w-[200px]">Based on your pattern analysis from the last 90 days.</p>
            </div>
          ) : (
            <EmptyState msg="Not enough data to generate forecast." />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
            <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">View All</button>
          </div>
          <div className="space-y-4">
            {recentTxns.length === 0 ? (
              <EmptyState msg="No transactions found." />
            ) : recentTxns.map((tx, i) => (
              <div 
                key={tx.id} 
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group cursor-pointer animate-in slide-in-from-bottom-4 duration-500"
                style={{ animationFillMode: 'both', animationDelay: `${i * 100}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${tx.transaction_type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                  {tx.transaction_type === "income" ? <Icons.ArrowUpRight /> : <Icons.ArrowDownRight />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{tx.merchant || tx.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tx.predicted_category || tx.category || "Uncategorized"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${tx.transaction_type === "income" ? "text-emerald-500" : "text-foreground"}`}>
                    {tx.transaction_type === "income" ? "+" : "-"}{fmt(tx.amount)}
                  </p>
                  {tx.is_anomaly && (
                    <span className="inline-flex items-center text-[10px] uppercase tracking-wider font-bold text-amber-500 mt-1">
                      <span className="w-3 h-3 mr-1"><Icons.AlertTriangle /></span>
                      Anomaly
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="glass rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-primary"><Icons.Sparkles /></span>
            <h2 className="text-lg font-semibold text-foreground">AI Advice</h2>
          </div>
          <div className="space-y-4">
            {recs.length === 0 ? (
              <EmptyState msg="Add more transactions to get personalized AI advice." />
            ) : recs.slice(0, 4).map((r, i) => (
              <div 
                key={r.id} 
                className={`p-4 rounded-xl border relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 ${
                  r.priority === 1 ? "bg-rose-500/5 border-rose-500/20" :
                  r.priority === 2 ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/50 border-border"
                }`}
                style={{ animationFillMode: 'both', animationDelay: `${i * 150}ms` }}
              >
                {r.priority === 1 && <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />}
                {r.priority === 2 && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}
                
                <h3 className="text-sm font-semibold text-foreground mb-1">{r.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color, bg }: { label: string; value: string; icon: any; color: string; bg: string }) {
  return (
    <div className="glass rounded-2xl p-5 shadow-sm relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
          <h3 className="text-2xl font-bold text-foreground tracking-tight">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${bg} ${color} transition-transform group-hover:scale-110`}>
          <Icon />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
        <Icons.Sparkles />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{msg}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-10 bg-muted rounded-xl w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-muted rounded-2xl" />
        <div className="h-96 bg-muted rounded-2xl" />
      </div>
    </div>
  );
}
