"use client";
import { useEffect, useState, useCallback } from "react";
import { api, Budget } from "@/lib/api";

function fmt(n: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n); }

const CATEGORIES = ["Food & Dining","Groceries","Transportation","Shopping","Entertainment","Utilities & Bills","Healthcare","Travel","Education"];
const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: CATEGORIES[0], monthly_limit: 0, month: currentMonth });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const b = await api.budgets.list(currentMonth);
      setBudgets(b);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const b = await api.budgets.create(form);
      setBudgets(bs => [...bs.filter(x => x.category !== b.category), b]);
      setShowAdd(false);
      setForm(f => ({ ...f, monthly_limit: 0 }));
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const spentByCategory: Record<string, number> = {};
  // Approximate spent from summary
  // (In production you'd aggregate from the API)

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-500 text-sm mt-1">Track spending limits by category</p>
        </div>
        <button onClick={() => setShowAdd(s => !s)}
          className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Add Budget
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 font-medium uppercase">Total Budgeted</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(budgets.reduce((s, b) => s + b.monthly_limit, 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 font-medium uppercase">Total Spent</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{fmt(budgets.reduce((s, b) => s + b.current_spent, 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 font-medium uppercase">Remaining</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(budgets.reduce((s, b) => s + b.monthly_limit - b.current_spent, 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 font-medium uppercase">Categories</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{budgets.length}</p>
        </div>
      </div>

      {/* Add Budget Form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">New Budget</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Monthly Limit ($)</label>
                <input type="number" step="0.01" min="0" required value={form.monthly_limit || ""}
                  onChange={e => setForm(f => ({ ...f, monthly_limit: parseFloat(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowAdd(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
              <button type="submit" disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg">
                {saving ? "Saving..." : "Save Budget"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budget List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : budgets.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No budgets set. Add your first budget above.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {budgets.map(b => {
              const pct = Math.min((b.current_spent / b.monthly_limit) * 100, 100);
              const over = b.current_spent > b.monthly_limit;
              return (
                <div key={b.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{b.category}</span>
                    <span className="text-sm text-gray-500">
                      {fmt(b.current_spent)} / {fmt(b.monthly_limit)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${over ? "bg-rose-500" : pct > 80 ? "bg-amber-400" : "bg-teal-500"}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <p className={`text-xs mt-1 ${over ? "text-rose-600 font-medium" : "text-gray-400"}`}>
                    {over ? `${fmt(b.current_spent - b.monthly_limit)} over budget` : `${fmt(b.monthly_limit - b.current_spent)} remaining`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
