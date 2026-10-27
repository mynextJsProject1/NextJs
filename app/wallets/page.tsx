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
  usdt_qr_url: string | null;
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

// --- SVG Icons for Badges ---
const VerifiedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#00e701" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 1C18.075 1 23 5.925 23 12C23 18.075 18.075 23 12 23C5.925 23 1 18.075 1 12C1 5.925 5.925 1 12 1ZM17.207 9.707C17.597 9.316 17.597 8.684 17.207 8.293C16.816 7.902 16.184 7.902 15.793 8.293L10.5 13.586L8.207 11.293C7.816 10.902 7.184 10.902 6.793 11.293C6.402 11.684 6.402 12.316 6.793 12.707L9.793 15.707C10.184 16.098 10.816 16.098 11.207 15.707L17.207 9.707Z" />
  </svg>
);

const PrimaryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD700" xmlns="http://www.w3.org/2000/svg" title="Primary Deposit">
    <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.5304 18.7893 20.0391 18.4142 20.4142C18.0391 20.7893 17.5304 21 17 21H7C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19V18H19V19Z" />
  </svg>
);

const FastIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF4500" xmlns="http://www.w3.org/2000/svg" title="Fast Payment">
    <path d="M13 2L3 14H12V22L22 10H13V2Z" />
  </svg>
);

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
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
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
            "id, method_code, method_name, is_enabled, deposit_enabled, withdrawal_enabled, payment_number, usdt_address, usdt_network, usdt_qr_url"
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
      }, 800);
    } else {
      setIsFetchingDetails(false);
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

      if (type === "deposit" && methodCode !== "usdt") {
        if (!referenceText) {
          setMessage("Transaction ID (TrxID) লিখুন।");
          return;
        }
        if (!/^[A-Z0-9]{8,}$/.test(referenceText)) {
          setMessage("TrxID কমপক্ষে ৮ অক্ষরের হতে হবে এবং বড় হাতের ইংরেজি অক্ষর/সংখ্যা হতে হবে (যেমন: 8N7A2B9C)।");
          return;
        }
      }

      if (type === "withdrawal") {
        if (!destinationText) {
          setMessage("যে নম্বর বা ঠিকানায় টাকা নিতে চান, সেটি লিখুন।");
          return;
        }
        if (methodCode !== "usdt" && !/^01[0-9]{9}$/.test(destinationText)) {
          setMessage("সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।");
          return;
        }
        if (numericAmount < 100) {
          setMessage("মিনিমাম উত্তোলন ১০০ টাকা।");
          return;
        }
        if (numericAmount > profileBalance) {
          setMessage("আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই।");
          return;
        }
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

      setIsSuccess(true);
      
      setTimeout(() => {
        setIsSuccess(false);
        closeModal();
        router.push("/");
      }, 1500);

    } catch {
      setMessage("রিকোয়েস্ট জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      setMessageSuccess(false);
    } finally {
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
        
        {loading ? (
          <div className="wallet-full-loading">
            <i className="fa-solid fa-circle-notch fa-spin"></i>
            <span>Loading wallet details...</span>
          </div>
        ) : (
          <>
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
                      
                      {/* Top Badge (SVG) */}
                      <div className="wallet-badge-icon">
                        {method.method_code === "bkash" && <PrimaryIcon />}
                        {(method.method_code === "nagad" || method.method_code === "rocket") && <FastIcon />}
                      </div>

                      <div className="wallet-method-logo-box">
                        {methodImages[method.method_code] ? (
                          <img src={`${paymentImageBase}/images/payment/${methodImages[method.method_code]}`} alt={`${method.method_name} logo`} loading="lazy" />
                        ) : (
                          <i className="fa-solid fa-wallet" />
                        )}
                      </div>
                      <div className="wallet-method-bottom">
                        <strong>{method.method_name.toUpperCase()}</strong>
                        {/* Verified SVG next to text */}
                        <span className="wallet-verified-icon"><VerifiedIcon /></span>
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
          </>
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

            {isFetchingDetails ? (
              <div className="wallet-loading-details">
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                <p>Loading payment details...</p>
              </div>
            ) : (
              <form className="wallet-form" onSubmit={handleSubmit}>
                
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
                      {selectedMethod.usdt_qr_url ? (
                        <img src={selectedMethod.usdt_qr_url} alt="USDT QR Code" />
                      ) : selectedMethod.usdt_address ? (
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
                      placeholder={selectedMethod.method_code === "usdt" ? "Enter your USDT address" : "Enter your 11 digit number"}
                      maxLength={selectedMethod.method_code === "usdt" ? 250 : 11}
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
                      min={mode === "withdrawal" ? "100" : "0.01"}
                      max="10000000"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  {mode === "withdrawal" && (
                    <small style={{ color: "var(--wallet-muted)", marginTop: "4px" }}>Minimum withdrawal: 100 BDT</small>
                  )}
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
                      onChange={(event) => setReference(event.target.value.toUpperCase())}
                      placeholder={selectedMethod.method_code === "usdt" ? "Enter transaction hash/reference" : "Enter TrxID (Uppercase)"}
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

                {mode === "deposit" && selectedMethod.method_code !== "usdt" && (
                  <p className="wallet-hint-text">
                    You can watch the transaction ID in the wallet app payment video to know how to do this payment.
                  </p>
                )}

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
