// ── Categories ────────────────────────────────────────────────────────────────
export const CATEGORIES = [
  "Food & Dining","Groceries","Transportation","Shopping",
  "Entertainment","Healthcare","Utilities & Bills","Travel","Education"
];

// ── Merchant Templates ────────────────────────────────────────────────────────
const MERCHANTS = {
  "Food & Dining": [
    { name: "CHIPOTLE ONLINE", r: [8, 25] },
    { name: "STARBUCKS #12457", r: [4, 12] },
    { name: "DOORDASH", r: [15, 55] },
    { name: "MCDONALD'S F3849", r: [5, 18] },
    { name: "UBER EATS", r: [12, 45] },
    { name: "TACO BELL #2948", r: [6, 20] },
  ],
  "Groceries": [
    { name: "WHOLE FOODS MKT", r: [40, 200] },
    { name: "TRADER JOE'S #47", r: [30, 120] },
    { name: "KROGER #384", r: [25, 150] },
    { name: "COSTCO WHSE #3847", r: [80, 350] },
    { name: "SAFEWAY STORE #1847", r: [20, 100] },
  ],
  "Transportation": [
    { name: "UBER TRIP", r: [8, 40] },
    { name: "LYFT RIDE", r: [6, 35] },
    { name: "SHELL OIL 47", r: [30, 90] },
    { name: "PARK N FLY", r: [15, 50] },
  ],
  "Shopping": [
    { name: "AMAZON.COM", r: [15, 200] },
    { name: "TARGET #3847", r: [20, 120] },
    { name: "BEST BUY #3847", r: [50, 500] },
    { name: "NORDSTROM #3847", r: [40, 300] },
  ],
  "Entertainment": [
    { name: "NETFLIX.COM", r: [15.99, 15.99] },
    { name: "SPOTIFY PREMIUM", r: [9.99, 9.99] },
    { name: "AMC THEATRES #3847", r: [12, 30] },
    { name: "STEAM GAMES PURCH", r: [5, 60] },
  ],
  "Healthcare": [
    { name: "CVS PHARMACY #3847", r: [10, 80] },
    { name: "DR. SMITH MD OFFICE", r: [50, 200] },
    { name: "QUEST DIAGNOSTICS", r: [20, 150] },
  ],
  "Utilities & Bills": [
    { name: "AT&T WIRELESS", r: [65, 120] },
    { name: "COMCAST XFINITY", r: [79, 130] },
    { name: "CON EDISON", r: [40, 150] },
    { name: "GOOGLE ONE STORAGE", r: [2.99, 9.99] },
  ],
  "Travel": [
    { name: "EXPEDIA HOTELS", r: [80, 400] },
    { name: "DELTA AIRLINES", r: [150, 800] },
    { name: "AIRBNB HOST", r: [60, 300] },
  ],
  "Education": [
    { name: "COURSERA CERT", r: [39, 79] },
    { name: "UDEMY ONLINE", r: [10, 200] },
    { name: "SKILLSHARE SUB", r: [13, 30] },
  ],
};

const rand = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
const randDate = (s, e) => {
  const d = new Date(s.getTime() + Math.random() * (e.getTime() - s.getTime()));
  return d.toISOString().split("T")[0];
};

// ── Generate Transactions ────────────────────────────────────────────────────
export function generateTransactions(n = 200) {
  const txns = [];
  const end = new Date();
  const start = new Date(end); start.setMonth(start.getMonth() - 6);

  // Monthly salary
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    const sd = new Date(d.getFullYear(), d.getMonth(), 1);
    txns.push({ id: crypto.randomUUID(), amount: 5500, type: "income",
      description: "PAYROLL DIRECT DEP - MONTHLY SALARY", merchant: "PAYROLL DIRECT DEP",
      category: "Salary/Income", predictedCategory: "Salary/Income",
      isAnomaly: false, anomalyScore: null, date: sd.toISOString().split("T")[0] });
  }

  // Random expenses
  for (let i = 0; i < n; i++) {
    const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const ml = MERCHANTS[cat];
    const m = ml[Math.floor(Math.random() * ml.length)];
    const amount = rand(m.r[0], m.r[1]);
    const isAnomaly = Math.random() < 0.02;
    txns.push({
      id: crypto.randomUUID(), amount, type: "expense",
      description: `${m.name} - ${cat}`, merchant: m.name,
      category: cat, predictedCategory: cat,
      isAnomaly, anomalyScore: isAnomaly ? rand(0.6, 0.99) : null,
      date: randDate(start, end),
    });
  }

  return txns.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ── Summary ────────────────────────────────────────────────────────────────────
export function getSummary(txns) {
  const income = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const catTotals = {};
  txns.filter(t => t.type === "expense").forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
  });
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  return {
    totalIncome: Math.round(income * 100) / 100,
    totalExpenses: Math.round(expenses * 100) / 100,
    netSavings: Math.round((income - expenses) * 100) / 100,
    topCategory: sorted[0]?.[0] || null,
    catTotals: Object.fromEntries(sorted),
    anomalyCount: txns.filter(t => t.isAnomaly).length,
  };
}

// ── Forecast ──────────────────────────────────────────────────────────────────
export function getForecast(txns) {
  const daily = {};
  txns.filter(t => t.type === "expense").forEach(t => {
    daily[t.date] = (daily[t.date] || 0) + t.amount;
  });
  const vals = Object.values(daily);
  const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  const forecast = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    return { date: d.toISOString().split("T")[0], predicted: Math.round(avg * rand(0.7, 1.3) * 100) / 100 };
  });
  return { avgDaily: Math.round(avg * 100) / 100, forecast, confidence: 0.78 };
}

// ── Budgets ──────────────────────────────────────────────────────────────────
const BUDGET_LIMITS = {
  "Food & Dining": 600, Groceries: 500, Transportation: 300, Shopping: 400,
  Entertainment: 150, Healthcare: 200, "Utilities & Bills": 350, Travel: 200, Education: 150,
};

export function getBudgets(txns, month) {
  const spent = {};
  txns.filter(t => t.type === "expense" && t.date.startsWith(month))
    .forEach(t => { spent[t.category] = (spent[t.category] || 0) + t.amount; });
  return CATEGORIES.map(cat => ({
    id: crypto.randomUUID(), category: cat,
    limit: BUDGET_LIMITS[cat] || 300,
    spent: Math.round((spent[cat] || 0) * 100) / 100,
    month,
  }));
}

// ── Recommendations ────────────────────────────────────────────────────────────
export function getRecommendations(summary) {
  const recs = [];
  const sr = summary.netSavings / summary.totalIncome;
  if (summary.netSavings < 0) {
    recs.push({ id: crypto.randomUUID(), type: "budget", title: "You spent more than you earned",
      body: `Overspent by $${Math.abs(summary.netSavings).toFixed(2)}. Review your top categories.`, priority: 1 });
  } else if (sr < 0.1) {
    recs.push({ id: crypto.randomUUID(), type: "savings", title: "Low savings rate",
      body: `${(sr * 100).toFixed(1)}% savings rate — below the recommended 20%. Automate transfers to savings.`, priority: 1 });
  } else if (sr >= 0.2) {
    recs.push({ id: crypto.randomUUID(), type: "savings", title: "Great savings discipline!",
      body: `${(sr * 100).toFixed(1)}% savings rate. Consider investing surplus in diversified index funds.`, priority: 3 });
  }
  const thresholds = { "Food & Dining": 0.12, Groceries: 0.10, Transportation: 0.10, Entertainment: 0.05, Shopping: 0.08, "Utilities & Bills": 0.08, Healthcare: 0.05, Travel: 0.05, Education: 0.05 };
  Object.entries(summary.catTotals).slice(0, 3).forEach(([cat, spend]) => {
    const pct = spend / summary.totalIncome;
    const thr = thresholds[cat] || 0.08;
    if (pct > thr) {
      const savings = spend - summary.totalIncome * thr;
      recs.push({ id: crypto.randomUUID(), type: "budget",
        title: `${cat} spending above recommended`,
        body: `${(pct * 100).toFixed(1)}% of income on ${cat} (max: ${(thr * 100).toFixed(0)}%). Save ~$${savings.toFixed(2)}/mo by reducing.`,
        priority: pct > thr * 1.5 ? 1 : 2 });
    }
  });
  if (summary.anomalyCount > 0) {
    recs.push({ id: crypto.randomUUID(), type: "anomaly", title: `${summary.anomalyCount} unusual transaction(s)`,
      body: "Some transactions don't match your normal spending pattern. Review them in Transactions.",
      priority: 1 });
  }
  return recs.sort((a, b) => a.priority - b.priority);
}
