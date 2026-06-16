"use client";
import { useEffect, useState, useCallback } from "react";
import { api, Txn, TxnInput, CategoryResult } from "@/lib/api";

function fmt(n: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n); }

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<TxnInput>({ amount: 0, transaction_type: "expense", description: "", merchant: "" });
  const [catPreview, setCatPreview] = useState<CategoryResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    try {
      const t = await api.transactions.list({ limit: 200 });
      setTxns(t);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePreview = async () => {
    if (!form.description) return;
    try {
      const r = await api.transactions.categorize(form.description, form.merchant || "");
      setCatPreview(r);
    } catch { setCatPreview(null); }
  };

  useEffect(() => {
    const t = setTimeout(() => handlePreview(), 500);
    return () => clearTimeout(t);
  }, [form.description, form.merchant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tx = await api.transactions.create(form);
      setTxns(t => [tx, ...t]);
      setForm({ amount: 0, transaction_type: "expense", description: "", merchant: "" });
      setCatPreview(null);
      setShowAdd(false);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const filtered = txns.filter(t => filter === "all" ? true : t.transaction_type === filter);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500 text-sm mt-1">{txns.length} total transactions</p>
        </div>
        <button onClick={() => setShowAdd(s => !s)}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Add Transaction
        </button>
      </div>

      {/* Add Transaction Form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 animate-in slide-in-from-top-2">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">New Transaction</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              {(["expense", "income"] as const).map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, transaction_type: t }))}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-all ${form.transaction_type === t
                    ? t === "expense" ? "bg-rose-50 border-rose-300 text-rose-700" : "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {t === "expense" ? "Expense" : "Income"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Amount ($)</label>
                <input type="number" step="0.01" min="0" required value={form.amount || ""}
                  onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Merchant / Source</label>
                <input type="text" value={form.merchant || ""}
                  onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
                  placeholder="e.g. STARBUCKS #12457"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <input type="text" required value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. COFFEE AT STARBUCKS DOWNTOWN"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>

            {/* AI Category Preview */}
            {catPreview && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm">
                <p className="text-teal-700 font-medium">
                  AI Category: {catPreview.predicted_category}
                  <span className="ml-2 text-xs font-normal text-teal-500">
                    {Math.round(catPreview.confidence * 100)}% confidence
                  </span>
                </p>
                {Object.entries(catPreview.alternatives).length > 0 && (
                  <p className="text-xs text-teal-600 mt-1">
                    Alternatives: {Object.entries(catPreview.alternatives).map(([k, v]) => `${k} (${Math.round(v*100)}%)`).join(", ")}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowAdd(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                {submitting ? "Saving..." : "Save Transaction"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["all", "expense", "income"] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(0); }}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-all ${filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : paged.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No transactions yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{tx.merchant || tx.description}</p>
                    <p className="text-xs text-gray-400 sm:hidden">{tx.predicted_category || tx.category || "Uncategorized"}</p>
                    {tx.is_anomaly && (
                      <span className="inline-flex items-center mt-0.5 text-xs text-amber-600 font-medium">
                        <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                        Anomaly
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                      {tx.predicted_category || tx.category || "Uncategorized"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                    {new Date(tx.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-semibold ${tx.transaction_type === "income" ? "text-emerald-600" : "text-gray-900"}`}>
                      {tx.transaction_type === "income" ? "+" : "-"}{fmt(tx.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
              Previous
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
