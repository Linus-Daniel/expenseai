"use client";
import { useEffect, useState, useCallback } from "react";
import { api, Recommendation } from "@/lib/api";

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "budget" | "savings" | "investment">("all");

  const load = useCallback(async () => {
    try {
      const r = await api.recommendations.list();
      setRecs(r);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDismiss = async (id: string) => {
    try {
      await api.recommendations.dismiss(id);
      setRecs(rs => rs.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleRead = async (id: string) => {
    try {
      await api.recommendations.markRead(id);
      setRecs(rs => rs.map(r => r.id === id ? { ...r, is_read: true } : r));
    } catch (err) { console.error(err); }
  };

  const filtered = recs.filter(r => {
    if (filter === "all") return true;
    return r.recommendation_type === filter;
  });

  const priorityLabel: Record<number, string> = { 1: "High", 2: "Medium", 3: "Low" };
  const typeColor: Record<string, string> = {
    budget: "bg-rose-50 border-rose-200",
    savings: "bg-emerald-50 border-emerald-200",
    investment: "bg-indigo-50 border-indigo-200",
  };
  const priorityBadge: Record<number, string> = {
    1: "bg-rose-100 text-rose-700",
    2: "bg-amber-100 text-amber-700",
    3: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Recommendations</h1>
        <p className="text-gray-500 text-sm mt-1">Personalized financial advice powered by AI</p>
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["all", "budget", "savings", "investment"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-all ${filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">No recommendations yet.</p>
            <p className="text-gray-400 text-xs mt-1">Add transactions to receive personalized financial advice.</p>
          </div>
        ) : filtered.map(r => (
          <div key={r.id} className={`rounded-xl border p-5 transition-opacity ${typeColor[r.recommendation_type] || "bg-gray-50 border-gray-200"} ${r.is_read ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white ${
                r.priority === 1 ? "bg-rose-500" : r.priority === 2 ? "bg-amber-500" : "bg-gray-400"
              }`}>!</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900">{r.title}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge[r.priority]}`}>
                    {priorityLabel[r.priority]}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{r.body}</p>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={() => handleRead(r.id)}
                    className="text-xs font-medium text-teal-600 hover:text-teal-800 transition-colors">
                    {r.is_read ? "Marked as read" : "Mark as read"}
                  </button>
                  <span className="text-gray-300">·</span>
                  <button onClick={() => handleDismiss(r.id)}
                    className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                    Dismiss
                  </button>
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
