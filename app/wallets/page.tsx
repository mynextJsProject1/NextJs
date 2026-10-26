
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type PaymentMethod = {
  id: number;
  method_code: string;
  method_name: string;
  is_enabled: boolean;
  deposit_enabled: boolean;
  withdrawal_enabled: boolean;
  payment_number: string | null;
  usdt_address: string | null;
  usdt_network: string | null;
};

type WalletTransaction = {
  id: string;
  transaction_type: "deposit" | "withdrawal";
  method_code: string;
  amount: number;
  transaction_reference: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function WalletsPage() {
  const router = useRouter();

  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState("");
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [type, setType] = useState<"deposit" | "withdrawal">("deposit");
  const [methodCode, setMethodCode] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login/");
        return;
      }

      setUserId(authData.user.id);

      const [methodsResult, transactionsResult] = await Promise.all([
        supabase
          .from("payment_methods")
          .select(
            "id, method_code, method_name, is_enabled, deposit_enabled, withdrawal_enabled, payment_number, usdt_address, usdt_network"
          )
          .eq("is_enabled", true)
          .order("id"),

        supabase
          .from("wallet_transactions")
          .select(
            "id, transaction_type, method_code, amount, transaction_reference, status, created_at"
          )
          .eq("user_id", authData.user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (methodsResult.error) {
        setError("পেমেন্ট পদ্ধতি লোড করা যায়নি। Supabase সেটিংস পরীক্ষা করুন।");
      } else {
        setMethods((methodsResult.data ?? []) as PaymentMethod[]);
      }

      if (transactionsResult.error) {
        setError("লেনদেনের তালিকা লোড করা যায়নি। Supabase RLS নীতি পরীক্ষা করুন।");
      } else {
        setTransactions(
          (transactionsResult.data ?? []) as WalletTransaction[]
        );
      }
    } catch {
      setError("Supabase সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const availableMethods = methods.filter((method) =>
    type === "deposit"
      ? method.deposit_enabled
      : method.withdrawal_enabled
  );

  const selectedMethod = availableMethods.find(
    (method) => method.method_code === methodCode
  );

  useEffect(() => {
    if (
      methodCode &&
      !availableMethods.some((method) => method.method_code === methodCode)
    ) {
      setMethodCode("");
    }
  }, [methodCode, methods, type]);

  async function submitRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!userId) {
      setError("প্রথমে Login করুন।");
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("সঠিক পরিমাণ লিখুন।");
      return;
    }

    if (!selectedMethod) {
      setError("একটি চালু পেমেন্ট পদ্ধতি নির্বাচন করুন।");
      return;
    }

    if (!reference.trim()) {
      setError(
        type === "deposit"
          ? "Transaction ID লিখুন।"
          : "যে নম্বর বা Address-এ টাকা তুলবেন সেটি লিখুন।"
      );
      return;
    }

    setSubmitting(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user || authData.user.id !== userId) {
        setError("আপনার Login সেশন যাচাই করা যায়নি। আবার Login করুন।");
        router.replace("/login/");
        return;
      }

      const { error: insertError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: authData.user.id,
          transaction_type: type,
          method_code: selectedMethod.method_code,
          amount: numericAmount,
          transaction_reference: reference.trim(),
          status: "pending",
        });

      if (insertError) {
        setError(
          "অনুরোধ জমা হয়নি। Supabase টেবিল, কলাম ও RLS নীতি পরীক্ষা করুন।"
        );
        return;
      }

      setMessage("আপনার অনুরোধ জমা হয়েছে। যাচাইয়ের জন্য অপেক্ষা করুন।");
      setAmount("");
      setReference("");
      await loadWallet();
    } catch {
      setError("অনুরোধ জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  }

  const methodDestination = (method: PaymentMethod) =>
    method.method_code === "usdt"
      ? method.usdt_address || ""
      : method.payment_number || "";

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-center text-white">
        Wallet লোড হচ্ছে...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => router.push("/")}
          className="mb-5 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
        >
          ← Home
        </button>

        <header className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            My Wallet
          </p>
          <h1 className="mt-2 text-3xl font-bold">Wallets</h1>
          <p className="mt-2 text-slate-400">
            আপনার Deposit ও Withdrawal অনুরোধ পরিচালনা করুন।
          </p>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setType("deposit");
              setMessage("");
              setError("");
            }}
            className={`rounded-xl border p-4 font-bold ${
              type === "deposit"
                ? "border-cyan-400 bg-cyan-500/15 text-cyan-300"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            ↓ Deposit
          </button>

          <button
            type="button"
            onClick={() => {
              setType("withdrawal");
              setMessage("");
              setError("");
            }}
            className={`rounded-xl border p-4 font-bold ${
              type === "withdrawal"
                ? "border-cyan-400 bg-cyan-500/15 text-cyan-300"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            ↑ Withdrawal
          </button>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <h2 className="mb-1 text-xl font-bold">
            {type === "deposit" ? "Deposit Coins" : "Withdraw Coins"}
          </h2>

          <p className="mb-5 text-sm text-slate-400">
            {type === "deposit"
              ? "একটি চালু পেমেন্ট পদ্ধতি নির্বাচন করুন।"
              : "উত্তোলনের জন্য আপনার প্রাপ্য ব্যালেন্স পরে যাচাই করা হবে।"}
          </p>

          {availableMethods.length === 0 ? (
            <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-200">
              এই মুহূর্তে কোনো পেমেন্ট পদ্ধতি চালু নেই।
            </div>
          ) : (
            <form onSubmit={submitRequest} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Payment Method
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {availableMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setMethodCode(method.method_code)}
                      className={`rounded-xl border p-4 text-left font-semibold ${
                        methodCode === method.method_code
                          ? "border-cyan-400 bg-cyan-500/10 text-cyan-300"
                          : "border-slate-700 bg-slate-950 text-white"
                      }`}
                    >
                      {method.method_name}
                      <span className="mt-1 block text-xs font-normal text-slate-400">
                        {method.method_code === "usdt"
                          ? "Crypto"
                          : "Mobile Payment"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedMethod && (
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="mb-2 text-sm text-slate-400">
                    {type === "deposit"
                      ? "পেমেন্টের জন্য নির্ধারিত নম্বর / Address"
                      : "পদ্ধতি"}
                  </p>

                  {type === "deposit" ? (
                    <>
                      <p className="break-all font-semibold text-cyan-300">
                        {methodDestination(selectedMethod) ||
                          "পেমেন্ট নম্বর বা Address এখনো সেট করা হয়নি।"}
                      </p>

                      {selectedMethod.method_code === "usdt" &&
                        selectedMethod.usdt_network && (
                          <p className="mt-2 text-sm text-slate-300">
                            Network: {selectedMethod.usdt_network}
                          </p>
                        )}
                    </>
                  ) : (
                    <p className="font-semibold text-cyan-300">
                      {selectedMethod.method_name}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Amount
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="পরিমাণ লিখুন"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  {type === "deposit"
                    ? "Transaction ID"
                    : "আপনার Withdrawal নম্বর / USDT Address"}
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={
                    type === "deposit"
                      ? "পেমেন্টের Transaction ID লিখুন"
                      : "আপনার নম্বর বা Wallet Address লিখুন"
                  }
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300"
                >
                  {error}
                </p>
              )}

              {message && (
                <p
                  role="status"
                  className="rounded-lg bg-emerald-950/50 p-3 text-sm text-emerald-300"
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedMethod}
                className="w-full rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "জমা হচ্ছে..." : "অনুরোধ জমা দিন"}
              </button>

              <p className="text-xs leading-5 text-slate-400">
                অনুরোধ জমা দেওয়া মানেই পেমেন্ট সম্পন্ন নয়। যাচাই ও অনুমোদন
                না হওয়া পর্যন্ত স্ট্যাটাস Pending থাকবে।
              </p>
            </form>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold">সাম্প্রতিক অনুরোধ</h2>

          {transactions.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
              এখনো কোনো অনুরোধ নেই।
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {transaction.transaction_type === "deposit"
                          ? "Deposit"
                          : "Withdrawal"}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {methods.find(
                          (method) =>
                            method.method_code === transaction.method_code
                        )?.method_name || transaction.method_code}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        transaction.status === "approved"
                          ? "bg-emerald-950 text-emerald-300"
                          : transaction.status === "rejected"
                            ? "bg-red-950 text-red-300"
                            : "bg-amber-950 text-amber-300"
                      }`}
                    >
                      {transaction.status === "pending"
                        ? "Pending"
                        : transaction.status === "approved"
                          ? "Approved"
                          : "Rejected"}
                    </span>
                  </div>

                  <p className="mt-3 text-lg font-bold">
                    {Number(transaction.amount).toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(transaction.created_at).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
