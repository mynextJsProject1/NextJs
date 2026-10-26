"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import Footer from "../../components/Footer";
import "./wallets.css";

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

type ModalMode = "deposit" | "withdrawal";
type PaymentCategory = "fiat" | "crypto";

const methodImages: Record<string, string> = {
  bkash: "bkash.png",
  nagad: "nagad.png",
  rocket: "rocket.png",
  usdt: "usdt.png",
};

const allowedMethods = ["bkash", "nagad", "rocket", "usdt"];
const fiatMethods = ["bkash", "nagad", "rocket"];

const paymentImageBase =
  process.env.NODE_ENV === "production" ? "/NextJs" : "";

export default function WalletPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [mode, setMode] = useState<ModalMode>("deposit");
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>("fiat");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); // নতুন স্টেট: সাবমিট সফল হলে টিক দেখানোর জন্য
  const [isFetchingDetails, setIsFetchingDetails] = useState(false); // নতুন স্টেট: মেথডে ক্লিক করলে লোডিং দেখানোর জন্য
  const [message, setMessage] = useState("");
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileBalance, setProfileBalance] = useState<number>(0);

  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadWallet = useCallback(async () => {
    setLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/signup/");
        return;
      }

      const [methodResult, profileResult] = await Promise.all([
        supabase
          .from("payment_methods")
          .select(
            "id, method_code, method_name, is_enabled, deposit_enabled, withdrawal_enabled, payment_number, usdt_address, usdt_network"
          )
          .eq("is_enabled", true)
          .order("id"),

        supabase
          .from("profiles")
          .select("balance")
          .eq("id", user.id)
          .maybeSingle()
      ]);

      if (methodResult.error) {
        setMessage("পেমেন্ট পদ্ধতি লোড হয়নি। Supabase RLS ও অনুমতি পরীক্ষা করুন।");
        setMessageSuccess(false);
      } else {
        setMethods((methodResult.data ?? []) as PaymentMethod[]);
      }

      if (profileResult.data) {
        setProfileBalance(Number(profileResult.data.balance));
      }
    } catch {
      setMessage("ওয়ালেট লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      setMessageSuccess(false);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    if (!selectedMethod) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting && !isSuccess) {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";

      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [selectedMethod, submitting, isSuccess]);

  // মডাল ওপেন করার সময় লোডিং (Loading Payment details) দেখানোর লজিক
  const openModal = (method: PaymentMethod, selectedMode: ModalMode) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setIsClosing(false);
    setIsSuccess(false);
    setSelectedMethod(method);
    setMode(selectedMode);
    setAmount("");
    setReference("");
    setDestination("");
    setMessage("");
    setMessageSuccess(false);

    if (selectedMode === "deposit") {
      setIsFetchingDetails(true);
      setTimeout(() => {
        setIsFetchingDetails(false);
      }, 800); // ৮০০ মিলিসেকেন্ড লোডিং অ্যানিমেশন দেখাবে
    } else {
      setIsFetchingDetails(false); // Withdrawal এ সরাসরি ফর্ম আসবে
    }
  };

  const closeModal = () => {
    if (submitting || isClosing || isSuccess || !selectedMethod) return;

    setIsClosing(true);
    setMessage("");
    setMessageSuccess(false);

    closeTimerRef.current = setTimeout(() => {
      setSelectedMethod(null);
      setIsClosing(false);
      setIsFetchingDetails(false);
      closeTimerRef.current = null;
    }, 240);
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("কপি হয়েছে।");
      setMessageSuccess(true);
    } catch {
      setMessage("কপি করা যায়নি। ঠিকানাটি হাতে কপি করুন।");
      setMessageSuccess(false);
    }
  };

  const handleCryptoClick = () => {
    setPaymentCategory("crypto");
    setMessage("");
    setMessageSuccess(false);
    const usdtMethod = methods.find((m) => m.method_code === "usdt" && m.deposit_enabled);
    if (usdtMethod) {
      openModal(usdtMethod, "deposit");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedMethod || submitting) return;

    setSubmitting(true);
    setIsSuccess(false);
    setMessage("");
    setMessageSuccess(false);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setMessage("সেশন শেষ হয়েছে। আবার লগইন করুন।");
        setMessageSuccess(false);
        router.replace("/signup/");
        return;
      }

      const type = mode;
      const methodCode = selectedMethod.method_code.trim().toLowerCase();
      const amountText = amount.trim();
      const referenceText = reference.trim();
      const destinationText = destination.trim();

      if (!allowedMethods.includes(methodCode)) {
        setMessage("পেমেন্ট পদ্ধতি সঠিক নয়।");
        return;
      }

      if (!/^\d+(\.\d{1,2})?$/.test(amountText)) {
        setMessage("সঠিক পরিমাণ লিখুন। সর্বোচ্চ ২টি দশমিক ঘর ব্যবহার করুন।");
        return;
      }

      const numericAmount = Number(amountText);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 10000000) {
        setMessage("পরিমাণ ০.০১ থেকে ১০,০০,০০০ পর্যন্ত লিখুন। ০ গ্রহণযোগ্য নয়।");
        return;
      }

      if (type === "deposit" && methodCode !== "usdt" && !referenceText) {
        setMessage("TrxID লিখুন।");
        return;
      }

      if (type === "withdrawal" && !destinationText) {
        setMessage("যে নম্বর বা ঠিকানায় টাকা নিতে চান, সেটি লিখুন।");
        return;
      }

      if (type === "withdrawal" && numericAmount > profileBalance) {
        setMessage("আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই।");
        return;
      }

      const { data: method, error: methodError } = await supabase
        .from("payment_methods")
        .select("method_code, is_enabled, deposit_enabled, withdrawal_enabled")
        .eq("method_code", methodCode)
        .eq("is_enabled", true)
        .maybeSingle();

      if (methodError || !method) {
        setMessage("এই পেমেন্ট পদ্ধতি বর্তমানে চালু নেই।");
        return;
      }

      if (type === "deposit" && !method.deposit_enabled) {
        setMessage("এই পদ্ধতিতে Deposit বন্ধ আছে।");
        return;
      }

      if (type === "withdrawal" && !method.withdrawal_enabled) {
        setMessage("এই পদ্ধতিতে Withdrawal বন্ধ আছে।");
        return;
      }

      const { error: insertError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          transaction_type: type,
          method_code: methodCode,
          amount: numericAmount,
          transaction_reference: referenceText || null,
          destination_details: type === "withdrawal" ? destinationText : null,
          status: "pending",
        });

      if (insertError) {
        setMessage("রিকোয়েস্ট জমা হয়নি। Supabase RLS, টেবিলের কলাম ও INSERT অনুমতি পরীক্ষা করুন।");
        setMessageSuccess(false);
        return;
      }

      // সফলভাবে সাবমিট হলে:
      setIsSuccess(true); // সবুজ টিক দেখাবে
      
      // ১.৫ সেকেন্ড পর হোমপেজে রিডাইরেক্ট হবে
      setTimeout(() => {
        setIsSuccess(false);
        closeModal();
        router.push("/");
      }, 1500);

    } catch {
      setMessage("রিকোয়েস্ট জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      setMessageSuccess(false);
    } finally {
      // isSuccess true থাকলে submitting false করবো না যাতে রিডাইরেক্টের আগে বাটন লক থাকে
      setTimeout(() => {
        setSubmitting(false);
      }, 100); 
    }
  };

  const navigate = (page: string) => {
    const routes: Record<string, string> = {
      home: "/", casino: "/casino/", lottery: "/lottery/", sports: "/sports/", chat: "/",
    };
    router.push(routes[page] ?? "/");
  };

  const availableMethods = methods.filter((method) => {
    if (mode === "deposit") {
      if (!method.deposit_enabled) return false;
      if (paymentCategory === "fiat") return fiatMethods.includes(method.method_code);
      return false; 
    }
    return method.withdrawal_enabled;
  });

  return (
    <div className="stake-app wallet-page">
      <Header onMenuClick={() => setSidebarOpen(true)} onHomeClick={() => router.push("/")} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onNavigate={navigate} />

      <main className="stake-main wallet-main">
        <div className="wallet-tabs" role="tablist" aria-label="Wallet action">
          <span className={`wallet-tabs-indicator ${mode}`} aria-hidden="true" />
          <button
            type="button"
            role="tab"
            aria-selected={mode === "deposit"}
            className={mode === "deposit" ? "active" : ""}
            onClick={() => { setMode("deposit"); setMessage(""); setMessageSuccess(false); }}
          >
            <i className="fa-solid fa-circle-arrow-down" /> Deposit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "withdrawal"}
            className={mode === "withdrawal" ? "active" : ""}
            onClick={() => { setMode("withdrawal"); setMessage(""); setMessageSuccess(false); }}
          >
            <i className="fa-solid fa-circle-arrow-up" /> Withdraw
          </button>
        </div>

        {mode === "deposit" && (
          <div className="wallet-category-selector" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={paymentCategory === "fiat"}
              className={paymentCategory === "fiat" ? "active" : ""}
              onClick={() => { setPaymentCategory("fiat"); setMessage(""); setMessageSuccess(false); }}
            >
              Fiat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={paymentCategory === "crypto"}
              className={paymentCategory === "crypto" ? "active" : ""}
              onClick={handleCryptoClick}
            >
              Crypto
            </button>
          </div>
        )}

        {mode === "deposit" && paymentCategory === "crypto" ? (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
             <button
                type="button"
                className="wallet-submit"
                style={{ display: "inline-block", width: "auto", padding: "12px 32px" }}
                onClick={handleCryptoClick}
             >
                <i className="fa-solid fa-wallet" /> Deposit USDT
             </button>
          </div>
        ) : loading ? (
          <div className="wallet-state">
            <i className="fa-solid fa-spinner fa-spin" />
            <span>Loading wallet...</span>
          </div>
        ) : availableMethods.length === 0 ? (
          <div className="wallet-state">
            <i className="fa-solid fa-circle-info" />
            <strong>No methods available</strong>
            <span>এই ধরনের লেনদেনের জন্য কোনো পদ্ধতি চালু নেই।</span>
          </div>
        ) : (
          <div className="wallet-method-grid">
            {availableMethods.map((method) => {
              const isSelected = selectedMethod?.method_code === method.method_code;
              return (
                <button
                  type="button"
                  className={`wallet-method-card ${isSelected ? "selected" : ""}`}
                  key={method.method_code}
                  onClick={() => openModal(method, mode)}
                  aria-pressed={isSelected}
                >
                  <div className="wallet-method-logo-box">
                    {methodImages[method.method_code] ? (
                      <img src={`${paymentImageBase}/images/payment/${methodImages[method.method_code]}`} alt={`${method.method_name} logo`} loading="lazy" />
                    ) : (
                      <i className="fa-solid fa-wallet" />
                    )}
                  </div>
                  <div className="wallet-method-bottom">
                    <strong>{method.method_name.toUpperCase()}</strong>
                  </div>
                  {isSelected && (
                    <div className="wallet-selected-check">
                      <i className="fa-solid fa-check" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      <Footer activePage="wallet" onNavigate={navigate} />

      {selectedMethod && (
        <div
          className={`wallet-modal-overlay ${isClosing ? "is-closing" : ""}`}
          role="presentation"
          onClick={(event) => { 
            if (event.target === event.currentTarget && !isFetchingDetails && !isSuccess) closeModal(); 
          }}
        >
          <section className={`wallet-modal ${isClosing ? "is-closing" : ""}`} role="dialog" aria-modal="true">
            <div className="wallet-modal-header">
              <h2>{mode === "deposit" ? "Deposit" : "Withdraw"} {selectedMethod.method_name}</h2>
              
              <button type="button" className="wallet-modal-close" onClick={closeModal} disabled={submitting || isClosing || isFetchingDetails || isSuccess} aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* লোডিং পেমেন্ট ডিটেইলস (রিকোয়ারমেন্ট ১) */}
            {isFetchingDetails ? (
              <div className="wallet-loading-details">
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                <p>Loading payment details...</p>
              </div>
            ) : (
              <form className="wallet-form" onSubmit={handleSubmit}>
                
                {/* Fiat Deposit Info */}
                {mode === "deposit" && selectedMethod.method_code !== "usdt" && (
                  <div className="wallet-payment-details">
                    <span>Send payment to this number</span>
                    <div className="wallet-copy-row">
                      <strong>{selectedMethod.payment_number || "Admin has not set a number yet"}</strong>
                      {selectedMethod.payment_number && (
                        <button type="button" onClick={() => void copyText(selectedMethod.payment_number!)}>
                          <i className="fa-regular fa-copy" /> Copy
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* USDT / Crypto Deposit Info */}
                {mode === "deposit" && selectedMethod.method_code === "usdt" && (
                  <div className="crypto-deposit-wrapper">
                    <div className="crypto-dropdowns">
                      <div className="crypto-select-box">
                        <span>Currency</span>
                        <div className="crypto-select-inner">
                          <i className="fa-brands fa-bitcoin" style={{color: '#26a17b'}} /> USDT
                        </div>
                      </div>
                      <div className="crypto-select-box">
                        <span>Network</span>
                        <div className="crypto-select-inner">
                          {selectedMethod.usdt_network || "Network not set"}
                        </div>
                      </div>
                    </div>

                    <div className="wallet-qr-box">
                      {selectedMethod.usdt_address ? (
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedMethod.usdt_address}`} alt="USDT QR Code" />
                      ) : (
                        <span style={{color: '#000'}}>No Address</span>
                      )}
                    </div>

                    <div className="wallet-address-label">Deposit address</div>
                    <div className="wallet-address-box-dark">
                      <code>{selectedMethod.usdt_address || "Admin has not set an address yet"}</code>
                      {selectedMethod.usdt_address && (
                        <button type="button" onClick={() => void copyText(selectedMethod.usdt_address!)}>
                          <i className="fa-regular fa-copy" />
                        </button>
                      )}
                    </div>

                    <div className="wallet-alert-box">
                      <i className="fa-solid fa-circle-exclamation" />
                      <p>Send only {selectedMethod.method_name} to this deposit address. Transfers below minimum will not be credited.</p>
                    </div>
                  </div>
                )}

                {mode === "withdrawal" && (
                  <div className="wallet-field">
                    <label htmlFor="wallet-destination">
                      {selectedMethod.method_code === "usdt" ? "Your USDT wallet address" : "Your receiving number"}
                    </label>
                    <input
                      id="wallet-destination"
                      type="text"
                      autoComplete="off"
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      placeholder={selectedMethod.method_code === "usdt" ? "Enter your USDT address" : "Enter your receiving number"}
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
                      {selectedMethod.method_code === "usdt" ? "Transaction Hash / Reference (if available)" : "Transaction ID (TrxID)"}
                    </label>
                    <input
                      id="wallet-reference"
                      type="text"
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      placeholder={selectedMethod.method_code === "usdt" ? "Enter transaction hash/reference" : "Enter your TrxID"}
                      maxLength={200}
                      required={selectedMethod.method_code !== "usdt"}
                    />
                  </div>
                )}

                {message && (
                  <div className={`wallet-form-message ${messageSuccess ? "success" : "error"}`} role="status">
                    {message}
                  </div>
                )}

                {/* সাবমিট বাটনের স্টেট (রিকোয়ারমেন্ট ২ ও ৩) */}
                <button 
                  className={`wallet-submit ${submitting ? 'is-processing' : ''} ${isSuccess ? 'is-success' : ''}`} 
                  type="submit" 
                  disabled={submitting || isSuccess}
                >
                  {isSuccess ? (
                    <div className="submit-success-content">
                      <i className="fa-solid fa-circle-check" />
                      <span>Success!</span>
                    </div>
                  ) : submitting ? (
                    <div className={`submit-processing-content ${mode === "withdrawal" ? "large-text" : ""}`}>
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <><i className="fa-solid fa-lock" /> Submit {mode === "deposit" ? "Deposit" : "Withdrawal"} Request</>
                  )}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
