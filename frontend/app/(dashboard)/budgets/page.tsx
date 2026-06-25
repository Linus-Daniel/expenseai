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
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [form, setForm] = useState({ category: CATEGORIES[0], monthly_limit: 0, month: currentMonth });
  const [saving, setSaving] = useState(false);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) {
        setImporting(false);
        return;
      }

      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        setImportResult({ success: 0, failed: 0, errors: ["CSV file is empty or missing header row."] });
        setImporting(false);
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
      const categoryIdx = headers.indexOf("category");
      const limitIdx = headers.indexOf("monthly_limit");
      const monthIdx = headers.indexOf("month");

      if (categoryIdx === -1 || limitIdx === -1) {
        setImportResult({
          success: 0,
          failed: 0,
          errors: ["Invalid headers. CSV must contain 'category' and 'monthly_limit' columns."]
        });
        setImporting(false);
        return;
      }

      let successCount = 0;
      let failedCount = 0;
      const errorMsgs: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        if (cells.length < Math.max(categoryIdx, limitIdx) + 1) {
          failedCount++;
          errorMsgs.push(`Row ${i + 1}: incomplete data.`);
          continue;
        }

        try {
          const category = cells[categoryIdx];
          const monthly_limit = parseFloat(cells[limitIdx]);
          const month = monthIdx !== -1 && cells[monthIdx] ? cells[monthIdx] : currentMonth;

          if (!category) {
            throw new Error("Category is empty.");
          }
          if (isNaN(monthly_limit)) {
            throw new Error("Limit is not a valid number.");
          }

          const b = await api.budgets.create({
            category,
            monthly_limit,
            month
          });

          setBudgets(bs => [...bs.filter(x => x.category !== b.category), b]);
          successCount++;
        } catch (err: any) {
          failedCount++;
          errorMsgs.push(`Row ${i + 1}: ${err.message || "Failed to save."}`);
        }
      }

      setImportResult({
        success: successCount,
        failed: failedCount,
        errors: errorMsgs.slice(0, 10)
      });
      setImporting(false);
    };

    reader.readAsText(file);
    e.target.value = "";
  };

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
        <div className="flex gap-2">
          <button onClick={() => { setShowImport(s => !s); setShowAdd(false); setImportResult(null); }}
            className="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Import CSV
          </button>
          <button onClick={() => { setShowAdd(s => !s); setShowImport(false); }}
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Add Budget
          </button>
        </div>
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

      {/* Import CSV Panel */}
      {showImport && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 animate-in slide-in-from-top-2 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Import Budgets via CSV</h2>
          <p className="text-xs text-gray-500">
            Upload a CSV file with headers: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">category</code>, <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">monthly_limit</code>, <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">month</code> (optional, e.g. 2026-06).
          </p>

          <div className="flex items-center gap-4">
            <label className="flex-1 max-w-md flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50 hover:border-teal-500 transition-colors">
              <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span className="text-sm font-medium text-gray-600">Click to select CSV File</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} disabled={importing} />
            </label>
          </div>

          {importing && (
            <div className="flex items-center gap-2 text-sm text-teal-600">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              Parsing CSV and importing budgets...
            </div>
          )}

          {importResult && (
            <div className={`p-4 rounded-lg text-sm ${importResult.failed > 0 ? "bg-amber-50 border border-amber-200" : "bg-teal-50 border border-teal-200"}`}>
              <p className="font-semibold text-gray-800">Import Completed</p>
              <p className="mt-1 text-gray-600">
                Successfully imported <span className="font-bold text-teal-700">{importResult.success}</span> budgets. 
                Failed: <span className="font-bold text-rose-600">{importResult.failed}</span>.
              </p>
              {importResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-rose-700">First few errors:</p>
                  <ul className="list-disc list-inside text-xs text-rose-600 space-y-0.5">
                    {importResult.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
