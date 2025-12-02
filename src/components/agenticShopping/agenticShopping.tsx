/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react/dist/iconify.js";
// import { useCustomerAddress } from "@/hooks/useAddress";
// import { useNavigate } from "react-router";
import {
  CURRENCY_PREF,
  getVariantColor,
  getVariantSize,
  findVariantBy,
  pickVariantMoney,
  isVariantOnStock,
} from "./productVariantHelper";
import { apiConfig } from "../../config/api";
import { getJWTToken, authData } from "../../sfcc-apis/session";

type AgenticShoppingProps = {
  open: boolean;
  onClose: () => void;
  product: any;
  index?: number;
  addressListProp?: any;
  addressLoading?: boolean;
};

const initialCapital = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

type DeliveryOptionKey = "standard" | "express" | "sameday";

const DELIVERY_OPTIONS: Record<
  DeliveryOptionKey,
  { label: string; fee: number; subtitle: string; icon: string }
> = {
  standard: {
    label: "Standard Delivery",
    fee: 0,
    subtitle: "Arrives in 4–6 days (Free)",
    icon: "mdi:clock-outline",
  },
  express: {
    label: "Express Delivery",
    fee: 5,
    subtitle: "Arrives in 1–2 days (+$5)",
    icon: "mdi:flash",
  },
  sameday: {
    label: "Same-Day Delivery",
    fee: 10,
    subtitle: "Available in select locations (+$10)",
    icon: "mdi:truck-fast-outline",
  },
};

const SHIPPING_METHOD_MAP: Record<DeliveryOptionKey, string> = {
  standard: "GROUND",
  express: "2-DAY SHIPPING",
  sameday: "OVERNIGHT",
};

const formatCurrency = (amount: number, currency: string) => {
  try {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: currency || "USD",
    });
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

// ------------ any/any helpers ------------
const pvMaster = (p?: any): any | undefined => p?.masterVariant;
const pvVariants = (p?: any): any[] =>
  Array.isArray(p?.variants) ? p!.variants : [];
const pvAll = (p?: any): any[] => {
  const m = pvMaster(p);
  return m ? [m, ...pvVariants(p)] : pvVariants(p);
};

const getVariantByIndex = (p: any, idx = 0): any | undefined => pvAll(p)[idx];

const getVariantImage = (v?: any) => v?.images?.[0]?.url ?? "";

// any-aware image/title
const getProductImage = (p?: any, v?: any) =>
  getVariantImage(v) ||
  (p as any)?.image ||
  (p as any)?.images?.[0]?.src ||
  (p as any)?.media?.[0]?.url ||
  "";

const getProductTitle = (p?: any) =>
  p?.name || (p as any)?.title || (p as any)?.productName || "any";

/** any price via pickVariantMoney with safe fallbacks */
const getVariantPrice = (v?: any) => {
  const picked = v ? pickVariantMoney(v, CURRENCY_PREF) : null;
  if (picked?.cent && picked?.cur) {
    return {
      amount: +(picked.cent / 100),
      currency: picked.cur,
      regularAmount: picked.regularCent ? picked.regularCent / 100 : undefined,
    };
  }
  const cents = v?.prices?.[0]?.value?.centAmount;
  const cur = v?.prices?.[0]?.value?.currencyCode ?? CURRENCY_PREF;
  const amount = Number.isFinite(cents) ? +(Number(cents) / 100) : 0;
  return { amount, currency: cur };
};

const getProductPrice = (p?: any, v?: any) => {
  const { amount } = getVariantPrice(v);
  if (amount) return amount;
  const val =
    (p as any)?.price ??
    (p as any)?.sellingPrice ??
    (p as any)?.unitPrice ??
    (p as any)?.mrp ??
    0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

const getProductSku = (p?: any) =>
  (p as any)?.sku || (p as any)?.variant?.sku || (p as any)?.selectedSku || "";
const getProductColor = (p?: any) =>
  (p as any)?.color ||
  (p as any)?.selectedColor ||
  (p as any)?.variant?.color ||
  "";
const getProductSize = (p?: any) =>
  (p as any)?.size ||
  (p as any)?.selectedSize ||
  (p as any)?.variant?.size ||
  "";

// ----------------- Local Address Mapping -----------------
// const mapGraphQLAddressToUI = (a: any) => {
//   const addressLine1 = [a?.streetNumber, a?.streetName]
//     .filter(Boolean)
//     .join(" ")
//     .trim();
//   const addressLine2 = a?.building ?? "";
//   return {
//     ...a,
//     addressId: String(a?.id ?? a?.addressId ?? ""),
//     addressLine1,
//     addressLine2,
//     street: "",
//     city: a?.city ?? "",
//     state: a?.state ?? "",
//     postalCode: a?.postalCode ?? "",
//     country: a?.country ?? "",
//     firstName: a?.firstName ?? "",
//     lastName: a?.lastName ?? "",
//     phone: a?.phone ?? "",
//     email: a?.email ?? "",
//   } as any;
// };

// ----------------- Chat Types -----------------
type Stage =
  | "initial"
  | "address"
  | "delivery"
  | "payment"
  | "final"
  | "success";
type ChatItem = {
  query: string;
  response: string;
  snapshotStage?: Stage;
  snapshotPayload?: any;
};
type ContextItem = {
  userQuery: string;
  mainResponse: string;
  keywords: string;
};
const MAX_CONTEXT_ITEMS = 20;

type VariantEntry = { index: number; variant: any; images: string[] };

const AgenticShopping = ({
  open,
  onClose,
  product,
  index,
  addressListProp,
  addressLoading,
}: AgenticShoppingProps) => {
  const cachedToken: any = null;
  const tokenExpiry: any = null;

  const allVariants = pvAll(product);
  const safeInitialIdx = Math.min(
    Math.max(0, index || 0),
    Math.max(0, allVariants.length - 1)
  );
  const variantCount = allVariants.length;

  const [selectedVariantIdx, setSelectedVariantIdx] =
    useState<number>(safeInitialIdx);

  // PDP-like picked color/size state
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [pickedSize, setPickedSize] = useState<string | null>(null);
  const masterColorRef = useRef<string | null>(null);
  const masterSizeRef = useRef<string | null>(null);
  //   const navigate = useNavigate();
  const selectedVariant = getVariantByIndex(product, selectedVariantIdx);

  // flow gating states
  const [pendingQuery, setPendingQuery] = useState<string>("");
  const [showProceedConfirm, setShowProceedConfirm] = useState<boolean>(false);
  const [showVariantPicker, setShowVariantPicker] = useState<boolean>(false);

  // ------------- Chat & flow state -------------
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [chatLocked, setChatLocked] = useState(false);
  const [extractedDetails, setExtractedDetails] = useState<any | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [contextHistory, setContextHistory] = useState<ContextItem[]>([]);

  // address + delivery state
  const [addressList, setAddressList] = useState<any[]>([]);
  const [showAddressSelection, setShowAddressSelection] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<
    string | undefined
  >();
  const [confirmButton, SetConfirmButton] = useState(true);
  const [addressSubmitted, setAddressSubmitted] = useState(false);

  const [showDeliveryOptions, setShowDeliveryOptions] = useState(false);
  const [selectedDelivery, setSelectedDelivery] =
    useState<DeliveryOptionKey>("standard");
  const [deliverySubmitted, setDeliverySubmitted] = useState(false);

  // payment state
  type PaymentMethodKey = "card";
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentMethodKey>("card");
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  const [showFinalSummary, setShowFinalSummary] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [intentMandateId, setIntentMandateId] = useState<string | null>(null);

  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // GraphQL address hook
  //   const {
  //     getCustomerAddresses,
  //     addresses: hookAddresses,
  //     loading: addressLoading,
  //   } = useCustomerAddress();

  // Normalize addresses
  //   useEffect(() => {
  //     if (!Array.isArray(hookAddresses)) return;
  //     const normalized = hookAddresses.map(mapGraphQLAddressToUI);
  //     setAddressList((prev) => {
  //       if (
  //         prev.length === normalized.length &&
  //         prev.every(
  //           (p, i) =>
  //             String((p as any).addressId) ===
  //             String((normalized[i] as any).addressId)
  //         )
  //       ) {
  //         return prev;
  //       }
  //       return normalized;
  //     });
  //   }, [hookAddresses]);

  // seed defaults from master on product/index change
  useEffect(() => {
    const all = pvAll(product);
    const bounded = Math.min(
      Math.max(0, index || 0),
      Math.max(0, all.length - 1)
    );
    setSelectedVariantIdx(bounded);

    const m = pvMaster(product);
    const mColor = getVariantColor(m);
    const mSize = getVariantSize(m);

    masterColorRef.current = mColor || null;
    masterSizeRef.current = mSize || null;
    setPickedColor(mColor || null);
    setPickedSize(mSize || null);
  }, [index, product]);

  // scroll to bottom on changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [
    chatHistory,
    showAddressSelection,
    addressSubmitted,
    showDeliveryOptions,
    deliverySubmitted,
    showPaymentOptions,
    paymentSubmitted,
    showFinalSummary,
    confirmSuccess,
    showProceedConfirm,
    showVariantPicker,
  ]);

  // --------------------- UI helpers (theme) ---------------------
  const themeColor = "var(--tanya)";
  const themeDark = "var(--tanya-contrast)";
  const theme = themeColor || "#16a34a";
  const themeHeaderBg = "#2b72b8";

  const handleFeedbackSubmit = () => {
    console.log("AgenticShopping feedback:", {
      rating: feedbackRating,
      comment: feedbackComment,
    });
    setFeedbackSubmitted(true);
  };

  const handleFeedbackCancel = () => {
    setFeedbackRating(null);
    setFeedbackComment("");
    setFeedbackSubmitted(true);
  };

  // --------------------- Snapshots ---------------------
  const renderSuccessSnapshot = (payload?: any) => {
    const idFromPayload =
      payload?.intentMandateId ||
      payload?.intent_mandate_id ||
      payload?.id ||
      null;

    const id = idFromPayload ?? intentMandateId;
    console.log(open, "it is open");
    if (!open) return null;

    return (
      <div className="mt-3 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
        <div className="success-tick-animation">
          <Icon icon="mdi:check-circle" width="28" color="#16a34a" />
        </div>
        <div className="text-sm w-full">
          <div className="font-semibold">Success!</div>
          <div>
            Your smart order has been saved. I’ll watch the price and
            auto-purchase when the conditions are met.
          </div>

          {id && (
            <div className="mt-2 text-xs font-medium">
              Your Smart Order ID:&nbsp;
              <span
                className="font-semibold text-blue-600 cursor-pointer underline"
                // onClick={() => navigate(`/smart-order-detail/${id}`)}
              >
                {id}
              </span>
            </div>
          )}

          {!feedbackSubmitted && (
            <div className="mt-4 rounded-lg bg-white/70 p-3 text-gray-900">
              <h4 className="font-semibold mb-1">
                Please post your feedback here
              </h4>

              <p className="text-sm text-gray-700 mb-3">
                Rate us on how much our response was helpful
              </p>

              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className="p-0.5"
                  >
                    <Icon
                      icon={
                        feedbackRating && feedbackRating >= star
                          ? "mdi:star"
                          : "mdi:star-outline"
                      }
                      width="20"
                      className="text-yellow-500"
                    />
                  </button>
                ))}
              </div>

              <label className="block text-sm text-gray-700 mb-1">
                Tell us more about the response
              </label>
              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:ring-1 focus:ring-gray-300"
                placeholder="Your feedback helps us improve..."
              />

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleFeedbackCancel}
                  className="px-4 py-2 rounded-full border text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFeedbackSubmit}
                  className="px-4 py-2 rounded-full text-sm font-semibold text-white shadow"
                  style={{ background: themeColor }}
                  disabled={!feedbackRating && !feedbackComment.trim()}
                >
                  Submit
                </button>
              </div>
            </div>
          )}

          {feedbackSubmitted && (
            <div className="mt-3 text-xs text-green-900 font-medium">
              Thanks for your feedback! 💚
            </div>
          )}
        </div>
      </div>
    );
  };

  const getAllAddresses = async () => {
    try {
      //   const fetched = await getCustomerAddresses();
      //   const normalized = (fetched || []).map(mapGraphQLAddressToUI);
      setAddressList(addressListProp);
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
  };

  const snapshotToHistory = (stage: Stage, payload: any) => {
    setChatHistory((prev) => [
      ...prev,
      {
        query: "",
        response: "__SNAPSHOT__",
        snapshotStage: stage,
        snapshotPayload: payload,
      },
    ]);
  };

  const finalizeLiveCards = (stage?: Stage, payload?: any) => {
    setChatHistory((prev) =>
      prev.map((m) =>
        m.response === "__CARD__"
          ? {
              ...m,
              response: "__SNAPSHOT__",
              snapshotStage: stage ?? m.snapshotStage,
              snapshotPayload: payload ?? m.snapshotPayload,
            }
          : m
      )
    );
  };

  const removeAllAssistantLiveRows = () => {
    setChatHistory((prev) =>
      prev.filter(
        (m) =>
          !(
            m.query === "" &&
            m.response !== "__SNAPSHOT__" &&
            m.response !== "__TEXT__"
          )
      )
    );
  };

  const hardResetLive = () => {
    setShowFinalSummary(false);
    setShowAddressSelection(false);
    setShowDeliveryOptions(false);
    setShowPaymentOptions(false);
    setAddressSubmitted(false);
    setDeliverySubmitted(false);
    setPaymentSubmitted(false);
    setConfirmSuccess(false);
    setChatLocked(false);
    setExtractedDetails(null);
    removeAllAssistantLiveRows();
    setShowProceedConfirm(false);
    setShowVariantPicker(false);
  };

  const resetFlowStateForNewQuery = () => {
    setShowAddressSelection(false);
    setAddressSubmitted(false);
    setShowDeliveryOptions(false);
    setSelectedDelivery("standard");
    setDeliverySubmitted(false);
    setShowPaymentOptions(false);
    setSelectedPayment("card");
    setPaymentSubmitted(false);
    setShowFinalSummary(false);
    setConfirmSuccess(false);
    SetConfirmButton(true);
    setExtractedDetails(null);

    localStorage.removeItem("agentic_order");
    localStorage.removeItem("agentic_order_address");
    localStorage.removeItem("agentic_order_delivery");
    localStorage.removeItem("agentic_order_payment");
    localStorage.removeItem("agentic_order_final");
  };

  const variantEntries: VariantEntry[] = useMemo(() => {
    const all = pvAll(product);
    return all.map((v, i) => ({
      index: i,
      variant: v,
      images: (v?.images || [])
        .map((img: any) => img?.url || "")
        .filter(Boolean),
    }));
  }, [product]);

  const hasMatchingVariant = useMemo(() => {
    if (!variantEntries.length) return false;

    const color = pickedColor || undefined;
    const size = pickedSize || undefined;

    const resolveFor = (c?: string | null, s?: string | null) => {
      const combo = findVariantBy(
        variantEntries,
        c || undefined,
        s || undefined
      );
      return !!(combo && combo.variant?.sku);
    };

    if (color && size) return resolveFor(color, size);
    if (color && !size) return resolveFor(color, null);
    if (!color && size) return resolveFor(undefined, size);

    // No explicit picks → rely on selectedVariant
    return !!(selectedVariant && selectedVariant.sku);
  }, [variantEntries, pickedColor, pickedSize, selectedVariant]);

  const isInputDisabled = isLoading || chatLocked || !hasMatchingVariant;

  // ---------- PRICE HELPERS ----------
  const getQuantity = (details?: any) => {
    const q = Number(details?.quantity ?? 1);
    return Number.isFinite(q) && q > 0 ? q : 1;
  };

  const computeProductTotalWithFallback = (details?: any) => {
    const quantity = getQuantity(details);
    const minor = Number(details?.max_price_minor ?? 0);
    const hasValidMinor = Number.isFinite(minor) && minor > 0;
    if (hasValidMinor) {
      return +(minor / 100);
    }
    const unitPrice = getProductPrice(product, selectedVariant);
    return +(unitPrice * quantity);
  };

  const computeSummary = (currencyArg?: string) => {
    const source = extractedDetails;
    const variantPrice = getVariantPrice(selectedVariant);
    const currency =
      currencyArg || source?.currency || variantPrice.currency || CURRENCY_PREF;
    const product_total = computeProductTotalWithFallback(source);
    const tax = +(product_total * 0.08).toFixed(2);
    const shipping_fee = DELIVERY_OPTIONS[selectedDelivery]?.fee || 0;
    return { product_total, tax, shipping_fee, currency };
  };

  const startFlowWithSku = async (
    query: string,
    sku: string,
    variantIndex: number
  ) => {
    finalizeLiveCards();
    resetFlowStateForNewQuery();

    setIsLoading(true);
    setChatLocked(true);
    setShowProceedConfirm(false);
    setShowVariantPicker(false);

    const contextToSend = contextHistory.slice(-MAX_CONTEXT_ITEMS);

    try {
      const token = await getJWTToken(cachedToken, tokenExpiry);
      if (!token) throw new Error("Failed to fetch token");

      const user = localStorage.getItem("customerNumber");
      const isLoggedIn = localStorage.getItem("isLoggedIn");
      const queryParams = new URLSearchParams({
        registered: String(isLoggedIn || false),
        userId: String(user || new Date().getTime()),
      });
      const invokeUrl = `https://tanya.aspiresystems.com/api/bedrock/invoke/stream?${queryParams.toString()}`;

      const response = await fetch(`${invokeUrl}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          flowId: "MTMI0P4LC6",
          flowAliasId: "BCUA138F2Q",
          input: {
            instruction: `Use SKU ${sku}. Currency is USD. ${query}`,
            metadata: {
              productId: (product as any)?.id ?? null,
              skuId: sku ?? null,
              variantIndex,
            },
            context: contextToSend,
          },
        }),
      });

      if (!response.body) throw new Error("Readable stream not supported");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let finalResponse = "";
      let finalKeywords = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const jsonData = line.slice(5).trim();
          try {
            const parsed = JSON.parse(jsonData);
            const idx = parsed.index;
            const data = parsed.data;

            if (idx === 0) {
              finalResponse = String(data ?? "");
            } else if (idx === 1) {
              finalKeywords = String(data ?? "");
            }
          } catch (err) {
            console.error("Error parsing JSON chunk:", err);
          }
        }
      }

      let extracted: any | null = null;
      if (finalResponse) {
        const maybeJson = String(finalResponse).replace(/\\n/g, "").trim();
        if (maybeJson.startsWith("{") && maybeJson.endsWith("}")) {
          try {
            extracted = JSON.parse(maybeJson);
            extracted.product_id = sku;
            extracted.sku_id = sku;
            localStorage.setItem("agentic_order", JSON.stringify(extracted));
          } catch (err: any) {
            console.log(err);
          }
        }
      }

      setExtractedDetails(extracted);

      if (extracted) {
        setChatHistory((prev) => [
          ...prev,
          {
            query: "",
            response: "__CARD__",
            snapshotPayload: { extractedDetails: extracted },
          },
        ]);
      }

      setContextHistory((prev) => {
        const next = [
          ...prev,
          {
            userQuery: query,
            mainResponse: finalResponse || "",
            keywords: finalKeywords || "",
          },
        ];
        return next.slice(-MAX_CONTEXT_ITEMS);
      });
    } catch (error) {
      console.error("Error sending message to Tanya:", error);
      setChatLocked(false);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------- Handlers (flow) --------------------
  const handleSendMessage = async (question?: string) => {
    if (chatLocked || isLoading || !hasMatchingVariant) return;

    const newQuery = question || inputText.trim();
    if (!newQuery) return;

    setChatHistory((prev) => [...prev, { query: newQuery, response: "" }]);
    setInputText("");

    setPendingQuery(newQuery);

    const skuFromVariant = selectedVariant?.sku;
    const fallbackSku = getProductSku(product);
    const sku = skuFromVariant || fallbackSku || "";

    // Single-variant or master-only: go directly
    if (variantCount <= 1) {
      if (sku) {
        startFlowWithSku(newQuery, sku, selectedVariantIdx);
        return;
      }
      setShowVariantPicker(true);
      setChatLocked(true);
      return;
    }

    // Multiple variants: ask confirmation
    if (sku) {
      setShowProceedConfirm(true);
      setChatLocked(true);
    } else {
      setShowVariantPicker(true);
      setChatLocked(true);
    }
  };

  const handleConfirmProceedYes = () => {
    const sku = selectedVariant?.sku;
    if (!sku) return;
    startFlowWithSku(pendingQuery, sku, selectedVariantIdx);
  };

  const handleConfirmProceedNo = () => {
    setShowProceedConfirm(false);
    setShowVariantPicker(true);
    setChatLocked(true);
  };

  const handleVariantSubmitAfterNo = () => {
    if (!selectedVariant || !selectedVariant.sku) return;
    const sku = selectedVariant.sku;
    startFlowWithSku(pendingQuery, sku, selectedVariantIdx);
  };

  // ---------- address/delivery/payment ----------
  const handleYesLockItIn = async () => {
    setShowAddressSelection(true);
    setShowDeliveryOptions(false);
    setShowPaymentOptions(false);
    setShowFinalSummary(false);
    setAddressSubmitted(false);
    setDeliverySubmitted(false);
    setPaymentSubmitted(false);
    setConfirmSuccess(false);
    await getAllAddresses();

    finalizeLiveCards("initial", {
      extractedDetails: extractedDetails ?? undefined,
    });
  };

  const handleSubmitAddress = () => {
    if (!selectedAddressId) return;
    const selected =
      addressList.find(
        (a: any) =>
          String((a as any).addressId ?? (a as any).id) === selectedAddressId
      ) || null;
    if (!selected) return;

    localStorage.setItem("agentic_order_address", JSON.stringify(selected));
    setAddressSubmitted(true);
    setShowDeliveryOptions(true);
    setDeliverySubmitted(false);
    setShowPaymentOptions(false);
    setPaymentSubmitted(false);
    setShowFinalSummary(false);
    setConfirmSuccess(false);

    snapshotToHistory("address", selected);
  };

  const handleChangeAddress = () => {
    setAddressSubmitted(false);
    setShowDeliveryOptions(false);
    setDeliverySubmitted(false);
    setShowPaymentOptions(false);
    setPaymentSubmitted(false);
    setShowFinalSummary(false);
    setConfirmSuccess(false);
    localStorage.removeItem("agentic_order_address");
  };

  const handleSubmitDelivery = () => {
    if (!selectedDelivery) return;
    localStorage.setItem("agentic_order_delivery", selectedDelivery);
    setDeliverySubmitted(true);
    setShowPaymentOptions(true);
    setPaymentSubmitted(false);
    setShowFinalSummary(false);
    setConfirmSuccess(false);

    snapshotToHistory("delivery", {
      method: selectedDelivery,
      ...DELIVERY_OPTIONS[selectedDelivery],
    });
  };

  const handleCancelDelivery = () => {
    setShowDeliveryOptions(false);
    setDeliverySubmitted(false);
    setShowPaymentOptions(false);
    setPaymentSubmitted(false);
    setShowFinalSummary(false);
    setConfirmSuccess(false);
    setChatLocked(false);
    hardResetLive();
    setChatHistory((prev) => [
      ...prev,
      {
        query: "",
        response: "__TEXT__",
        snapshotPayload: {
          text: "No worries! I’ve cancelled this request. You can start again anytime — just tell me what you’d like to buy or track",
        },
      },
    ]);
  };

  const handleChangeDelivery = () => {
    setDeliverySubmitted(false);
    setShowPaymentOptions(false);
    setPaymentSubmitted(false);
    setShowFinalSummary(false);
    setConfirmSuccess(false);
    localStorage.removeItem("agentic_order_delivery");
  };

  const handleSubmitPayment = () => {
    if (!selectedPayment) return;
    localStorage.setItem("agentic_order_payment", selectedPayment);
    setPaymentSubmitted(true);
    setShowFinalSummary(true);
    setConfirmSuccess(false);

    snapshotToHistory("payment", { method: selectedPayment });
  };

  const handleCancelPayment = () => {
    setShowPaymentOptions(false);
    setPaymentSubmitted(false);
    setShowFinalSummary(false);
    setConfirmSuccess(false);
    setChatLocked(false);
    hardResetLive();
    setChatHistory((prev) => [
      ...prev,
      {
        query: "",
        response: "__TEXT__",
        snapshotPayload: {
          text: "No worries! I’ve cancelled this request. You can start again anytime — just tell me what you’d like to buy or track",
        },
      },
    ]);
  };

  const handleChangePayment = () => {
    setPaymentSubmitted(false);
    setShowFinalSummary(false);
    setConfirmSuccess(false);
    localStorage.removeItem("agentic_order_payment");
  };

  const handleConfirmWatch = async () => {
    try {
      setIsLoading(true);

      const order = extractedDetails || {};
      const chosenAddress = JSON.parse(
        localStorage.getItem("agentic_order_address") || "null"
      );
      const chosenDelivery = localStorage.getItem(
        "agentic_order_delivery"
      ) as DeliveryOptionKey | null;
      const chosenPayment =
        localStorage.getItem("agentic_order_payment") || "card";

      const { product_total, tax, shipping_fee, currency } = computeSummary();

      const shopperId =
        order.shopper_id || localStorage.getItem("customerId") || undefined;

      const shippingAddressId =
        chosenAddress?.addressId || chosenAddress?.id || undefined;

      const shippingMethodId = chosenDelivery
        ? SHIPPING_METHOD_MAP[chosenDelivery]
        : "GROUND";

      const paymentMethodId = "card-visa";

      const sku = selectedVariant?.sku;
      const productId = (product as any)?.id || "";

      const quantity = getQuantity(order);
      const maxPriceMinor =
        typeof order.max_price_minor === "number"
          ? order.max_price_minor
          : Math.round(product_total * 100);

      const platform = "SFCC";
      const storeCode = "Sites-SiteGenesis-Site";

      const intentMandatePayload = {
        shopper_id: shopperId,
        shipping_address_id: shippingAddressId,
        shipping_method_id: shippingMethodId,
        payment_method_id: paymentMethodId,
        sku: sku,
        platform,
        storeCode,
        product_id: productId,
        quantity,
        max_price_minor: maxPriceMinor,
        currency,
        instruction_text: pendingQuery,
      };

      if (!shopperId || !shippingAddressId) {
        console.error(
          "Missing shopper_id or shipping_address_id for intent-mandate",
          {
            shopperId,
            shippingAddressId,
          }
        );
        alert(
          "Missing customer or address information. Please re-select address and try again."
        );
        setIsLoading(false);
        return;
      }

      const tokenData = await authData();
      const token = tokenData.access_token;
      if (!token) {
        throw new Error("Failed to fetch auth token for intent-mandate");
      }
      const { serverUrl } = apiConfig();
      const response = await fetch(`${serverUrl}/api/intent-mandate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(intentMandatePayload),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.error("intent-mandate failed", response.status, errorBody);
        alert(
          "Something went wrong while saving your smart order. Please try again."
        );
        setIsLoading(false);
        return;
      }

      const apiResult = await response.json().catch(() => null);
      console.log("intent-mandate success:", apiResult);

      const mandateId =
        apiResult?.intent_mandate_id ||
        apiResult?.intent_mandateId ||
        apiResult?.key ||
        null;

      if (mandateId) {
        setIntentMandateId(mandateId);
      }

      const finalPayload = {
        ...order,
        address: chosenAddress,
        delivery: chosenDelivery,
        payment: chosenPayment,
        summary: { product_total, tax, shipping_fee, currency },
        intent_mandate_id: mandateId,
      };

      localStorage.setItem("agentic_order_final", JSON.stringify(finalPayload));

      setConfirmSuccess(true);
      SetConfirmButton(false);

      snapshotToHistory("final", finalPayload);
      snapshotToHistory("success", { intentMandateId: mandateId });
      hardResetLive();
    } catch (err) {
      console.error("Error in handleConfirmWatch / intent-mandate:", err);
      alert(
        "Unable to complete your smart order right now. Please try again in a moment."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelWatch = () => {
    hardResetLive();
    setChatHistory((prev) => [
      ...prev,
      {
        query: "",
        response: "__TEXT__",
        snapshotPayload: {
          text: "No worries! I’ve cancelled this request. You can start again anytime — just tell me what you’d like to buy or track",
        },
      },
    ]);
  };

  // ---------- any Summary Card ----------
  const ProductSummaryCard = () => {
    const img = getProductImage(product, selectedVariant);
    const title = getProductTitle(product);

    const skuCode = selectedVariant?.sku || "";
    const color = getVariantColor(selectedVariant) || "";
    const size = getVariantSize(selectedVariant) || "";

    const { amount: unitPrice } = getVariantPrice(selectedVariant);
    const hasSku = Boolean(selectedVariant?.sku);
    const inStock =
      selectedVariant && hasSku ? isVariantOnStock(selectedVariant) : false;

    return (
      <div className="mx-4 mt-2 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4">
          <div className="flex-shrink-0 flex justify-center sm:justify-start">
            <div className="w-[150px] h-[150px] rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
              {img ? (
                <img
                  src={img}
                  alt={title}
                  className="object-contain w-full h-full"
                />
              ) : (
                <Icon
                  icon="mdi:image-outline"
                  width="28"
                  className="opacity-60"
                />
              )}
            </div>
          </div>

          <div className="flex-grow flex flex-col justify-center text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">{title}</div>
            <div className="text-sm text-gray-700 mb-1">
              {[
                skuCode && `SKU: ${skuCode}`,
                color && `Color: ${color}`,
                size && `Size: ${size}`,
              ]
                .filter(Boolean)
                .join(" • ") || "—"}
            </div>
            <div className="mt-1 text-xl font-semibold text-gray-900">
              {hasSku
                ? formatCurrency(Number(unitPrice) || 0, CURRENCY_PREF)
                : "Currently unavailable"}
            </div>
            {hasSku && !inStock && (
              <div className="mt-1 text-xs font-medium text-red-600">
                Currently out of stock
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ---------- any Selector Card ----------
  const VariantSelectorCard = ({
    showSubmit = true,
  }: {
    showSubmit?: boolean;
  }) => {
    const byColor: Record<string, true> = {};
    const colors = variantEntries
      .map((e) => getVariantColor(e.variant))
      .filter((c): c is string => !!c && !byColor[c] && (byColor[c] = true));

    const bySize: Record<string, true> = {};
    const sizes = variantEntries
      .map((e) => getVariantSize(e.variant))
      .filter((s): s is string => !!s && !bySize[s] && (bySize[s] = true));

    return (
      <div className="mx-4 mt-4 mb-2 rounded-xl border border-gray-200 bg-white p-4 animate-fade-in">
        <h3 className="font-semibold text-gray-800">Choose a variant</h3>

        {/* COLOR SECTION */}
        {colors.length > 0 && (
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <div className="text-sm font-bold">Color :</div>
              {pickedColor && (
                <div className="text-sm text-gray-600">{pickedColor}</div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-2">
              {colors.map((color) => {
                const isSelected = pickedColor === color;
                const effectiveSize =
                  pickedSize || masterSizeRef.current || null;

                const combo = effectiveSize
                  ? findVariantBy(variantEntries, color, effectiveSize)
                  : findVariantBy(variantEntries, color, null);

                const hasVariant = !!combo;
                const inStock = hasVariant && isVariantOnStock(combo!.variant);
                const money =
                  hasVariant && inStock
                    ? pickVariantMoney(combo!.variant, CURRENCY_PREF) ||
                      pickVariantMoney(combo!.variant)
                    : null;

                const colorEntry = variantEntries.find(
                  (e) => getVariantColor(e.variant) === color
                );
                const thumb = colorEntry?.images?.[0];

                return (
                  <div
                    key={`color-${color}`}
                    className={`flex flex-col items-center w-28 border rounded-md p-2
                      ${
                        isSelected
                          ? "border-2 border-tanya-light"
                          : "border-gray-300"
                      }
                      ${!hasVariant || !inStock ? "opacity-60" : ""}`}
                  >
                    <button
                      onClick={() => {
                        setPickedColor(color);
                        const sizeToUse =
                          pickedSize || masterSizeRef.current || null;
                        const match =
                          (sizeToUse &&
                            findVariantBy(variantEntries, color, sizeToUse)) ||
                          findVariantBy(variantEntries, color, null);
                        if (match) setSelectedVariantIdx(match.index);
                      }}
                      className="w-full h-20 flex items-center justify-center overflow-hidden"
                      title={color}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={color}
                          className="w/full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs px-1">
                          {color}
                        </div>
                      )}
                    </button>

                    <div className="w-full border-t my-2" />

                    {hasVariant && !inStock && (
                      <div className="text-[11px] text-red-600 text-center">
                        Out of stock
                      </div>
                    )}

                    {!hasVariant && (
                      <div className="text-[11px] text-red-600 text-center">
                        any not offered
                      </div>
                    )}

                    {hasVariant && inStock && money && (
                      <div className="text-xs text-gray-800 font-medium text-center">
                        {formatCurrency(money.cent / 100, money.cur)}
                        {money.regularCent &&
                          money.regularCent > money.cent && (
                            <span className="ml-1 line-through text-gray-500">
                              {formatCurrency(
                                money.regularCent / 100,
                                money.cur
                              )}
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SIZE SECTION */}
        {sizes.length > 0 && (
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <div className="text-sm font-bold">Size :</div>
              {pickedSize && (
                <div className="text-sm text-gray-600">{pickedSize}</div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {sizes.map((size) => {
                const isSelected = pickedSize === size;
                return (
                  <button
                    key={`size-${size}`}
                    onClick={() => {
                      setPickedSize(size);
                      const preferred =
                        (pickedColor &&
                          findVariantBy(variantEntries, pickedColor, size)) ||
                        findVariantBy(variantEntries, undefined, size);
                      if (preferred) setSelectedVariantIdx(preferred.index);
                    }}
                    className={`px-4 py-2 rounded-md border text-sm ${
                      isSelected
                        ? "border-2 border-tanya-light font-semibold"
                        : "border-gray-300"
                    }`}
                    title={size}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showSubmit && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleVariantSubmitAfterNo}
              className="px-6 py-2.5 rounded-full font-semibold text-white shadow-md"
              style={{ background: themeColor }}
              disabled={!hasMatchingVariant}
            >
              Submit
            </button>
          </div>
        )}
      </div>
    );
  };

  // ---------- Initial Extraction Card ----------
  const renderInitialExtractionCard = (details: any, readonly = true) => {
    if (!details?.extractedDetails && details)
      details = { extractedDetails: details };
    const d = details?.extractedDetails || extractedDetails;
    if (!d) return null;
    const q = getQuantity(d);

    const { currency: priceCurrency } = getVariantPrice(selectedVariant);
    const unitPrice = getProductPrice(product, selectedVariant);
    const minor = Number(d?.max_price_minor ?? 0);
    const hasValidMinor = Number.isFinite(minor) && minor > 0;
    const displayMax = hasValidMinor ? +(minor / 100) : +(unitPrice * q);
    const currency = d?.currency || priceCurrency || CURRENCY_PREF;
    const idLabel = selectedVariant?.sku ? selectedVariant.sku : d.product_id;

    return (
      <div
        className="px-6 pb-6 flex flex-col items-center space-y-4"
        style={{ backgroundColor: "#14377D" }}
      >
        <p
          className="text-base font-semibold text-center mt-2"
          style={{ color: themeDark }}
        >
          Here’s what I found from your instruction:
        </p>

        <div className="w-full max-w-md bg-white rounded-xl shadow-inner p-4">
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <p className="font-semibold text-gray-600">SKU:</p>
            <p className="text-gray-800">{idLabel}</p>

            <p className="font-semibold text-gray-600">Quantity:</p>
            <p className="text-gray-800">{getQuantity(d)}</p>

            <p className="font-semibold text-gray-600">Currency:</p>
            <p className="text-gray-800">{currency}</p>

            <p className="font-semibold text-gray-600">Maximum Total Price:</p>
            <p className="text-gray-800">
              {formatCurrency(displayMax, currency)}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {getVariantColor(selectedVariant) && (
              <span className="rounded-full bg-gray-100 px-2 py-1">
                Color: {getVariantColor(selectedVariant)}
              </span>
            )}
            {getVariantSize(selectedVariant) && (
              <span className="rounded-full bg-gray-100 px-2 py-1">
                Size: {getVariantSize(selectedVariant)}
              </span>
            )}
            {selectedVariant?.sku && (
              <span className="rounded-full bg-gray-100 px-2 py-1">
                SKU: {selectedVariant.sku}
              </span>
            )}
          </div>
        </div>

        {!readonly && (
          <>
            <p
              className="text-sm font-medium text-gray-700 text-center max-w-[90%] leading-relaxed"
              style={{ color: themeDark }}
            >
              Would you like me to <strong>lock this in</strong> and monitor it
              for you?
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={handleYesLockItIn}
                disabled={showAddressSelection}
                className={`relative inline-flex items-center justify-center px-6 py-2.5 rounded-full font-semibold text-white shadow-md transition-all duration-300 ${
                  showAddressSelection
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:-translate-y-0.5 hover:shadow-lg"
                }`}
                style={{ background: `${themeColor}` }}
              >
                <Icon
                  icon="fluent:checkmark-circle-24-filled"
                  className="mr-2"
                  width="18"
                  height="18"
                />
                Yes, lock it in
              </button>

              <button
                onClick={handleCancelWatch}
                disabled={showAddressSelection}
                className={`relative inline-flex items-center justify-center px-6 py-2.5 rounded-full font-semibold border transition-all duration-300 ${
                  showAddressSelection
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:-translate-y-0.5 hover:shadow-lg"
                }`}
                style={{ borderColor: themeColor, color: themeDark }}
              >
                <Icon
                  icon="fluent:dismiss-circle-24-filled"
                  className="mr-2"
                  width="18"
                  height="18"
                />
                No
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // ---------- Final Summary ----------
  const renderFinalSummaryCard = (payload: any, readonly = true) => {
    const d = payload || {};
    const currency =
      d?.summary?.currency || extractedDetails?.currency || CURRENCY_PREF;

    const img = getProductImage(product, selectedVariant);
    const title = getProductTitle(product);
    const pid = selectedVariant?.sku
      ? selectedVariant.sku
      : product?.id ?? extractedDetails?.product_id;
    const sku = selectedVariant?.sku ?? getProductSku(product);
    const color = getVariantColor(selectedVariant) || getProductColor(product);
    const size = getVariantSize(selectedVariant) || getProductSize(product);
    const quantity = getQuantity(d);
    const product_total =
      d?.summary?.product_total != null
        ? +d.summary.product_total
        : computeProductTotalWithFallback(d);
    const unitPrice = quantity > 0 ? +(product_total / quantity).toFixed(2) : 0;
    const subtotal = product_total;
    const tax = d?.summary?.tax ?? +(product_total * 0.08).toFixed(2);
    const shipping_fee =
      d?.summary?.shipping_fee ??
      (DELIVERY_OPTIONS[selectedDelivery]?.fee || 0);

    const addressDisplay = d?.address
      ? [
          d.address.addressLine1,
          d.address.addressLine2,
          d.address.street,
          [d.address.city, d.address.state, d.address.postalCode]
            .filter(Boolean)
            .join(", "),
          d.address.country,
        ]
          .filter(Boolean)
          .map((s: string) => initialCapital(String(s)))
          .join(", ")
      : "—";

    const chosenPayment = d?.payment || "card";
    const paymentLabelNode =
      chosenPayment === "card" ? (
        <>
          Credit Card — Mastercard
          <br />
          •••• 7820&nbsp;Exp: 12/26
        </>
      ) : (
        <>{initialCapital(chosenPayment)}</>
      );

    return (
      <div className="mx-auto mt-3 mb-3 rounded-2xl bg-white">
        <div className="px-6 pt-5 pb-3">
          <h3 className="font-semibold text-lg mb-2 text-gray-800 flex items-center gap-2">
            <Icon
              icon="mdi:receipt-text-check-outline"
              width="24"
              color={themeColor}
            />
            All set! Here’s what your smart order looks like 🧾
          </h3>
        </div>

        <div className="px-6 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="sm:col-span-2 flex">
              <div className="w-30 h-26 sm:w-30 sm:h-26 overflow-hidden rounded-lg bg-white border border-gray-200 flex items-center justify-center mx-auto sm:mx-0">
                {img ? (
                  <img
                    src={img}
                    alt={title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Icon
                    icon="mdi:image-outline"
                    width="24"
                    className="opacity-50"
                  />
                )}
              </div>
            </div>

            <div className="sm:col-span-10">
              <div className="mb-3">
                <div className="text-lg text-center font-bold text-gray-900">
                  {title}
                </div>
                <div className="text-xs text-center font-bold text-gray-600">
                  <span className="font-medium">SKU:</span> {pid ?? "—"}
                </div>
                {(sku || color || size) && (
                  <div className="text-xs text-gray-600 mt-0.5 text-center">
                    {sku && (
                      <>
                        <span className="font-medium">SKU:</span> {sku}
                        &nbsp;&nbsp;
                      </>
                    )}
                    {color && (
                      <>
                        <span className="font-medium">Color:</span> {color}
                        &nbsp;&nbsp;
                      </>
                    )}
                    {size && (
                      <>
                        <span className="font-medium">Size:</span> {size}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md-grid-cols-3 md:grid-cols-3 gap-3">
                <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-3 text-center">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">
                    Unit Price
                  </div>
                  <div className="mt-0.5 text-base font-bold text-gray-900">
                    {formatCurrency(unitPrice, currency)}
                  </div>
                </div>
                <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-3 text-center">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">
                    Quantity
                  </div>
                  <div className="mt-0.5 text-base font-bold text-gray-900">
                    {quantity}
                  </div>
                </div>
                <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-3 text-center">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">
                    Subtotal
                  </div>
                  <div className="mt-0.5 text-base font-bold text-gray-900">
                    {formatCurrency(subtotal, currency)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mini summaries */}
        <div className="px-6 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                🏠 Address
              </div>
              <div className="mt-1 text-sm font-semibold text-gray-900 text-center">
                {addressDisplay}
              </div>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                💳 Payment
              </div>
              <div className="mt-1 text-sm font-semibold text-gray-900 text-center">
                {paymentLabelNode}
              </div>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                🚚 Delivery
              </div>
              <div className="mt-1 text-sm font-semibold text-gray-900 text-center">
                {d?.delivery
                  ? DELIVERY_OPTIONS[d.delivery as DeliveryOptionKey]?.label ||
                    "—"
                  : "—"}
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                💰 any(s)
              </div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {formatCurrency(product_total, currency)}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                🏛️ Taxes
              </div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {formatCurrency(tax, currency)}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                🚚 Shipping
              </div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {formatCurrency(shipping_fee, currency)}
              </div>
            </div>
          </div>

          {/* Total callout */}
          <div
            className="mt-4 rounded-xl p-4 text-center text-white shadow-sm"
            style={{ background: theme }}
          >
            <div className="text-sm/5 opacity-95">🔹 Total Payable</div>
            <div className="mt-1 text-3xl font-extrabold tracking-tight">
              {formatCurrency(product_total + tax + shipping_fee, currency)}
            </div>
          </div>
        </div>

        {!readonly && (
          <div className="px-6 pb-5">
            {!confirmSuccess && (
              <p className="mt-3 text-center text-sm text-gray-700">
                Everything looks good! Do you want me to watch this product and
                buy it automatically when it meets your condition?
              </p>
            )}
            {confirmSuccess && renderSuccessSnapshot({ intentMandateId })}
            {confirmButton && !confirmSuccess && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleConfirmWatch}
                  className="inline-flex items-center justify-center rounded-full px-6 py-2.5 font-semibold text-white shadow-md transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: theme }}
                >
                  Confirm
                </button>
                <button
                  onClick={handleCancelWatch}
                  className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 font-semibold hover:bg-gray-50"
                  style={{ borderColor: theme, color: theme }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAddressSnapshot = (addr: any) => {
    if (!addr) return null;
    const addressDisplay = [
      (addr as any).addressLine1,
      (addr as any).addressLine2,
      (addr as any).street,
      [(addr as any).city, (addr as any).state, (addr as any).postalCode]
        .filter(Boolean)
        .join(", "),
      (addr as any).country,
    ]
      .filter((s): s is string => Boolean(s))
      .map((s) => initialCapital(s))
      .join(", ");

    return (
      <div
        className="px-6 py-4"
        style={{ backgroundColor: "var(--tanya-light)" }}
      >
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="mdi:home-map-marker" width="20" color={themeColor} />
            <div className="font-semibold text-gray-800">Delivery Address</div>
          </div>
          <div className="text-sm text-gray-800">{addressDisplay}</div>
        </div>
      </div>
    );
  };

  const renderDeliverySnapshot = (payload: any) => {
    const method = payload?.method as DeliveryOptionKey;
    const opt = method ? DELIVERY_OPTIONS[method] : undefined;
    return (
      <div
        className="px-6 py-4"
        style={{ backgroundColor: "var(--tanya-light)" }}
      >
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon icon="mdi:truck-delivery" width="20" color={themeColor} />
            <div className="font-semibold text-gray-800">Delivery Method</div>
          </div>
          <div className="text-sm text-gray-800">
            {opt ? (
              <>
                <div className="flex items-center gap-2">
                  <Icon icon={opt.icon} width="18" />
                  <span className="font-medium">{opt.label}</span>
                </div>
                <div className="text-gray-600">{opt.subtitle}</div>
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentSnapshot = (payload: any) => {
    const method = payload?.method || "card";
    return (
      <div
        className="px-6 py-4"
        style={{ backgroundColor: "var(--tanya-light)" }}
      >
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon
              icon="mdi:credit-card-outline"
              width="20"
              color={themeColor}
            />
            <div className="font-semibold text-gray-800">Payment Method</div>
          </div>
          <div className="text-sm text-gray-800">
            {method === "card" ? (
              <>
                Credit Card — Mastercard
                <br />
                •••• 7820 &nbsp; Exp: 12/26
              </>
            ) : (
              initialCapital(method)
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSnapshotCard = (chat: ChatItem, isLatest: boolean) => {
    const stage = chat.snapshotStage as Stage | undefined;
    if (!stage) return null;

    if (
      (stage === "address" && showAddressSelection) ||
      (stage === "delivery" && showDeliveryOptions) ||
      (stage === "payment" && showPaymentOptions) ||
      (stage === "final" && showFinalSummary)
    ) {
      return null;
    }

    switch (stage) {
      case "initial":
        return renderInitialExtractionCard(chat.snapshotPayload, !isLatest);
      case "address":
        return renderAddressSnapshot(chat.snapshotPayload as any);
      case "delivery":
        return renderDeliverySnapshot(chat.snapshotPayload);
      case "payment":
        return renderPaymentSnapshot(chat.snapshotPayload);
      case "final":
        return renderFinalSummaryCard(chat.snapshotPayload, !isLatest);
      case "success":
        return renderSuccessSnapshot(chat.snapshotPayload);
      default:
        return null;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 2147483647 }}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.25)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 ">
        <div className="w-[64.7vw] h-screen bg-white rounded-xl overflow-hidden flex flex-col shadow-xl">
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTopLeftRadius: "0.75rem",
              borderBottomLeftRadius: "0.75rem",
              padding: "0.25rem",
              background: themeHeaderBg,
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {/* <Sparkles className="w-8 h-8 ml-2 mr-2 text-white" /> */}
              <Icon icon="ph:sparkle-duotone" width="25" height="25" />
              <div>
                <p className="font-bold">Agentic Shopping with TANYA</p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.25rem",
                margin: "0.75rem",
              }}
            >
              <Icon
                icon="fluent:dismiss-24-filled"
                color={"#ffffff"}
                width="24"
                height="24"
                className="cursor-pointer"
                onClick={onClose}
              />
            </div>
          </div>

          <div
            ref={scrollRef}
            className="overflow-y-auto pr-5 pb-4 space-y-4 hide-scrollbar flex-grow"
          >
            {/* Intro bubble */}
            <div
              className="text-sm text-[16px] rounded-r-xl p-3 m-3 rounded-bl-xl w-3/4 text-tanya-contrast"
              style={{ backgroundColor: "#2b72b8" }}
            >
              Welcome to your smart shopping companion!
              <p>
                Simply share your instruction — like “If this product goes below
                $100, grab it for me.”
              </p>
              <p>
                I’ll monitor it, calculate total prices, and place the order
                when your conditions are met.
              </p>
            </div>

            {/* any card */}
            <ProductSummaryCard />

            {/* any selector (always visible for multi-variant) */}
            {variantCount > 1 && <VariantSelectorCard showSubmit={false} />}

            {/* Chat history / cards */}
            {chatHistory.map((chat, index) => {
              const isLatest = index === chatHistory.length - 1;
              const isSnapshot = !!chat.snapshotStage;

              return (
                <div key={index}>
                  {/* user bubble */}
                  {chat.query && (
                    <div className="flex justify-end">
                      <p
                        className="text-sm rounded-l-xl p-3 m-3 mb-4 rounded-br-xl max-w-[75%]"
                        style={{
                          color: "#ffffff",
                          backgroundColor: "var(--tanya)",
                        }}
                      >
                        {chat.query}
                      </p>
                    </div>
                  )}

                  {/* assistant text bubble (for cancel message) */}
                  {chat.response === "__TEXT__" &&
                    chat.snapshotPayload?.text && (
                      <div className="mt-2">
                        <div
                          className="text-sm text-tanya-contrast px-7 py-4 rounded-r-xl rounded-bl-2xl w-full"
                          style={{
                            backgroundColor: "var(--tanya-light)",
                            margin: "0.75rem",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <p>{chat.snapshotPayload.text}</p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Proceed confirmation */}
                  {isLatest && showProceedConfirm && variantCount > 1 && (
                    <div className="mx-4 mt-2 rounded-xl border border-gray-200 bg-white p-4 animate-fade-in">
                      <div className="text-sm text-gray-800">
                        Proceed with color:{" "}
                        <span className="font-semibold">
                          {getVariantColor(selectedVariant) || "—"}
                        </span>
                        , size:{" "}
                        <span className="font-semibold">
                          {getVariantSize(selectedVariant) || "—"}
                        </span>
                        ?
                      </div>
                      <div className="mt-3 flex gap-3">
                        <button
                          onClick={handleConfirmProceedYes}
                          className="px-5 py-2 rounded-full text-white font-semibold"
                          style={{ background: themeColor }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={handleConfirmProceedNo}
                          className="px-5 py-2 rounded-full font-semibold border"
                          style={{
                            borderColor: themeColor,
                            color: themeColor,
                          }}
                        >
                          No, change SKU
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline variant picker after "No" */}
                  {isLatest && showVariantPicker && (
                    <VariantSelectorCard showSubmit />
                  )}

                  {/* assistant loading */}
                  {isLatest && isLoading && (
                    <div className="mt-4">
                      <div
                        className="text-sm text-tanya-contrast px-7 py-4 rounded-r-xl rounded-bl-2xl w-full"
                        style={{
                          backgroundColor: "var(--tanya-light)",
                          margin: "0.75rem",
                        }}
                      >
                        <div className="flex items-center gap-2 tanya-pulse-text">
                          <p>Reading your instruction and setting things up…</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* assistant cards */}
                  {(isSnapshot || chat.response === "__CARD__") &&
                    (!isLoading || !isLatest) && (
                      <div
                        className="mt-6 mb-4 mx-4 animate-fade-in"
                        style={{
                          backgroundColor: "#fff",
                          borderRadius: "1rem",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          overflow: "hidden",
                        }}
                      >
                        {isSnapshot
                          ? renderSnapshotCard(chat, isLatest)
                          : renderInitialExtractionCard(
                              chat.snapshotPayload,
                              false
                            )}
                      </div>
                    )}
                </div>
              );
            })}

            {/* Address selection */}
            {showAddressSelection && (
              <div className="mt-6 mb-6 mx-6 rounded-xl p-6 shadow-md border border-gray-200 bg-white animate-fade-in">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                    <Icon
                      icon="mdi:home-map-marker"
                      width="24"
                      color="var(--tanya-light)"
                    />
                    Select a Delivery Address
                  </h3>
                  {addressSubmitted && (
                    <>
                      <span className="ml-2 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                        Selected
                      </span>
                      {!confirmSuccess && (
                        <button
                          onClick={handleChangeAddress}
                          className="ml-2 text-xs px-2 py-1 rounded-full border hover:bg-gray-50"
                          style={{
                            borderColor: "var(--tanya-light)",
                            color: "var(--tanya-light)",
                          }}
                          title="Change address"
                        >
                          Change
                        </button>
                      )}
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Choose where you’d like us to deliver this item.
                </p>

                {addressLoading ? (
                  <div className="flex items-center py-6">
                    <div
                      className="animate-spin rounded-full h-6 w-6 border-b-2"
                      style={{ borderBottomColor: "var(--tanya-light)" }}
                    />
                    <p className="ml-3 text-gray-600">
                      Fetching your addresses...
                    </p>
                  </div>
                ) : addressList.length > 0 ? (
                  <div
                    className={`space-y-3 ${
                      addressSubmitted ? "opacity-70" : ""
                    }`}
                  >
                    {addressList.map((addr: any) => {
                      const heading = [addr.addressLine1, addr.addressLine2]
                        .filter(Boolean)
                        .map((s: string) => initialCapital(s || ""))
                        .join(" ");
                      const cityLine = initialCapital(addr.city || "");
                      const statePostal = `${initialCapital(addr.state || "")}${
                        addr.state && addr.postalCode ? ", " : ""
                      }${addr.postalCode || ""}`;
                      const countryLine = initialCapital(addr.country || "");
                      const idStr = String(addr.addressId ?? addr.id);
                      const isSelected = selectedAddressId === idStr;
                      return (
                        <label
                          key={idStr}
                          className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition hover:shadow-sm ${
                            isSelected
                              ? "border-tanya-light"
                              : "border-gray-300"
                          } ${addressSubmitted ? "pointer-events-none" : ""}`}
                          title={
                            addressSubmitted ? "Address already submitted" : ""
                          }
                        >
                          <input
                            type="radio"
                            name="address"
                            className="mt-1 accent-tanya-light"
                            checked={isSelected}
                            disabled={addressSubmitted}
                            onChange={() => setSelectedAddressId(idStr)}
                            value={idStr}
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">
                              {heading || "Address"}
                            </div>
                            <div className="text-sm text-gray-700">
                              {cityLine}
                              <br />
                              {statePostal}
                              <br />
                              {countryLine}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                    <div className="flex justify-between pt-2">
                      <button
                        onClick={handleCancelDelivery}
                        className="px-6 py-2.5 rounded-full font-semibold border transition-all hover:-translate-y-0.5 hover:shadow-sm"
                        style={{
                          borderColor: "var(--tanya-light)",
                          color: "var(--tanya-light)",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitAddress}
                        disabled={addressSubmitted}
                        className={`px-6 py-2.5 rounded-full font-semibold text-white shadow-md transition-all duration-300 ${
                          addressSubmitted
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:-translate-y-0.5 hover:shadow-lg"
                        }`}
                        style={{ background: themeColor }}
                      >
                        {addressSubmitted
                          ? "Address Submitted"
                          : "Submit Address"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    No addresses found. Please add a new one in your profile.
                  </div>
                )}
              </div>
            )}

            {/* Delivery options */}
            {showDeliveryOptions && (
              <div className="mt-2 mb-6 mx-6 rounded-xl p-6 shadow-md border border-gray-200 bg-white animate-fade-in">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                    <Icon
                      icon="mdi:truck-delivery"
                      width="24"
                      color="var(--tanya-light)"
                    />
                    Great! Now choose how fast you want it delivered 🚚
                  </h3>
                  {deliverySubmitted && (
                    <>
                      <span className="ml-2 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                        Selected
                      </span>
                      {!confirmSuccess && (
                        <button
                          onClick={handleChangeDelivery}
                          className="ml-2 text-xs px-2 py-1 rounded-full border hover:bg-gray-50"
                          style={{
                            borderColor: "var(--tanya-light)",
                            color: "var(--tanya-light)",
                          }}
                          title="Change shipping method"
                        >
                          Change
                        </button>
                      )}
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Which one would you like me to use for this order?
                </p>

                <div
                  className={`space-y-3 ${
                    deliverySubmitted ? "opacity-70" : ""
                  }`}
                >
                  {(Object.keys(DELIVERY_OPTIONS) as DeliveryOptionKey[]).map(
                    (key) => {
                      const opt = DELIVERY_OPTIONS[key];
                      const isSelected = selectedDelivery === key;
                      return (
                        <label
                          key={key}
                          className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition hover:shadow-sm ${
                            isSelected
                              ? "border-tanya-light"
                              : "border-gray-300"
                          } ${deliverySubmitted ? "pointer-events-none" : ""}`}
                          title={
                            deliverySubmitted
                              ? "Delivery already submitted"
                              : ""
                          }
                        >
                          <input
                            type="radio"
                            name="delivery"
                            className="mt-1 accent-tanya-light"
                            checked={isSelected}
                            disabled={deliverySubmitted}
                            onChange={() => setSelectedDelivery(key)}
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800 flex items-center gap-2">
                              <Icon icon={opt.icon} width="18" /> {opt.label}
                            </div>
                            <div className="text-sm text-gray-700">
                              {opt.subtitle}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-800">
                            {opt.fee === 0
                              ? "Free"
                              : formatCurrency(
                                  opt.fee,
                                  extractedDetails?.currency || CURRENCY_PREF
                                )}
                          </div>
                        </label>
                      );
                    }
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={handleCancelDelivery}
                    className="px-6 py-2.5 rounded-full font-semibold border transition-all hover:-translate-y-0.5 hover:shadow-sm"
                    style={{
                      borderColor: "var(--tanya-light)",
                      color: "var(--tanya-light)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitDelivery}
                    disabled={deliverySubmitted}
                    className={`px-6 py-2.5 rounded-full font-semibold text-white shadow-md transition-all duration-300 ${
                      deliverySubmitted
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:-translate-y-0.5 hover:shadow-lg"
                    }`}
                    style={{ background: "var(--tanya)" }}
                  >
                    {deliverySubmitted
                      ? "Delivery Submitted"
                      : "Submit Delivery Option"}
                  </button>
                </div>
              </div>
            )}

            {/* Payment options */}
            {showPaymentOptions && (
              <div className="mt-2 mb-6 mx-6 rounded-xl p-6 shadow-md border border-gray-200 bg-white animate-fade-in">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                    <Icon
                      icon="mdi:credit-card-outline"
                      width="24"
                      color={"var(--tanya-light)"}
                    />
                    Almost done! 💳
                  </h3>
                  {paymentSubmitted && (
                    <>
                      <span className="ml-2 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                        Selected
                      </span>
                      {!confirmSuccess && (
                        <button
                          onClick={handleChangePayment}
                          className="ml-2 text-xs px-2 py-1 rounded-full border hover:bg-gray-50"
                          style={{
                            borderColor: "var(--tanya-light)",
                            color: "var(--tanya-light)",
                          }}
                          title="Change payment method"
                        >
                          Change
                        </button>
                      )}
                    </>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Please choose a payment method for this order:
                </p>

                <div
                  className={`space-y-3 ${
                    paymentSubmitted ? "opacity-70" : ""
                  }`}
                >
                  <label
                    className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition hover:shadow-sm ${
                      selectedPayment === "card"
                        ? "border-tanya-light"
                        : "border-gray-300"
                    } ${paymentSubmitted ? "pointer-events-none" : ""}`}
                    title={paymentSubmitted ? "Payment already submitted" : ""}
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="mt-1 accent-tanya-light"
                      checked={selectedPayment === "card"}
                      disabled={paymentSubmitted}
                      onChange={() => setSelectedPayment("card")}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 flex items-center gap-2">
                        <Icon icon="mdi:credit-card-chip-outline" width="18" />{" "}
                        Credit Card
                      </div>
                      {selectedPayment === "card" && (
                        <div className="text-sm text-gray-700 mt-1">
                          Mastercard &nbsp;&nbsp; •••• 7820
                          <br />
                          Expiry: 12/26
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={handleCancelPayment}
                    className="px-6 py-2.5 rounded-full font-semibold border transition-all hover:-translate-y-0.5 hover:shadow-sm"
                    style={{
                      borderColor: "var(--tanya-light)",
                      color: "var(--tanya-light)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitPayment}
                    disabled={paymentSubmitted}
                    className={`px-6 py-2.5 rounded-full font-semibold text-white shadow-md transition-all duration-300 ${
                      paymentSubmitted
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:-translate-y-0.5 hover:shadow-lg"
                    }`}
                    style={{ background: "var(--tanya)" }}
                  >
                    {paymentSubmitted
                      ? "Payment Submitted"
                      : "Submit Payment Method"}
                  </button>
                </div>
              </div>
            )}

            {/* Final summary (live) */}
            {showFinalSummary &&
              renderFinalSummaryCard(
                {
                  ...extractedDetails,
                  address: JSON.parse(
                    localStorage.getItem("agentic_order_address") || "null"
                  ),
                  delivery: localStorage.getItem("agentic_order_delivery"),
                  payment: localStorage.getItem("agentic_order_payment"),
                  summary: computeSummary(extractedDetails?.currency),
                },
                false
              )}
          </div>

          {/* Input */}
          <div className="sticky bottom-0 w-[96%] drop-shadow-xl flex items-center rounded-full bg-white border border-gray-300 m-[15px]">
            <input
              placeholder={
                chatLocked
                  ? "Complete the current step…"
                  : !hasMatchingVariant
                  ? "Oops! This combination isn’t available for this product. Try a different option."
                  : "What would you like me to do? (e.g., If this product goes below $100, grab it for me.)"
              }
              disabled={isInputDisabled}
              className={`w-full rounded-full p-4 outline-none border-none focus:ring-0 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed
                ${
                  !hasMatchingVariant
                    ? "placeholder:text-red-400 text-red-500"
                    : ""
                }`}
              value={inputText}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading && !chatLocked)
                  handleSendMessage();
              }}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              type="submit"
              disabled={isLoading || chatLocked}
              className="mr-6 font-medium"
              style={{ color: "var(--tanya-light)" }}
              onClick={() => handleSendMessage()}
            >
              {isLoading ? (
                <div
                  className="m-3 animate-spin rounded-full h-6 w-6 border-b-2"
                  style={{ borderBottom: "2px solid" }}
                />
              ) : (
                <Icon
                  icon="fluent:send-48-filled"
                  color={"var(--tanya-light)"}
                  width="24"
                  height="24"
                />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AgenticShopping;
