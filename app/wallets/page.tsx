
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import { submitWalletRequest } from "./actions";

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
  amount: number | string;
  transaction_reference: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type ModalMode = "deposit" | "withdrawal";

const methodIcons: Record<string, string> = {
  bkash: "fa-mobile-screen-button",
  nagad: "fa-wallet",
  rocket: "fa-rocket",
  usdt: "fa-coins",
};

const methodColors: Record<string, string> = {
  bkash: "#e2136e",
  nagad: "#f58220",
  rocket: "#8b5cf6",
  usdt: "#26a17b",
};

const formatAmount = (amount: number | string) =>
  Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function WalletPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [mode, setMode] = useState<ModalMode>("deposit");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");

  const loadWallet = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login/");
      return;
    }

    setUserId(user.id);

    const [methodResult, transactionResult] = await Promise.all([
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (methodResult.error) {
      setMessage("পেমেন্ট পদ্ধতি লোড হয়নি। Supabase RLS ও অনুমতি পরীক্ষা করুন।");
      setMessageSuccess(false);
    } else {
      setMethods((methodResult.data ?? []) as PaymentMethod[]);
    }

    if (transactionResult.error) {
      setMessage("লেনদেনের ইতিহাস লোড হয়নি। Supabase RLS পরীক্ষা করুন।");
      setMessageSuccess(false);
    } else {
      setTransactions((transactionResult.data ?? []) as WalletTransaction[]);
    }

    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const openModal = (method: PaymentMethod, selectedMode: ModalMode) => {
    setSelectedMethod(method);
    setMode(selectedMode);
    setAmount("");
    setReference("");
    setDestination("");
    setMessage("");
  };

  const closeModal = () => {
    if (submitting) return;
    setSelectedMethod(null);
    setMessage("");
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("কপি হয়েছে।");
      setMessageSuccess(true);
    } catch {
      setMessage("কপি করা যায়নি। ঠিকানাটি হাতে কপি করুন।");
      setMessageSuccess(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedMethod || submitting) return;

    setSubmitting(true);
    setMessage("");

    const formData = new FormData();
    formData.set("transaction_type", mode);
    formData.set("method_code", selectedMethod.method_code);
    formData.set("amount", amount);
    formData.set("transaction_reference", reference);
    formData.set("destination_details", destination);

    try {
      const result = await submitWalletRequest(formData);
      setMessage(result.message);
      setMessageSuccess(result.success);

      if (result.success) {
        setAmount("");
        setReference("");
        setDestination("");
        await loadWallet();
      }
    } catch {
      setMessage("রিকোয়েস্ট জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      setMessageSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  const navigate = (page: string) => {
    const routes: Record<string, string> = {
      home: "/",
      casino: "/casino/",
      lottery: "/lottery/",
      sports: "/sports/",
      chat: "/",
    };
    router.push(routes[page] ?? "/");
  };

  const filteredTransactions =
    historyFilter === "all"
      ? transactions
      : transactions.filter((item) => item.status === historyFilter);

  const availableMethods = methods.filter((method) =>
    mode === "deposit" ? method.deposit_enabled : method.withdrawal_enabled
  );

  return (
    <div className="stake-app wallet-page">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        onHomeClick={() => router.push("/")}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={navigate}
      />

      <main className="stake-main wallet-main">
        <div className="wallet-heading">
          <div>
            <p className="wallet-eyebrow">ACCOUNT MANAGEMENT</p>
            <h1>My Wallet</h1>
            <p className="wallet-subtitle">
              Deposit, withdraw and track your transactions.
            </p>
          </div>
          <div className="wallet-heading-icon">
            <i className="fa-solid fa-wallet" />
          </div>
        </div>

        <section className="wallet-summary">
          <div className="wallet-summary-icon">
            <i className="fa-solid fa-shield-halved" />
          </div>
          <div>
            <span>Wallet Requests</span>
            <strong>Secure Processing</strong>
            <p>Every request is recorded for review.</p>
          </div>
        </section>

        <div className="wallet-tabs" role="tablist" aria-label="Wallet action">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "deposit"}
            className={mode === "deposit" ? "active" : ""}
            onClick={() => {
              setMode("deposit");
              setMessage("");
            }}
          >
            <i className="fa-solid fa-circle-arrow-down" />
            Deposit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "withdrawal"}
            className={mode === "withdrawal" ? "active" : ""}
            onClick={() => {
              setMode("withdrawal");
              setMessage("");
            }}
          >
            <i className="fa-solid fa-circle-arrow-up" />
            Withdraw
          </button>
        </div>

        <div className="wallet-section-title">
          <div>
            <h2>{mode === "deposit" ? "Choose Deposit Method" : "Choose Withdrawal Method"}</h2>
            <p>
              {mode === "deposit"
                ? "Select a payment method to submit a deposit request."
                : "Select a method to request a withdrawal."}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="wallet-state">
            <i className="fa-solid fa-spinner fa-spin" />
            <span>Loading wallet...</span>
          </div>
        ) : availableMethods.length === 0 ? (
          <div className="wallet-state">
            <i className="fa-solid fa-circle-info" />
            <strong>No methods available</strong>
            <span>
              এই ধরনের লেনদেনের জন্য কোনো পদ্ধতি চালু নেই। অ্যাডমিনের সঙ্গে যোগাযোগ করুন।
            </span>
          </div>
        ) : (
          <div className="wallet-method-grid">
            {availableMethods.map((method) => (
              <button
                type="button"
                className="wallet-method-card"
                key={method.method_code}
                onClick={() => openModal(method, mode)}
              >
                <span
                  className="wallet-method-icon"
                  style={{ "--method-color": methodColors[method.method_code] ?? "#00e701" } as React.CSSProperties}
                >
                  <i className={`fa-solid ${methodIcons[method.method_code] ?? "fa-wallet"}`} />
                </span>
                <strong>{method.method_name}</strong>
                <span className="wallet-method-action">
                  {mode === "deposit" ? "Deposit now" : "Withdraw"}
                  <i className="fa-solid fa-chevron-right" />
                </span>
              </button>
            ))}
          </div>
        )}

        <section className="wallet-history">
          <div className="wallet-history-heading">
            <div>
              <h2>Transaction History</h2>
              <p>Your latest 50 wallet requests</p>
            </div>
            <button
              type="button"
              className="wallet-refresh"
              onClick={() => void loadWallet()}
              aria-label="Refresh transaction history"
              disabled={loading}
            >
              <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
            </button>
          </div>

          <div className="wallet-filter">
            {[
              ["all", "All"],
              ["pending", "Pending"],
              ["approved", "Approved"],
              ["rejected", "Rejected"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={historyFilter === value ? "active" : ""}
                onClick={() => setHistoryFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="wallet-history-empty">Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="wallet-history-empty">
              <i className="fa-solid fa-receipt" />
              <strong>No transactions yet</strong>
              <span>Your wallet requests will appear here.</span>
            </div>
          ) : (
            <div className="wallet-transaction-list">
              {filteredTransactions.map((transaction) => {
                const method = methods.find(
                  (item) => item.method_code === transaction.method_code
                );
                return (
                  <article className="wallet-transaction" key={transaction.id}>
                    <div className={`wallet-transaction-icon ${transaction.transaction_type}`}>
                      <i
                        className={`fa-solid ${
                          transaction.transaction_type === "deposit"
                            ? "fa-arrow-down"
                            : "fa-arrow-up"
                        }`}
                      />
                    </div>
                    <div className="wallet-transaction-info">
                      <strong>
                        {transaction.transaction_type === "deposit" ? "Deposit" : "Withdrawal"}
                      </strong>
                      <span>{method?.method_name ?? transaction.method_code.toUpperCase()}</span>
                      <time dateTime={transaction.created_at}>
                        {new Date(transaction.created_at).toLocaleString()}
                      </time>
                    </div>
                    <div className="wallet-transaction-right">
                      <strong>{formatAmount(transaction.amount)}</strong>
                      <span className={`wallet-status ${transaction.status}`}>
                        {transaction.status}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="wallet-security-note">
          <i className="fa-solid fa-lock" />
          Requests remain pending until reviewed. Never share your password or OTP.
        </p>
      </main>

      <Footer activePage="wallet" onNavigate={navigate} />

      {selectedMethod && (
        <div
          className="wallet-modal-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="wallet-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-modal-title"
          >
            <div className="wallet-modal-header">
              <div>
                <span className="wallet-modal-eyebrow">
                  {mode === "deposit" ? "ADD FUNDS" : "CASH OUT"}
                </span>
                <h2 id="wallet-modal-title">
                  {mode === "deposit" ? "Deposit" : "Withdraw"} with{" "}
                  {selectedMethod.method_name}
                </h2>
              </div>
              <button
                type="button"
                className="wallet-modal-close"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close dialog"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form className="wallet-form" onSubmit={handleSubmit}>
              {mode === "deposit" && selectedMethod.method_code !== "usdt" && (
                <div className="wallet-payment-details">
                  <span>Send payment to this number</span>
                  <div className="wallet-copy-row">
                    <strong>
                      {selectedMethod.payment_number || "Admin has not set a number yet"}
                    </strong>
                    {selectedMethod.payment_number && (
                      <button
                        type="button"
                        onClick={() => void copyText(selectedMethod.payment_number!)}
                        aria-label="Copy payment number"
                      >
                        <i className="fa-regular fa-copy" /> Copy
                      </button>
                    )}
                  </div>
                  <p>
                    Payment numberটি অ্যাডমিনের সেট করা তথ্য। টাকা পাঠানোর আগে নম্বর যাচাই করুন।
                  </p>
                </div>
              )}

              {mode === "deposit" && selectedMethod.method_code === "usdt" && (
                <div className="wallet-payment-details">
                  <span>Network</span>
                  <strong>{selectedMethod.usdt_network || "Network not configured"}</strong>
                  <span className="wallet-address-label">USDT Deposit Address</span>
                  <div className="wallet-address-box">
                    <code>
                      {selectedMethod.usdt_address || "Admin has not set an address yet"}
                    </code>
                    {selectedMethod.usdt_address && (
                      <button
                        type="button"
                        onClick={() => void copyText(selectedMethod.usdt_address!)}
                        aria-label="Copy USDT address"
                      >
                        <i className="fa-regular fa-copy" /> Copy
                      </button>
                    )}
                  </div>
                  <p>
                    পাঠানোর আগে নেটওয়ার্ক ও ঠিকানা মিলিয়ে নিন। ভুল নেটওয়ার্কে পাঠালে অর্থ হারাতে পারেন।
                  </p>
                </div>
              )}

              {mode === "withdrawal" && (
                <div className="wallet-field">
                  <label htmlFor="wallet-destination">
                    {selectedMethod.method_code === "usdt"
                      ? "Your USDT wallet address"
                      : "Your receiving number"}
                  </label>
                  <input
                    id="wallet-destination"
                    type="text"
                    autoComplete="off"
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    placeholder={
                      selectedMethod.method_code === "usdt"
                        ? "Enter your USDT address"
                        : "Enter your receiving number"
                    }
                    maxLength={250}
                    required
                  />
                </div>
              )}

              <div className="wallet-field">
                <label htmlFor="wallet-amount">Amount</label>
                <div className="wallet-amount-input">
                  <span>{selectedMethod.method_code === "usdt" ? "USDT" : "BDT"}</span>
                  <input
                    id="wallet-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="10000000"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {mode === "deposit" && (
                <div className="wallet-field">
                  <label htmlFor="wallet-reference">
                    {selectedMethod.method_code === "usdt"
                      ? "Transaction Hash / Reference (if available)"
                      : "Transaction ID (TrxID)"}
                  </label>
                  <input
                    id="wallet-reference"
                    type="text"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder={
                      selectedMethod.method_code === "usdt"
                        ? "Enter transaction hash/reference"
                        : "Enter your TrxID"
                    }
                    maxLength={200}
                    required={selectedMethod.method_code !== "usdt"}
                  />
                </div>
              )}

              {message && (
                <div
                  className={`wallet-form-message ${messageSuccess ? "success" : "error"}`}
                  role="status"
                >
                  {message}
                </div>
              )}

              <button className="wallet-submit" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-lock" />
                    Submit {mode === "deposit" ? "Deposit" : "Withdrawal"} Request
                  </>
                )}
              </button>

              <p className="wallet-form-footnote">
                <i className="fa-solid fa-circle-info" />
                Submission does not guarantee approval. Your request will be reviewed.
              </p>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
