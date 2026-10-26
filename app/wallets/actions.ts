
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type WalletActionResult = {
  success: boolean;
  message: string;
};

export async function submitWalletRequest(formData: FormData): Promise<WalletActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "প্রথমে লগইন করুন।",
    };
  }

  const type = String(formData.get("transaction_type") ?? "");
  const methodCode = String(formData.get("method_code") ?? "").trim().toLowerCase();
  const amountText = String(formData.get("amount") ?? "").trim();
  const reference = String(formData.get("transaction_reference") ?? "").trim();
  const destination = String(formData.get("destination_details") ?? "").trim();

  if (type !== "deposit" && type !== "withdrawal") {
    return { success: false, message: "লেনদেনের ধরন সঠিক নয়।" };
  }

  if (!["bkash", "nagad", "rocket", "usdt"].includes(methodCode)) {
    return { success: false, message: "পেমেন্ট পদ্ধতি সঠিক নয়।" };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(amountText)) {
    return { success: false, message: "সঠিক পরিমাণ লিখুন।" };
  }

  const amount = Number(amountText);

  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
    return { success: false, message: "পরিমাণ গ্রহণযোগ্য সীমার মধ্যে লিখুন।" };
  }

  if (type === "deposit" && methodCode !== "usdt" && !reference) {
    return { success: false, message: "TrxID লিখুন।" };
  }

  if (type === "withdrawal" && !destination) {
    return {
      success: false,
      message: "যে নম্বর বা ঠিকানায় টাকা নিতে চান, সেটি লিখুন।",
    };
  }

  if (reference.length > 200 || destination.length > 250) {
    return { success: false, message: "দেওয়া তথ্য অনেক বড়। আবার চেষ্টা করুন।" };
  }

  const { data: method, error: methodError } = await supabase
    .from("payment_methods")
    .select("method_code, method_name, is_enabled, deposit_enabled, withdrawal_enabled")
    .eq("method_code", methodCode)
    .eq("is_enabled", true)
    .maybeSingle();

  if (methodError || !method) {
    return { success: false, message: "এই পেমেন্ট পদ্ধতি বর্তমানে চালু নেই।" };
  }

  if (type === "deposit" && !method.deposit_enabled) {
    return { success: false, message: "এই পদ্ধতিতে Deposit বন্ধ আছে।" };
  }

  if (type === "withdrawal" && !method.withdrawal_enabled) {
    return { success: false, message: "এই পদ্ধতিতে Withdrawal বন্ধ আছে।" };
  }

  const { error: insertError } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: user.id,
      transaction_type: type,
      method_code: methodCode,
      amount,
      transaction_reference: reference || null,
      destination_details: type === "withdrawal" ? destination : null,
      status: "pending",
    });

  if (insertError) {
    console.error("Wallet request insert failed:", insertError.message);
    return {
      success: false,
      message: "রিকোয়েস্ট জমা হয়নি। ডেটাবেসের অনুমতি ও কলাম যাচাই করুন।",
    };
  }

  revalidatePath("/wallets");

  return {
    success: true,
    message: "আপনার রিকোয়েস্ট জমা হয়েছে। অনুমোদন না হওয়া পর্যন্ত স্ট্যাটাস Pending থাকবে।",
  };
}
