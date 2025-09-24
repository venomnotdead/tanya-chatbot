/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { Popover, PopoverTrigger } from "../ui/popover";
// import tanyaChatBotIcon from "@/assets/tanya-chatbot/chat-with-tanya.png";
// import { getAccessToken } from "../utils/getAccessToken";
import { getInterestApi, getProductById, getSearchResults } from "../utils";
import type { SearchProduct } from "../graphQL/queries/types";
import {
  // decryptData,
  // currencyFormatter,
  formatStringToHtml,
  // priceFormatter,
} from "../utils/helper";
import { useSearchParams } from "react-router-dom";
import ProductDisplay from "../carousel/ProductDisplay";
import { useSelector } from "react-redux";
// import useSessionTracker from "../hooks/useSessionTracker";
// import { fetchStoreConfig } from "../api/api";
// import { setStore } from "../../store/reducers/storeReducer";
import ProductDisplayCard from "../product/ProductDisplayCard";
import { toast } from "react-toastify";
import { notifySFCC } from "../lib/utils";
import { addProductToBasket, createBasket, fetchBasket } from "../api/api";
import { fetchTokenBmGrant } from "../utils/fetchTokenBmGrant";
import { fetchExistingGuestCustomerToken } from "../utils/fetchExistingRegisterCustomerToken";
import { TOKEN_EXPIRY_KEY, VERSION } from "../../config/constant";
import {
  getStoredBasketId,
  setStoredBasketId,
  setStoredToken,
} from "../utils/localStorage";

type ProductSnapshot = {
  id: string;
  name: string;
  image: string | null;
  price: number | null;
  points: number;
  quantity: number;
};

const TanyaShoppingAssistantStream = () => {
  // Shopping options
  const shoppingOptions = [
    "Myself",
    "My Child",
    "My Grandchild",
    "Niece/Nephew",
    "My Friends",
    "Others",
  ];

  const payloadMapping: Record<string, string> = {
    Myself: "himself/herself",
    "My Child": "his/her child",
    "My Grandchild": "his/her grandchild",
    "Niece/Nephew": "his/her niece/nephew",
    "My Friends": "his/her friends",
    Others: "others",
  };
  const productName = useRef<string | null>(null);
  const productId = useRef<number | null>(null);
  const productImage = useRef<string | null>(null);
  const productPrice = useRef<number | null>(null);

  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(
    searchParams.get("shoppingassist") === "true"
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [adding, setAdding] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [whom, setWhom] = useState("");
  const mapSnapshotToProduct = (snap: ProductSnapshot): any => ({
    id: snap.id,
    title: snap.name,
    image: snap.image ?? "",
    price: snap.price ?? 0,
  });
  // const dispatch = useDispatch();

  const [chatHistory, setChatHistory] = useState<
    {
      query: string;
      response: string;
      potentialQuestions: string;
      products?: { keyword: string; items: SearchProduct[] }[];
      keywords: string;
      noResults?: boolean;
      secondaryResponse?: string;
      secondaryLoading?: boolean;
      productSnapshot?: ProductSnapshot; // NEW
    }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  // const storeCode =
  //   searchParams.get("storeCode") || localStorage.getItem("storeCode");
  const storeDetails = useSelector((s: any) => s.store.store);
  const product = useSelector((s: any) => s.product.product);

  const openPanel = () => {
    setIsVisible(true);
    setTimeout(() => setIsAnimating(true), 10); // trigger opening animation
  };

  const closePanel = () => {
    setIsAnimating(false);
    setTimeout(() => setIsVisible(false), 300); // // wait for exit animation
  };

  useEffect(() => {
    if (isOpen) openPanel();
    else closePanel();
  }, [isOpen]);

  const handleWhomSelection = (selected: string) => {
    setWhom(payloadMapping[selected]);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop += 150; // Scrolls down by 50px
    }
  }, [chatHistory]);

  let cachedToken: any = null;
  let tokenExpiry: any = null;

  const getJWTToken = async () => {
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
      return cachedToken;
    }

    try {
      const tokenUrl =
        "https://us-east-1lsr29ln3u.auth.us-east-1.amazoncognito.com/oauth2/token";

      const tokenPayload = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: "4i8rd70sgt961tc4dhskgf08c",
        client_secret: "bnsfq1220loh2cn2cm2ttn8fdhdpt0u8m1fgj8vfk2rn61aurjg",
        scope: "default-m2m-resource-server-8xzfzo/read",
      });

      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenPayload,
      });

      if (!tokenResponse.ok) {
        throw new Error(
          `Token request failed! status: ${tokenResponse.status}`
        );
      }

      const tokenData = await tokenResponse.json();

      // Cache the token
      cachedToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour
      tokenExpiry = Date.now() + (expiresIn - 60) * 1000; // Refresh 1 minute before expiry

      return cachedToken;
    } catch (error) {
      console.error("Error obtaining JWT token:", error);
      // Clear cache on error
      cachedToken = null;
      tokenExpiry = null;
      return null;
    }
  };

  const getInterests = async () => {
    const customer_id = JSON.parse(
      sessionStorage.getItem("customerData") || "{}"
    ).customerId;
    const res = await getInterestApi(customer_id || "");
    return res.c_interests;
  };

  const runSecondaryFlow = async (productTitle: string, points: number) => {
    console.log("in secondary flow", VERSION);
    const interests = await getInterests();
    console.log(interests, "interests of customer", VERSION);
    if (!interests) return;
    try {
      // surprise animation
      setChatHistory((prev) =>
        prev.map((msg, idx) =>
          idx === prev.length - 1 ? { ...msg, secondaryLoading: true } : msg
        )
      );

      const accessToken = await getJWTToken();
      if (!accessToken) throw new Error("Failed to fetch token");

      const user = localStorage.getItem("customerNumber");
      const isLoggedIn = localStorage.getItem("isLoggedIn");
      const queryParams = new URLSearchParams({
        registered: String(isLoggedIn || false),
        userId: String(user || new Date().getTime()),
      });
      const invokeUrl = `https://tanya.aspiresystems.com/api/bedrock/invoke/stream?${queryParams.toString()}`;

      const payload = JSON.stringify({
        flowId: "Q166PR519W",
        flowAliasId: "HKFUVLWVH2",
        input: {
          loyaltyPoints: "",
          productName: productTitle,
          productPoints: String(points || 0),
          interests: interests,
        },
      });

      const response = await fetch(invokeUrl, {
        signal: AbortSignal.timeout(30000),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: payload,
      });

      if (!response.body) throw new Error("Readable stream not supported");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const jsonData = line.slice(5).trim();
            try {
              const parsedData = JSON.parse(jsonData);

              if (parsedData.index === 0) {
                // attach response & stop animation
                setChatHistory((prev) =>
                  prev.map((msg, idx) =>
                    idx === prev.length - 1
                      ? {
                          ...msg,
                          secondaryResponse: parsedData.data,
                          secondaryLoading: false,
                        }
                      : msg
                  )
                );
              }
              // ignore 1/2/3
            } catch (e) {
              // stop animation on parse error too
              setChatHistory((prev) =>
                prev.map((msg, idx) =>
                  idx === prev.length - 1
                    ? { ...msg, secondaryLoading: false }
                    : msg
                )
              );
              console.error("Secondary flow JSON parse error:", e);
            }
          }
        }
      }
    } catch (e) {
      console.error("Secondary flow error:", e);
    }
  };

  const handleSendMessage = async (question?: string) => {
    const newQuery = question || inputText.trim();
    if (!newQuery) return;

    setIsLoading(true);
    setInputText("");

    productName.current = null;
    productId.current = null;
    productImage.current = null;
    productPrice.current = null;

    setChatHistory((prev) => [
      ...prev,
      {
        query: newQuery,
        response: "Thinking for what suits you best...",
        potentialQuestions: "",
        products: [],
        keywords: "Thinking for best products...",
      },
    ]);

    try {
      const sanitizedWhom = whom;
      const user = localStorage.getItem("customerNumber");
      const isLoggedIn = localStorage.getItem("isLoggedIn");

      // Get JWT access token
      const accessToken = await getJWTToken();
      if (!accessToken) {
        throw new Error("Failed to obtain access token");
      }

      // Build the invoke flow URL
      const queryParams = new URLSearchParams({
        registered: String(isLoggedIn || false),
        userId: String(user || new Date().getTime()),
      });

      const invokeUrl = `https://tanya.aspiresystems.com/api/bedrock/invoke/stream?${queryParams.toString()}`;

      const payload = JSON.stringify({
        flowId: "3LUE6PX8GT",
        flowAliasId: "TCCHAXPM1A",
        input: {
          userPrompt: newQuery,
          whom: sanitizedWhom,
        },
      });

      const response = await fetch(invokeUrl, {
        signal: AbortSignal.timeout(30000),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) throw new Error("Readable stream not supported");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let keywords = "";

      while (true) {
        setProductLoading(true);
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const jsonData = line.slice(5).trim();
            try {
              const parsedData = JSON.parse(jsonData);
              if (parsedData.index == 1) keywords = parsedData.data;

              setChatHistory((prev) =>
                prev.map((msg, idx) =>
                  idx === prev.length - 1
                    ? {
                        ...msg,
                        [parsedData.index == 0
                          ? "response"
                          : parsedData.index == 1
                          ? "keywords"
                          : "potentialQuestions"]: parsedData.data,
                      }
                    : msg
                )
              );
            } catch (error) {
              console.error("Error parsing JSON:", error);
            }
          }
        }
      }
      getKeywords(sanitizeKeywords(keywords));
    } catch (error) {
      console.error("Error sending message to Tanya:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sanitizeKeywords = (response: string) => {
    const keywordMatch = response.match(
      /top five relevant product or category names are: (.*)/i
    );
    const keywordsString = keywordMatch ? keywordMatch[1] : response;
    const keywordsArray = keywordsString.split(", ");
    const sanitizedKeywords = keywordsArray.map((keyword) => {
      return keyword.replace(/\s*(Toys|Bags|Miniature|etc\.*)\s*/gi, "").trim();
    });
    const uniqueKeywords = [...new Set(sanitizedKeywords)].filter(Boolean);
    return uniqueKeywords.join(",");
  };

  const getKeywords = async (keywords: string[] | string) => {
    if (typeof keywords === "string") {
      const splitedKeywords = keywords.split(",");
      for (const keyword of splitedKeywords) {
        const results = await getSearchResults(
          keyword
          // storeDetails.searchConfigs
        );
        setProductLoading(false);
        if (results?.length > 0) {
          setChatHistory((prev) =>
            prev.map((msg, idx) =>
              idx === prev.length - 1
                ? {
                    ...msg,
                    products: [
                      ...(msg.products || []),
                      { keyword: keyword, items: results, loading: false },
                    ],
                  }
                : msg
            )
          );
          if (!productName.current || productId.current == null) {
            const first = results[0] as any;
            productName.current = String(first?.product_name ?? "");
            productImage.current = first.image.link;
            productId.current = first.product_id;

            // price
            const priceVal =
              typeof first?.price === "number" ? first.price : undefined;

            productPrice.current =
              typeof priceVal === "number" && Number.isFinite(priceVal)
                ? priceVal
                : null;
          }
        }
      }
    } else {
      for (const keyword of keywords) {
        const results = await getSearchResults(
          keyword
          // storeDetails.searchConfigs
        );
        setProductLoading(false);
        if (results?.length > 0) {
          setChatHistory((prev) =>
            prev.map((msg, idx) =>
              idx === prev.length - 1
                ? {
                    ...msg,
                    products: [
                      ...(msg.products || []),
                      { keyword: keyword, items: results, loading: false },
                    ],
                  }
                : msg
            )
          );
        }
      }
    }
    if (productName.current) {
      setChatHistory((prev: any) =>
        prev.map((msg: any, idx: number) =>
          idx === prev.length - 1
            ? {
                ...msg,
                productSnapshot: {
                  id: productId.current,
                  name: productName.current,
                  image: productImage.current,
                  price: productPrice.current ?? null,
                  points: 0,
                  quantity: 1,
                },
              }
            : msg
        )
      );
      const customerData = JSON.parse(
        sessionStorage.getItem("customerData") || "{}"
      );
      if (customerData?.isGuest == false) {
        console.log("running secondary flow", VERSION);
        runSecondaryFlow(productName.current, 0);
      } else {
        console.log("not running secondary flow", VERSION);
      }
    }
    setProductLoading(false);
  };

  const handleAddToCart = async (productToBeAdded: any, quantity: number) => {
    setAdding(true);
    try {
      const product = await getProductById(productToBeAdded.id);
      // Check if product and variants exist
      console.log(product, "the product", VERSION);
      if (
        !product?.variants?.[0]?.product_id &&
        !(product.type.item || product.type.bundle)
      ) {
        setAdding(false);
        toast.error("Variants not found", {
          position: "bottom-right",
          autoClose: 1000,
        });
        console.error("No product variant found");
        return;
      }

      const productData = [
        {
          product_id: product.variants?.[0].product_id || product?.id,
          quantity: quantity,
        },
      ];
      console.log(productData, "product data", VERSION);
      // for getting customer id
      const customerData = JSON.parse(
        sessionStorage.getItem("customerData") || "{}"
      );
      const basketIdFromCustomer = customerData?.basketId;
      const customer_token = false;
      const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
      const currentTime = Date.now();

      // If no token, get a new one
      if (
        !customer_token ||
        !tokenExpiry ||
        currentTime >= parseInt(tokenExpiry)
      ) {
        const access_token = await fetchTokenBmGrant();

        const { customer_token } = await fetchExistingGuestCustomerToken(
          access_token
        );

        if (!customer_token) {
          console.error("Failed to get customer_token");
          return;
        }
        const newExpiryTime = currentTime + 5 * 60 * 1000;
        setStoredToken(customer_token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, newExpiryTime.toString());

        // 1. Try basketId from customerData
        if (basketIdFromCustomer) {
          const fetchBasketResponse = await fetchBasket({
            basketId: basketIdFromCustomer,
            customer_token,
          });
          if (fetchBasketResponse.status === 200 && fetchBasketResponse) {
            // Use this basketId to add product

            const response = await addProductToBasket(
              basketIdFromCustomer,
              productData,
              customer_token
            );
            if (response?.product_items?.length > 0) {
              // const addedProduct = response.product_items.at(-1);
              toast.success(`Added to cart`, {
                position: "bottom-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              });
              notifySFCC(basketIdFromCustomer);
              setAdding(false);
              // window.location.reload();
            }
            return; // Skip basket creation
          }
        }

        // 2. If not valid, create new basket and store its ID in localStorage
        const basketResponse = await createBasket(customer_token);
        if (!basketResponse?.basket_id) {
          setAdding(false);
          console.error("Failed to create basket");
          return;
        }

        // Store new basket ID
        setStoredBasketId(basketResponse.basket_id);
        // Add product to new basket
        const response = await addProductToBasket(
          basketResponse.basket_id,
          productData,
          customer_token
        );
        if (response?.product_items?.length > 0) {
          toast.success(`Added to cart`, {
            position: "bottom-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          notifySFCC(basketResponse.basket_id);
        }
      } else {
        // Use existing customer_token and basket ID
        const basketId = getStoredBasketId();
        if (!basketId) {
          console.error("No basket ID found");
          setAdding(false);
          return;
        }

        const response = await addProductToBasket(
          basketId,
          productData,
          customer_token
        );
        if (response?.product_items?.length > 0) {
          // const addedProduct = response.product_items.at(-1);
          // const addedProduct = response.product_items[response.product_items.length - 1];
          // addedProduct.product_name;
          // addedProduct.product_id;
          toast.success(`Added to cart`, {
            position: "bottom-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          setAdding(false);
          notifySFCC(basketId);
          // window.location.reload(); // Refresh page to update cart
        }
      }
    } catch (error: any) {
      setAdding(false);
      console.error("Error adding to cart:", error);
      toast.error("Failed to add product to cart", {
        position: "bottom-right",
        autoClose: 3000,
      });

      if (
        error?.response?.status === 404 || // Basket not found
        error?.response?.status === 401 // Unauthorized/expired
      ) {
        // Clear only basket ID for 404
        if (error?.response?.status === 404) {
          setStoredBasketId(null);
        }
        // Clear both for 401
        if (error?.response?.status === 401) {
          setStoredBasketId(null);
          setStoredToken(null);
        }
      } else {
        console.error("Failed to add product to basket:", error.message);
        toast.error("Failed to add product to cart", {
          position: "bottom-right",
          autoClose: 3000,
        });
      }
    } finally {
      notifySFCC();
    }
    setAdding(false);
  };

  // Update the main container div's className
  return (
    <div className="relative flex justify-center">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          onClick={() => setIsOpen(true)}
          style={
            {
              // background: storeDetails.tanyaThemeColor,
            }
          }
          className="flex items-center rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="flex flex-col p-[5px]">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_958_585)">
                <path
                  d="M30.0002 5C31.7683 5 33.464 5.70238 34.7142 6.95262C35.9644 8.20286 36.6668 9.89856 36.6668 11.6667V25C36.6668 26.7681 35.9644 28.4638 34.7142 29.714C33.464 30.9643 31.7683 31.6667 30.0002 31.6667H25.6902L21.1785 36.1783C20.8915 36.4653 20.5097 36.6377 20.1046 36.6631C19.6996 36.6886 19.2992 36.5654 18.9785 36.3167L18.8218 36.1783L14.3085 31.6667H10.0002C8.28976 31.6667 6.64478 31.0093 5.40548 29.8305C4.16617 28.6516 3.42735 27.0416 3.34183 25.3333L3.3335 25V11.6667C3.3335 9.89856 4.03588 8.20286 5.28612 6.95262C6.53636 5.70238 8.23205 5 10.0002 5H30.0002Z"
                  fill="url(#paint0_linear_958_585)"
                />
                <path
                  d="M28.3335 15.6511V11.6667C28.3335 11.6667 22.2774 12.6042 20.1148 15.4167C17.9521 18.2292 18.6644 26.6667 18.6644 26.6667H22.5321C22.5321 26.6667 22.0614 18.9323 23.4989 17.2917C24.9364 15.6511 28.3335 15.6511 28.3335 15.6511Z"
                  fill="white"
                />
                <path
                  d="M13.3335 11.6667H19.6184V15.4167H13.3335V11.6667Z"
                  fill="white"
                />
              </g>
              <defs>
                <linearGradient
                  id="paint0_linear_958_585"
                  x1="20.0002"
                  y1="5"
                  x2="35.0002"
                  y2="30"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#452697" />
                  <stop offset="1" stopColor="#7C5BFF" />
                </linearGradient>
                <clipPath id="clip0_958_585">
                  <rect width="40" height="40" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>
        </PopoverTrigger>

        {/* Absolute Positioned PopoverContent and Custom Sidebar Panel */}
        {isVisible && (
          <>
            {/* Overlay For closing tanya popup by clicking on side or background */}
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setIsOpen(false)}
            />
            <div
              className={`
                fixed z-50 h-screen w-[100vw] sm:w-[80vw] md:w-[770px] border-0 bg-white lg:rounded-l-xl overflow-hidden flex flex-col shadow-[0px_4px_10px_0px_#5F499840]
                top-0 right-0
                transition-transform duration-300 ease-in-out
                lg:transform
                ${isAnimating ? "lg:translate-x-0" : "lg:translate-x-full"}
                // For mobile: animate from bottom
                ${isAnimating ? "translate-y-0" : "translate-y-full"}
                lg:translate-y-0
              `}
              style={{
                background:
                  "linear-gradient(170.1deg, #FFFFFF 60.03%, #E3DEEF 99.59%)",
              }}
            >
              {/* Header */}
              <div
                className={`flex justify-between p-3 bg-[#FFFFFF] border border-b-1 border-[#E5E5E5] `} //lg:rounded-tl-xl lg:rounded-bl-xl
              >
                <div
                  style={{
                    display: "flex",
                    color: storeDetails.tanyaThemeContrastColor,
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <div
                      className="flex gap-2 w-28 h-12 text-center items-center p-2 border rounded-l-[20px] rounded-tr-[20px]"
                      style={{
                        background:
                          "linear-gradient(265.62deg, #6851C6 5.24%, #8668FF 98.49%)",
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 15 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15 4.48438V0.5C15 0.5 8.94395 1.4375 6.78127 4.25C4.61859 7.0625 5.33095 15.5 5.33095 15.5H9.19857C9.19857 15.5 8.72793 7.76562 10.1654 6.125C11.6029 4.48438 15 4.48438 15 4.48438Z"
                          fill="white"
                        />
                        <path d="M0 0.5H6.28488V4.25H0V0.5Z" fill="white" />
                      </svg>

                      <p className="text-[#FFFFFF] font-nunitoSans font-semibold">
                        TANYA
                      </p>
                    </div>
                    <p
                      className="text-[#5B5B5B] font-nunitoSans font-semibold italic"
                      style={{ fontStyle: "italic" }}
                    >
                      {" "}
                      Your AI shopping assistant !{" "}
                    </p>
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
                  {/* close icon */}
                  <button onClick={() => setIsOpen(false)}>
                    <svg
                      width="24"
                      height="25"
                      viewBox="0 0 24 25"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g clipPath="url(#clip0_501_6036)">
                        <path
                          d="M18 6.5L6 18.5"
                          stroke="#555555"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6 6.5L18 18.5"
                          stroke="#555555"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_501_6036">
                          <rect
                            width="24"
                            height="24"
                            fill="white"
                            transform="translate(0 0.5)"
                          />
                        </clipPath>
                      </defs>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Chat Container */}
              <div className={`flex h-full md:flex-row lg:flex-row`}>
                <div
                  className={`flex flex-col h-full ${
                    product ? "lg:w-2/3 w-full" : "w-full"
                  }`}
                >
                  {/* Chat Body - Scrollable */}
                  <div
                    ref={scrollRef}
                    className="overflow-y-auto pr-5 pb-2 space-y-4 hide-scrollbar flex-grow mb-24"
                  >
                    {/* Shopping Options */}
                    {storeDetails?.whomRequired && (
                      <div
                        className="mx-3 p-3 rounded-2xl bg-[#FFFFFF]"
                        // style={{
                        //   color: storeDetails?.tanyaThemeContrastColor,
                        //   backgroundColor: storeDetails.tanyaThemeColor, //need to comment
                        //   width: "fit-content",
                        // }}
                      >
                        <div className="flex gap-2 bg-[#FFFFFF]">
                          {/* <Icon
                            icon="mdi:shopping"
                            color="white"
                            width="22"
                            height="22"
                          /> */}
                          <p className="font-bold font-nunitoSans text-[#494949]">
                            Is this for you or someone else?
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {shoppingOptions.map((option) => (
                            <button
                              key={option}
                              onClick={() => handleWhomSelection(option)}
                              className="px-2 py-2 font-semibold text-xs text-[#18181B] bg-[#F3F3F3] rounded-2xl"
                              style={{
                                backgroundColor:
                                  whom === payloadMapping[option]
                                    ? "#FFFFFF"
                                    : "#F3F3F3",
                                borderColor:
                                  whom === payloadMapping[option]
                                    ? "#BBB3DD"
                                    : "",
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Chat History */}
                    {chatHistory.map((chat, index) => (
                      <div key={index}>
                        <div className="flex justify-end">
                          <p className="text-sm font-nunitoSans font-bold text-[#000000] bg-[#E2DBFF] border border-[#C9C2DE] rounded-l-xl p-2 m-3 mb-4 rounded-br-xl max-w-[75%]">
                            {chat.query}
                          </p>
                        </div>
                        {chat.response && chat.response.includes("Thinking") ? (
                          <div>
                            <div
                              className="font-nunitoSans animate-pulse font-bold text-sm text-[#494949] bg-[#FFFFFF] px-7 py-1 rounded-r-xl rounded-bl-2xl w-full"
                              dangerouslySetInnerHTML={{
                                __html: formatStringToHtml(chat.response),
                              }}
                            />
                          </div>
                        ) : (
                          <div>
                            <div
                              className="font-nunitoSans font-bold text-sm text-[#494949] bg-[#FFFFFF] px-7 py-1 rounded-r-xl rounded-bl-2xl w-full"
                              dangerouslySetInnerHTML={{
                                __html: formatStringToHtml(chat.response),
                              }}
                            />
                          </div>
                        )}
                        {productLoading &&
                          !chat.response.includes("Thinking") &&
                          chat.products?.length == 0 && (
                            <div>
                              <p className="text-sm animate-pulse font-nunitoSans font-bold text-[#000000] bg-[#E2DBFF] border border-[#C9C2DE] rounded-l-xl p-2 m-3 mb-4 rounded-br-xl max-w-[75%]">
                                Finding best products for you
                              </p>
                            </div>
                          )}
                        {chat?.products && chat?.products?.length > 0 && (
                          <ProductDisplay
                            chat={chat.products}
                            storeDetails={storeDetails}
                          />
                        )}

                        {/* Potential Questions */}
                        {chat.potentialQuestions.length > 0 && (
                          <div className="my-2 px-4 text-sm text-gray-700">
                            <p
                              className="font-nunitoSans font-bold text-sm text-[#494949]"
                              style={{ color: storeDetails.themeDarkColor }}
                            >
                              Why not explore these inquiries...
                            </p>
                            {chat.potentialQuestions
                              .split(",")
                              .map((question, idx) => (
                                <button
                                  key={idx}
                                  className={`cursor-pointer font-nunitoSans font-semibold text-[#232323] border bg-[#804C9E0D] border-${storeDetails.themeDarkColor} m-1 rounded-xl px-2 py-1`}
                                  onClick={() => handleSendMessage(question)}
                                  style={{
                                    backgroundColor:
                                      storeDetails.tanyaThemeColorLight,
                                  }}
                                >
                                  {question}
                                </button>
                              ))}
                          </div>
                        )}

                        {chat.secondaryLoading && (
                          <div className="mt-3 mb-4 px-4">
                            <div
                              className="tanya-surprise-wrapper bg-indigo-300 text-sm px-7 py-4 rounded-r-xl rounded-bl-2xl w-full relative overflow-hidden"
                              style={{
                                margin: "0.75rem",
                              }}
                            >
                              <div className="flex gap-1">
                                <div className="tanya-sparkle tanya-sparkle-1">
                                  ✨
                                </div>
                                <div className="tanya-sparkle tanya-sparkle-2">
                                  ✨
                                </div>
                                <div className="tanya-sparkle tanya-sparkle-3">
                                  ✨
                                </div>
                              </div>
                              <div className="tanya-shimmer" />
                              <p
                                className="font-semibold tanya-pulse"
                                style={{ color: storeDetails.themeDarkColor }}
                              >
                                I’ve found a special surprise crafted just for
                                you… hang on a sec!
                              </p>
                              <p
                                className="tanya-dots mt-1"
                                style={{ color: storeDetails.themeDarkColor }}
                              >
                                • • •
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Secondary Response (from secondary flow) */}
                        {chat.secondaryResponse && (
                          <>
                            <div className="mt-3 mb-8 px-4 bg-indigo-300 rounded-tr-[5px]">
                              {/* Chat Response */}
                              <div
                                className="text-sm text-[#232323] bg-[#FFFFFF] px-7 py-4 rounded-br-xl rounded-bl-2xl w-full"
                                style={{
                                  backgroundColor:
                                    storeDetails.tanyaThemeColorLight,
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: formatStringToHtml(
                                    chat.secondaryResponse
                                  ),
                                }}
                              />
                              {chat.productSnapshot && (
                                // chat.productSnapshot.points > 0 &&
                                <div className="mt-4 w-full">
                                  <div
                                    className="flex gap-4 items-stretch rounded-2xl p-4"
                                    style={{
                                      backgroundColor:
                                        storeDetails.tanyaThemeColorLight,
                                    }}
                                  >
                                    <div
                                      className="flex-shrink-0 rounded-xl overflow-hidden border"
                                      style={{
                                        width: 112,
                                        height: 112,
                                        borderColor: "#eee",
                                      }}
                                    >
                                      {chat.productSnapshot.image ? (
                                        <img
                                          src={chat.productSnapshot.image}
                                          alt={chat.productSnapshot.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                          No Image
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex flex-col flex-1 justify-between">
                                      <div>
                                        <p className="font-semibold text-[15px] leading-snug">
                                          {chat.productSnapshot.name}
                                        </p>
                                        <p className="mt-1 text-[14px] font-medium">
                                          {chat.productSnapshot.price != null
                                            ? new Intl.NumberFormat(undefined, {
                                                style: "currency",
                                                currency:
                                                  storeDetails?.currency ||
                                                  "USD",
                                              }).format(
                                                chat.productSnapshot.price
                                              )
                                            : ""}
                                        </p>

                                        {chat.productSnapshot.points > 0 && (
                                          <p className="mt-1 text-xs opacity-80">
                                            You will earn{" "}
                                            <strong>
                                              {chat.productSnapshot.points}{" "}
                                              points
                                            </strong>
                                          </p>
                                        )}
                                      </div>

                                      <div className="mt-3 flex items-center gap-3">
                                        <div className="flex items-center border rounded-full overflow-hidden">
                                          <button
                                            className="px-3 py-1 text-sm"
                                            onClick={() =>
                                              setChatHistory((prev) =>
                                                prev.map((m, i) =>
                                                  i === index &&
                                                  m.productSnapshot
                                                    ? {
                                                        ...m,
                                                        productSnapshot: {
                                                          ...m.productSnapshot,
                                                          quantity: Math.max(
                                                            1,
                                                            m.productSnapshot
                                                              .quantity - 1
                                                          ),
                                                        },
                                                      }
                                                    : m
                                                )
                                              )
                                            }
                                            style={{
                                              background: "transparent",
                                              color:
                                                storeDetails.themeDarkColor,
                                            }}
                                          >
                                            −
                                          </button>
                                          <div className="px-3 py-1 text-sm select-none">
                                            {chat.productSnapshot.quantity}
                                          </div>
                                          <button
                                            className="px-3 py-1 text-sm"
                                            onClick={() =>
                                              setChatHistory((prev) =>
                                                prev.map((m, i) =>
                                                  i === index &&
                                                  m.productSnapshot
                                                    ? {
                                                        ...m,
                                                        productSnapshot: {
                                                          ...m.productSnapshot,
                                                          quantity:
                                                            m.productSnapshot
                                                              .quantity + 1,
                                                        },
                                                      }
                                                    : m
                                                )
                                              )
                                            }
                                            style={{
                                              background: "transparent",
                                              color:
                                                storeDetails.themeDarkColor,
                                            }}
                                          >
                                            +
                                          </button>
                                        </div>
                                        <button
                                          onClick={() => {
                                            handleAddToCart(
                                              mapSnapshotToProduct(
                                                chat.productSnapshot!
                                              ),
                                              chat.productSnapshot!.quantity
                                            );
                                          }}
                                          disabled={adding}
                                          className="px-4 py-2 rounded-full font-medium"
                                          style={{
                                            background:
                                              storeDetails.tanyaThemeColor,
                                            color:
                                              storeDetails?.tanyaThemeContrastColor ||
                                              "#fff",
                                            opacity: adding ? 0.8 : 1,
                                          }}
                                        >
                                          {adding ? "Adding..." : "Add to cart"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        <div className="mb-20"></div>
                      </div>
                    ))}
                  </div>

                  {/* Sticky Bottom Input Bar */}
                  <div className="flex flex-col gap-2 sticky bottom-0 left-0 right-0 bg-[#E3DEEF] z-50 px-4 py-2">
                    {/* Gradient Border Wrapper */}
                    <div
                      className="p-[1px] rounded-xl"
                      style={{
                        background:
                          "linear-gradient(180deg, #B09FFF 0%, #8D79F6 100%)",
                      }}
                    >
                      {/* Input + Mic + Submit */}
                      <div className="flex items-center bg-[#FFFFFF] flex-1 rounded-xl px-2 py-1">
                        <input
                          className="flex-1 bg-[#FFFFFF] text-[#232323] outline-none border-none px-2 py-2 text-sm"
                          placeholder="How can I help you..."
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !isLoading)
                              handleSendMessage();
                          }}
                        />
                        {/* Mic Icon */}
                        <button
                          type="button"
                          className="p-2 text-[#959595] hover:text-[#6952C7]"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <g clipPath="url(#clip0_501_6086)">
                              <path
                                d="M7.5 4.16663C7.5 3.50358 7.76339 2.8677 8.23223 2.39886C8.70107 1.93002 9.33696 1.66663 10 1.66663C10.663 1.66663 11.2989 1.93002 11.7678 2.39886C12.2366 2.8677 12.5 3.50358 12.5 4.16663V8.33329C12.5 8.99633 12.2366 9.63222 11.7678 10.1011C11.2989 10.5699 10.663 10.8333 10 10.8333C9.33696 10.8333 8.70107 10.5699 8.23223 10.1011C7.76339 9.63222 7.5 8.99633 7.5 8.33329V4.16663Z"
                                stroke="#959595"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M4.1665 8.33337C4.1665 9.88047 4.78109 11.3642 5.87505 12.4582C6.96901 13.5521 8.45274 14.1667 9.99984 14.1667C11.5469 14.1667 13.0307 13.5521 14.1246 12.4582C15.2186 11.3642 15.8332 9.88047 15.8332 8.33337"
                                stroke="#959595"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M6.6665 17.5H13.3332"
                                stroke="#959595"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M10 14.1666V17.5"
                                stroke="#959595"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </g>
                            <defs>
                              <clipPath id="clip0_501_6086">
                                <rect width="20" height="20" fill="white" />
                              </clipPath>
                            </defs>
                          </svg>
                        </button>
                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="p-3"
                          onClick={() => handleSendMessage()}
                        >
                          {isLoading ? (
                            <div
                              className="p-3 animate-spin rounded-full h-3 w-3 border-b-2"
                              style={{
                                borderBottom: "2px solid",
                                color: storeDetails.tanyaThemeColor,
                              }}
                            />
                          ) : (
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M16.6357 13.6701L18.3521 8.5208C19.8516 4.02242 20.6013 1.77322 19.414 0.585948C18.2268 -0.601312 15.9776 0.148418 11.4792 1.64788L6.32987 3.36432C2.69923 4.57453 0.883923 5.17964 0.368062 6.06698C-0.122688 6.91112 -0.122688 7.95369 0.368062 8.7978C0.883923 9.6852 2.69923 10.2903 6.32987 11.5005C6.77981 11.6505 7.28601 11.5434 7.62294 11.2096L13.1286 5.75495C13.4383 5.44808 13.9382 5.45041 14.245 5.76015C14.5519 6.06989 14.5496 6.56975 14.2398 6.87662L8.8231 12.2432C8.4518 12.6111 8.3342 13.1742 8.4995 13.6701C9.7097 17.3007 10.3148 19.1161 11.2022 19.6319C12.0463 20.1227 13.0889 20.1227 13.933 19.6319C14.8204 19.1161 15.4255 17.3008 16.6357 13.6701Z"
                                fill="#6952C7"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <ProductDisplayCard />
              </div>
              {/* </PopoverContent> */}
            </div>
          </>
        )}
      </Popover>
    </div>
  );
};

export default TanyaShoppingAssistantStream;

// ${import.meta.env.VITE_SERVER_BASE_URL}api/web-bff/assistantStream
