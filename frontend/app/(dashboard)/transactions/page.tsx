"use client";
import { useEffect, useState, useCallback } from "react";
import { api, Txn, TxnInput, CategoryResult } from "@/lib/api";

function fmt(n: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n); }

const SUGGESTED_MERCHANTS = [
  "CHIPOTLE ONLINE", "DOORDASH", "GRUBHUB", "UBER EATS", "STARBUCKS #12457",
  "MCDONALD'S F3849", "DUNKIN #88432", "CHICK-FIL-A #3847", "TACO BELL #2948",
  "WHOLE FOODS MKT", "TRADER JOE'S #47", "SAFEWAY STORE #1847", "KROGER #384",
  "COSTCO WHSE #3847", "PUBLIX #3847", "WALMART GROCERY", "UBER TRIP", "LYFT RIDE",
  "MTA MetroCard", "NJ Transit", "AMTRAK Auto Train", "SHELL OIL 47", "CHEVRON #3847",
  "EXXONMOBIL 3847", "BP CONNECT #384", "VALERO #3847", "ENTERPRISE RENT-A-CAR",
  "HERTZ #3847", "AMAZON.COM*MXT29", "AMAZON PRIME*RTX849", "TARGET #3847",
  "WALMART #3847", "BEST BUY #3847", "APPLE.COM/BILL", "NORDSTROM #3847",
  "MACY'S #3847", "NIKE.COM", "ADIDAS ONLINE", "EBAY*PRODLISTING", "ETSYSHOPIFY",
  "IKEA HOME GOODS", "HOME DEPOT #3847", "LOWES #3847", "CVS PHARMACY #3847",
  "WALGREENS #3847", "NETFLIX.COM", "SPOTIFY PREMIUM", "APPLE MUSIC", "HBO MAX SUBSCRIPTION",
  "DISNEY+ BILLED", "HULU LLC", "AMC THEATRES #3847", "STEAM GAMES PURCH", "XBOX LIVE GOLD",
  "PLAYSTATION STORE", "COURSERA CERT", "UDEMY ONLINE", "SKILLSHARE SUB", "LINKEDIN LEARNING",
  "MASTERCLASS SUB", "EXPEDIA HOTELS", "BOOKING.COM RESV", "AIRBNB HOST", "DELTA AIR LINES",
  "UNITED AIRLINES", "AMERICAN AIRLINES", "SOUTHWEST AIR", "MARRIOTT HOTELS", "HILTON WORLDWIDE",
  "ALDI #3847", "LIDL SUPERMARKET"
];

function suggestDescription(merchant: string): string {
  const m = merchant.toUpperCase();
  if (m.includes("STARBUCKS") || m.includes("DUNKIN")) return `${merchant} COFFEE`;
  if (m.includes("CHIPOTLE") || m.includes("MCDONALD") || m.includes("TACO") || m.includes("CHICK-FIL-A") || m.includes("BURGER") || m.includes("WENDY") || m.includes("PIZZA") || m.includes("EATS") || m.includes("DOORDASH") || m.includes("GRUBHUB")) return `${merchant} LUNCH`;
  if (m.includes("UBER TRIP") || m.includes("LYFT")) return `${merchant} RIDE SHARE`;
  if (m.includes("SHELL") || m.includes("CHEVRON") || m.includes("EXXON") || m.includes("BP") || m.includes("VALERO") || m.includes("GAS")) return `${merchant} GAS STATION`;
  if (m.includes("NETFLIX") || m.includes("SPOTIFY") || m.includes("APPLE MUSIC") || m.includes("HBO") || m.includes("DISNEY") || m.includes("HULU") || m.includes("PRIME")) return `${merchant} SUBSCRIPTION`;
  if (m.includes("AMAZON") || m.includes("TARGET") || m.includes("WALMART") || m.includes("BEST BUY") || m.includes("NIKE") || m.includes("ADIDAS") || m.includes("EBAY") || m.includes("IKEA") || m.includes("DEPOT") || m.includes("LOWES") || m.includes("KOHL")) return `${merchant} ONLINE`;
  if (m.includes("COURSERA") || m.includes("UDEMY") || m.includes("SKILLSHARE") || m.includes("LINKEDIN") || m.includes("MASTERCLASS") || m.includes("CODEACADEMY")) return `${merchant} COURSE`;
  if (m.includes("EXPEDIA") || m.includes("BOOKING") || m.includes("AIRBNB") || m.includes("HOTEL") || m.includes("AIR")) return `${merchant} BOOKING`;
  if (m.includes("WHOLE FOODS") || m.includes("TRADER JOE") || m.includes("SAFEWAY") || m.includes("KROGER") || m.includes("PUBLIX") || m.includes("ALDI") || m.includes("LIDL") || m.includes("MARKET")) return `${merchant} GROCERY`;
  return `${merchant} PURCHASE`;
}

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [form, setForm] = useState<TxnInput>({ amount: 0, transaction_type: "expense", description: "", merchant: "" });
  const [catPreview, setCatPreview] = useState<CategoryResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "expense" | "income">("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

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

      // Parse headers
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
      const amountIdx = headers.indexOf("amount");
      const typeIdx = headers.indexOf("transaction_type");
      const descIdx = headers.indexOf("description");
      const merchantIdx = headers.indexOf("merchant");
      const dateIdx = headers.indexOf("transaction_date");

      if (amountIdx === -1 || descIdx === -1) {
        setImportResult({
          success: 0,
          failed: 0,
          errors: ["Invalid headers. CSV must contain 'amount' and 'description' columns."]
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

        const cells: string[] = [];
        let currentCell = "";
        let insideQuotes = false;
        for (let charIdx = 0; charIdx < line.length; charIdx++) {
          const char = line[charIdx];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            cells.push(currentCell.trim().replace(/^"|"$/g, ""));
            currentCell = "";
          } else {
            currentCell += char;
          }
        }
        cells.push(currentCell.trim().replace(/^"|"$/g, ""));

        if (cells.length < Math.max(amountIdx, descIdx) + 1) {
          failedCount++;
          errorMsgs.push(`Row ${i + 1}: incomplete data.`);
          continue;
        }

        try {
          const amount = parseFloat(cells[amountIdx]);
          const description = cells[descIdx];
          if (isNaN(amount)) {
            throw new Error("Amount is not a valid number.");
          }
          if (!description) {
            throw new Error("Description is empty.");
          }

          const rawType = typeIdx !== -1 ? cells[typeIdx].toLowerCase() : "expense";
          const transaction_type = rawType.includes("income") ? "income" : "expense";
          const merchant = merchantIdx !== -1 ? cells[merchantIdx] : "";
          
          let transaction_date: string | undefined = undefined;
          if (dateIdx !== -1 && cells[dateIdx]) {
            const parsedDate = new Date(cells[dateIdx]);
            if (!isNaN(parsedDate.getTime())) {
              transaction_date = parsedDate.toISOString();
            }
          }

          const created = await api.transactions.create({
            amount,
            transaction_type,
            description,
            merchant: merchant || undefined,
            transaction_date: transaction_date || undefined
          });

          setTxns(prev => [created, ...prev]);
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
        <div className="flex gap-2">
          <button onClick={() => { setShowImport(s => !s); setShowAdd(false); setImportResult(null); }}
            className="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            Import CSV
          </button>
          <button onClick={() => { setShowAdd(s => !s); setShowImport(false); }}
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Add Transaction
          </button>
        </div>
      </div>

      {/* Import CSV Panel */}
      {showImport && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 animate-in slide-in-from-top-2 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Import Transactions via CSV</h2>
          <p className="text-xs text-gray-500">
            Upload a CSV file with headers: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">amount</code>, <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">description</code>, <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">transaction_type</code> (optional, defaults to expense), <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">merchant</code> (optional), <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">transaction_date</code> (optional).
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
              Parsing CSV and importing transactions...
            </div>
          )}

          {importResult && (
            <div className={`p-4 rounded-lg text-sm ${importResult.failed > 0 ? "bg-amber-50 border border-amber-200" : "bg-teal-50 border border-teal-200"}`}>
              <p className="font-semibold text-gray-800">Import Completed</p>
              <p className="mt-1 text-gray-600">
                Successfully imported <span className="font-bold text-teal-700">{importResult.success}</span> transactions. 
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
                <input type="text" value={form.merchant || ""} list="merchant-suggestions"
                  onChange={e => {
                    const m = e.target.value;
                    setForm(f => {
                      const oldSuggestion = f.merchant ? suggestDescription(f.merchant) : "";
                      const isDescUnchangedOrEmpty = !f.description || f.description === oldSuggestion;
                      return {
                        ...f,
                        merchant: m,
                        description: isDescUnchangedOrEmpty && m ? suggestDescription(m) : f.description
                      };
                    });
                  }}
                  placeholder="e.g. STARBUCKS #12457"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <datalist id="merchant-suggestions">
                  {SUGGESTED_MERCHANTS.map(item => <option key={item} value={item} />)}
                </datalist>
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
