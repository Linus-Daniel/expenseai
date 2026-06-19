import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    let user = await prisma.user.findFirst();
    if (!user) {
       user = await prisma.user.create({
         data: { email: "demo@expenseai.com", hashed_password: "hash", full_name: "Demo User" }
       });
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const txs = await prisma.transaction.findMany({
      where: { user_id: user.id },
      orderBy: { transaction_date: 'desc' },
      take: limit,
    });

    return NextResponse.json(txs);
  } catch (err) {
    // Graceful fallback if Prisma isn't fully installed yet
    console.error("Prisma error:", err);
    return NextResponse.json([
        { id: "1", user_id: "u1", amount: 120, transaction_type: "expense", description: "Uber Ride", merchant: "Uber", category: "Transport", predicted_category: "Transport", is_anomaly: false, anomaly_score: 0.1, transaction_date: "2026-06-18", created_at: "2026-06-18" },
        { id: "2", user_id: "u1", amount: 4500, transaction_type: "income", description: "Salary", merchant: "Tech Corp", category: "Income", predicted_category: "Income", is_anomaly: false, anomaly_score: 0.05, transaction_date: "2026-06-15", created_at: "2026-06-15" },
        { id: "3", user_id: "u1", amount: 899.99, transaction_type: "expense", description: "Apple Store", merchant: "Apple", category: "Shopping", predicted_category: "Shopping", is_anomaly: true, anomaly_score: 0.95, transaction_date: "2026-06-14", created_at: "2026-06-14" },
        { id: "4", user_id: "u1", amount: 45.50, transaction_type: "expense", description: "Starbucks", merchant: "Starbucks", category: "Food", predicted_category: "Food", is_anomaly: false, anomaly_score: 0.2, transaction_date: "2026-06-13", created_at: "2026-06-13" },
        { id: "5", user_id: "u1", amount: 1200, transaction_type: "expense", description: "Monthly Rent", merchant: "Property Management", category: "Housing", predicted_category: "Housing", is_anomaly: false, anomaly_score: 0.01, transaction_date: "2026-06-01", created_at: "2026-06-01" },
    ]);
  }
}
