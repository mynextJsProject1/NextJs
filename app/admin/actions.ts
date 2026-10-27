/* app/admin/actions.ts */
"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// সার্ভার সাইড Supabase ক্লায়েন্ট তৈরি
async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// অ্যাডমিন রোল চেক করার ফাংশন
async function isAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin";
}

// ==========================================
// ১. ডিপোজিট অ্যাপ্রুভ করার ফাংশন
// ==========================================
export async function approveDeposit(transactionId: string) {
  const supabase = await createServerSupabaseClient();

  // ১. অ্যাডমিন কি না চেক
  const adminCheck = await isAdmin(supabase);
  if (!adminCheck) {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  // ২. ট্রানজেকশন ডাটা নিয়ে আসা
  const { data: txn, error: txnError } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (txnError || !txn) {
    return { success: false, error: "Transaction not found." };
  }

  if (txn.status !== "pending") {
    return { success: false, error: "Transaction already processed." };
  }

  // ৩. ডিপোজিট অ্যাপ্রুভ লজিক
  const bonusAmount = Number(txn.claimed_bonus_amount) || 0;
  const depositAmount = Number(txn.amount) || 0;
  const totalCredit = depositAmount + bonusAmount;

  // ৩.১. ইউজারের ব্যালেন্স আপডেট
  const { data: profile } = await supabase
    .from("profiles")
    .select("balance, total_required_turnover")
    .eq("id", txn.user_id)
    .single();

  if (!profile) {
    return { success: false, error: "User profile not found." };
  }

  const newBalance = Number(profile.balance) + totalCredit;
  const newTurnover = Number(profile.total_required_turnover) + Number(txn.required_turnover);

  await supabase
    .from("profiles")
    .update({
      balance: newBalance,
      total_required_turnover: newTurnover,
    })
    .eq("id", txn.user_id);

  // ৩.২. ট্রানজেকশন স্ট্যাটাস আপডেট
  const { error: updateError } = await supabase
    .from("wallet_transactions")
    .update({ status: "approved" })
    .eq("id", transactionId);

  if (updateError) {
    return { success: false, error: "Failed to update transaction." };
  }

  return { success: true, message: "Deposit approved successfully." };
}

// ==========================================
// ২. ডিপোজিট রিজেক্ট করার ফাংশন (নতুন যোগ করা হলো)
// ==========================================
export async function rejectDeposit(transactionId: string) {
  const supabase = await createServerSupabaseClient();

  // ১. অ্যাডমিন কি না চেক
  const adminCheck = await isAdmin(supabase);
  if (!adminCheck) {
    return { success: false, error: "Unauthorized. Admin access required." };
  }

  // ২. ট্রানজেকশন চেক করা
  const { data: txn, error: txnError } = await supabase
    .from("wallet_transactions")
    .select("status")
    .eq("id", transactionId)
    .single();

  if (txnError || !txn) {
    return { success: false, error: "Transaction not found." };
  }

  if (txn.status !== "pending") {
    return { success: false, error: "Transaction already processed." };
  }

  // ৩. স্ট্যাটাস rejected করে দেওয়া
  const { error: updateError } = await supabase
    .from("wallet_transactions")
    .update({ status: "rejected" })
    .eq("id", transactionId);

  if (updateError) {
    return { success: false, error: "Failed to reject transaction." };
  }

  return { success: true, message: "Deposit rejected." };
}
