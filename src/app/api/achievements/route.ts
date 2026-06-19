import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const [user, transactions, wallets, savingsGoals, beneficiaries, referrals] = await Promise.all([
    db.user.findUnique({ where: { id: DEMO_USER_ID } }),
    db.transaction.findMany({ where: { userId: DEMO_USER_ID } }),
    db.wallet.findMany({ where: { userId: DEMO_USER_ID } }),
    db.savingsGoal.findMany({ where: { userId: DEMO_USER_ID } }),
    db.beneficiary.findMany({ where: { userId: DEMO_USER_ID } }),
    db.user.count({ where: { NOT: { id: DEMO_USER_ID } } }),
  ]);

  const totalTx = transactions.length;
  const completedTx = transactions.filter((t) => t.status === "completed").length;
  const totalVolume = transactions.filter((t) => t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const uniqueCounterparties = new Set(transactions.map((t) => t.counterpartyName).filter(Boolean)).size;
  const completedGoals = savingsGoals.filter((g) => g.status === "completed").length;
  const totalWallets = wallets.length;
  const totalBeneficiaries = beneficiaries.length;
  const kycTier = user?.kycTier || 0;

  // Define all achievements
  const achievements = [
    // Onboarding
    { id: "first_steps", icon: "👋", title: "First Steps", description: "Create your GaexPay account", category: "onboarding", unlocked: true, progress: 100, target: 1, current: 1 },
    { id: "first_wallet", icon: "👛", title: "First Wallet", description: "Create your first wallet", category: "onboarding", unlocked: totalWallets >= 1, progress: Math.min(100, totalWallets * 100), target: 1, current: totalWallets },
    { id: "first_send", icon: "💸", title: "First Transfer", description: "Send your first payment", category: "onboarding", unlocked: totalTx >= 1, progress: Math.min(100, totalTx * 100), target: 1, current: Math.min(1, totalTx) },
    { id: "first_beneficiary", icon: "👤", title: "Add a Contact", description: "Save your first beneficiary", category: "onboarding", unlocked: totalBeneficiaries >= 1, progress: Math.min(100, totalBeneficiaries * 100), target: 1, current: totalBeneficiaries },
    { id: "kyc_verified", icon: "✅", title: "Verified Identity", description: "Complete KYC verification", category: "onboarding", unlocked: kycTier >= 1, progress: kycTier * 33, target: 3, current: kycTier },

    // Transactions
    { id: "tx_10", icon: "🔄", title: "Getting Started", description: "Complete 10 transactions", category: "transactions", unlocked: completedTx >= 10, progress: Math.min(100, (completedTx / 10) * 100), target: 10, current: Math.min(10, completedTx) },
    { id: "tx_50", icon: "⚡", title: "Active User", description: "Complete 50 transactions", category: "transactions", unlocked: completedTx >= 50, progress: Math.min(100, (completedTx / 50) * 100), target: 50, current: Math.min(50, completedTx) },
    { id: "tx_100", icon: "🚀", title: "Centurion", description: "Complete 100 transactions", category: "transactions", unlocked: completedTx >= 100, progress: Math.min(100, (completedTx / 100) * 100), target: 100, current: Math.min(100, completedTx) },
    { id: "tx_500", icon: "💎", title: "Transaction Master", description: "Complete 500 transactions", category: "transactions", unlocked: completedTx >= 500, progress: Math.min(100, (completedTx / 500) * 100), target: 500, current: Math.min(500, completedTx) },

    // Volume
    { id: "vol_100k", icon: "💰", title: "First 100K", description: "Process ₦100,000 in total volume", category: "volume", unlocked: totalVolume >= 100000, progress: Math.min(100, (totalVolume / 100000) * 100), target: 100000, current: Math.min(100000, totalVolume) },
    { id: "vol_1m", icon: "🏆", title: "Million Club", description: "Process ₦1,000,000 in total volume", category: "volume", unlocked: totalVolume >= 1000000, progress: Math.min(100, (totalVolume / 1000000) * 100), target: 1000000, current: Math.min(1000000, totalVolume) },
    { id: "vol_10m", icon: "👑", title: "Tycoon", description: "Process ₦10,000,000 in total volume", category: "volume", unlocked: totalVolume >= 10000000, progress: Math.min(100, (totalVolume / 10000000) * 100), target: 10000000, current: Math.min(10000000, totalVolume) },

    // Social
    { id: "network_5", icon: "🤝", title: "Social Butterfly", description: "Send money to 5 different people", category: "social", unlocked: uniqueCounterparties >= 5, progress: Math.min(100, (uniqueCounterparties / 5) * 100), target: 5, current: Math.min(5, uniqueCounterparties) },
    { id: "network_20", icon: "🌐", title: "Well Connected", description: "Send money to 20 different people", category: "social", unlocked: uniqueCounterparties >= 20, progress: Math.min(100, (uniqueCounterparties / 20) * 100), target: 20, current: Math.min(20, uniqueCounterparties) },
    { id: "referral_1", icon: "🎁", title: "Referrer", description: "Invite your first friend", category: "social", unlocked: (user?.referralCount || 0) >= 1, progress: Math.min(100, (user?.referralCount || 0) * 100), target: 1, current: user?.referralCount || 0 },
    { id: "referral_10", icon: "⭐", title: "Influencer", description: "Invite 10 friends to GaexPay", category: "social", unlocked: (user?.referralCount || 0) >= 10, progress: Math.min(100, ((user?.referralCount || 0) / 10) * 100), target: 10, current: Math.min(10, user?.referralCount || 0) },

    // Savings
    { id: "savings_goal", icon: "🎯", title: "Goal Setter", description: "Create your first savings goal", category: "savings", unlocked: savingsGoals.length >= 1, progress: Math.min(100, savingsGoals.length * 100), target: 1, current: savingsGoals.length },
    { id: "savings_complete", icon: "🎊", title: "Goal Achiever", description: "Complete a savings goal", category: "savings", unlocked: completedGoals >= 1, progress: Math.min(100, completedGoals * 100), target: 1, current: completedGoals },
    { id: "savings_3", icon: "📈", title: "Serial Saver", description: "Complete 3 savings goals", category: "savings", unlocked: completedGoals >= 3, progress: Math.min(100, (completedGoals / 3) * 100), target: 3, current: Math.min(3, completedGoals) },

    // Multi-currency
    { id: "multi_currency", icon: "🌍", title: "Global Citizen", description: "Hold 3 or more currencies", category: "wallets", unlocked: totalWallets >= 3, progress: Math.min(100, (totalWallets / 3) * 100), target: 3, current: Math.min(3, totalWallets) },
    { id: "multi_currency_5", icon: "💱", title: "Currency Collector", description: "Hold 5 or more currencies", category: "wallets", unlocked: totalWallets >= 5, progress: Math.min(100, (totalWallets / 5) * 100), target: 5, current: Math.min(5, totalWallets) },
  ];

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPct = (unlockedCount / totalCount) * 100;

  // Calculate level based on unlocked achievements
  const level = Math.floor(unlockedCount / 3) + 1;
  const xpInLevel = (unlockedCount % 3) * 100;
  const xpForNextLevel = 300;

  // Group by category
  const categories = ["onboarding", "transactions", "volume", "social", "savings", "wallets"];
  const categoryLabels: Record<string, string> = {
    onboarding: "Getting Started",
    transactions: "Transactions",
    volume: "Volume Milestones",
    social: "Social",
    savings: "Savings",
    wallets: "Wallets",
  };

  const grouped = categories.map((cat) => ({
    id: cat,
    label: categoryLabels[cat],
    achievements: achievements.filter((a) => a.category === cat),
  })).filter((g) => g.achievements.length > 0);

  return NextResponse.json({
    achievements,
    grouped,
    unlockedCount,
    totalCount,
    completionPct,
    level,
    xpInLevel,
    xpForNextLevel,
    stats: {
      totalTx: completedTx,
      totalVolume,
      uniqueCounterparties,
      completedGoals,
      totalWallets,
      totalBeneficiaries,
      referralCount: user?.referralCount || 0,
      kycTier,
    },
  });
}
