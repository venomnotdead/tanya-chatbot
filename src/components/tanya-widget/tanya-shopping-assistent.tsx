/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { Popover, PopoverTrigger } from "../ui/popover";
// import tanyaChatBotIcon from "@/assets/tanya-chatbot/chat-with-tanya.png";
// import { getAccessToken } from "../utils/getAccessToken";
import { getSearchResults } from "../utils";
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
// import { apiConfig, createSignedHeaders } from "../../config/api";
// import { notifySFCC } from "../lib/utils";
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

  // const messageMapping: Record<string, string> = {
  //   Myself: "Great choice! Let’s find something special just for you.",
  //   "My Child": "Aww, shopping for your little one? Let’s find the best picks!",
  //   "My Grandchild":
  //     "How sweet! Let’s find something your grandchild will love.",
  //   "Niece/Nephew":
  //     "Shopping for your niece or nephew? Let’s pick something fun!",
  //   "My Friends":
  //     "Finding the perfect gift for your friends? Let’s get started!",
  //   Others: "Shopping for someone special? Let’s make it amazing!",
  // };

  // const sessionData = useSessionTracker();
  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(
    searchParams.get("shoppingassist") === "true"
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [whom, setWhom] = useState("");
  // const dispatch = useDispatch();

  const [chatHistory, setChatHistory] = useState<
    {
      query: string;
      response: string;
      potentialQuestions: string;
      products?: { keyword: string; items: SearchProduct[] }[];
      keywords: string;
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

  // const getHealthCheck =async()=>{
  //   const res = await fetch("http://e-commerce-alb-488886292.us-east-1.elb.amazonaws.com/health");
  //   console.log(res,'the res');
  // }

  // useEffect(() => {
  //   getHealthCheck();
  // }, []);

  // useEffect(() => {
  //   if (storeCode) {
  //     fetchStoreConfig(storeCode).then((res) => {
  //       dispatch(setStore({ ...res, storeCode }));
  //     });
  //   }
  // }, [storeCode]);

  // Handle selecting "whom" option
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

  const handleSendMessage = async (question?: string) => {
    const newQuery = question || inputText.trim();
    if (!newQuery) return;

    setIsLoading(true);
    setInputText("");
    setChatHistory((prev) => [
      ...prev,
      {
        query: newQuery,
        response: "",
        potentialQuestions: "",
        products: [],
        keywords: "",
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

      const invokeUrl = `https://tanya.aspiresys-retail.com/api/bedrock/invoke/stream?${queryParams.toString()}`;

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
        if (results?.length > 0) {
          setChatHistory((prev) =>
            prev.map((msg, idx) =>
              idx === prev.length - 1
                ? {
                    ...msg,
                    products: [
                      ...(msg.products || []),
                      { keyword: keyword, items: results },
                    ],
                  }
                : msg
            )
          );
        }
      }
    } else {
      for (const keyword of keywords) {
        const results = await getSearchResults(
          keyword
          // storeDetails.searchConfigs
        );
        if (results?.length > 0) {
          setChatHistory((prev) =>
            prev.map((msg, idx) =>
              idx === prev.length - 1
                ? {
                    ...msg,
                    products: [
                      ...(msg.products || []),
                      { keyword: keyword, items: results },
                    ],
                  }
                : msg
            )
          );
        }
      }
    }
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
          {/* <img
              src={tanyaChatBotIcon}
              alt="Chat with Tanya"
              className="w-[20%] pl-[5px] pt-[2px]"
            /> */}
          {/* <Icon
            icon="fluent:search-sparkle-28-filled"
            width="28"
            height="28"
            color={storeDetails?.tanyaThemeContrastColor}
            className="ml-3"
          /> */}

          <div className="flex flex-col p-[5px]">
            {/* <span className="text-white text-[14px]">
              {storeDetails?.tanyaName ? storeDetails.tanyaName : "TANYA"}
            </span>
            <span className="text-white text-[12px] hidden sm:inline">
              Your AI Shopping Assistant
            </span> */}
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
              {/* // <PopoverContent
              // side="right"
              // align="end"
              // sideOffset={0}
            //   alignOffset={0}
            //   className="relative h-screen w-[125vw] sm:w-[80vw] md:w-[770px] border-0 bg-white p-0 rounded-xl overflow-hidden flex flex-col"
            // > */}

              {/* Header */}
              <div
                className={`flex justify-between p-3 bg-[#FFFFFF] border border-b-1 border-[#E5E5E5] `} //lg:rounded-tl-xl lg:rounded-bl-xl
                // style={{
                //   background: storeDetails?.tanyaThemeColor,
                // }}
              >
                <div
                  style={{
                    display: "flex",
                    color: storeDetails.tanyaThemeContrastColor,
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {/* <img src={tanyaChatBotIcon} alt="Chat with Tanya" width={50} /> */}
                  {/* <Icon
                    icon="fluent:search-sparkle-28-filled"
                    width="38"
                    height="38"
                    color="white"
                  /> */}
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

                  {/* <div>
                    <p className="text-xs font-light mt-1">Chat with</p>
                    <p className="font-bold m-0">
                      TANYA{" "}
                      <span className="text-xs font-light">
                        (AI Shopping Assistant)
                      </span>
                    </p>
                  </div> */}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1.25rem",
                    margin: "0.75rem",
                  }}
                >
                  {/* reset svg icon */}
                  {/* <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 25"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-[#555555]"
                  >
                    <g clip-path="url(#clip0_501_6032)">
                      <path
                        d="M12 8.5V12.5L14 14.5"
                        stroke="#555555"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M3.0498 11.5C3.2739 9.30006 4.30007 7.25962 5.93254 5.76797C7.56501 4.27633 9.6895 3.43789 11.9007 3.41264C14.1119 3.38738 16.255 4.17707 17.9211 5.63104C19.5872 7.08501 20.6597 9.10149 20.934 11.2957C21.2083 13.49 20.6651 15.7084 19.4082 17.5278C18.1512 19.3471 16.2684 20.64 14.1191 21.1599C11.9697 21.6797 9.70421 21.39 7.7548 20.3461C5.80539 19.3022 4.30853 17.5771 3.5498 15.5M3.0498 20.5V15.5H8.0498"
                        stroke="#555555"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_501_6032">
                        <rect
                          width="24"
                          height="24"
                          fill="white"
                          transform="translate(0 0.5)"
                        />
                      </clipPath>
                    </defs>
                  </svg> */}

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
                  {/* <Icon
                    icon="fluent:dismiss-24-filled"
                    color={storeDetails?.tanyaThemeContrastColor}
                    width="24"
                    height="24"
                    className="cursor-pointer bg-[#555555]"
                    onClick={() => setIsOpen(false)}
                  /> */}
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
                    className="overflow-y-auto pr-5 pb-2 space-y-4 hide-scrollbar flex-grow"
                  >
                    {/* <div
                      className="text-sm text-[16px] rounded-r-xl p-3 m-3 rounded-bl-xl w-3/4"
                      style={{
                        backgroundColor: storeDetails.tanyaThemeColorLight,
                      }}
                    >
                      Hey there! I'm Tanya, your AI shopping assistant. Think of
                      me as your helpful friend who knows all the best stuff at{" "}
                      {storeDetails.websiteTitle}. Ready to find something
                      amazing?
                    </div> */}

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
                                // color:
                                //   whom === payloadMapping[option]
                                //     ? storeDetails?.tanyaThemeColor || "#ffffff"
                                //     : storeDetails?.tanyaThemeContrastColor ||
                                //       "#000000",

                                // backgroundColor:
                                //   whom === payloadMapping[option]
                                //     ? storeDetails?.tanyaThemeColorLight
                                //     : "transparent",
                                // borderColor: storeDetails?.tanyaThemeColorLight,
                                // color:
                                //   whom === payloadMapping[option]
                                //     ? storeDetails?.tanyaThemeColor || "#ffffff"
                                //     : storeDetails?.tanyaThemeContrastColor ||
                                //       "#000000",
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* {storeDetails?.whomRequired && whom && (
                      <div className="flex items-center mx-3 mt-1">
                        <Icon
                          icon="fluent:shopping-bag-24-filled"
                          color={storeDetails.tanyaThemeColor}
                          width="22"
                          height="22"
                        />
                        <p
                          className="text-sm text-white  p-2 font-bold"
                          style={{ color: storeDetails.tanyaThemeColor }}
                        >
                          {(() => {
                            const selectedKey = Object.keys(
                              payloadMapping
                            ).find((key) => payloadMapping[key] === whom);
                            return selectedKey
                              ? messageMapping[selectedKey]
                              : "";
                          })()}
                        </p>
                      </div>
                    )} */}

                    {/* Chat History */}
                    {chatHistory.map((chat, index) => (
                      <div key={index}>
                        <div className="flex justify-end">
                          <p
                            className="text-sm font-nunitoSans font-bold text-[#000000] bg-[#E2DBFF] border border-[#C9C2DE] rounded-l-xl p-2 m-3 mb-4 rounded-br-xl max-w-[75%]"
                            // style={{
                            //   color: storeDetails?.tanyaThemeContrastColor,
                            //   backgroundColor: storeDetails.tanyaThemeColor,
                            // }}
                          >
                            {chat.query}
                          </p>
                        </div>
                        {chat.response && (
                          <div>
                            <div
                              className="font-nunitoSans font-bold text-sm text-[#494949] bg-[#FFFFFF] px-7 py-1 rounded-r-xl rounded-bl-2xl w-full"
                              dangerouslySetInnerHTML={{
                                __html: formatStringToHtml(chat.response),
                              }}
                              // style={{
                              //   backgroundColor:
                              //     storeDetails.tanyaThemeColorLight,
                              //   margin: "0.75rem",
                              // }}
                            />
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
                          <div className="my-2 mb-20 px-4 text-sm text-gray-700">
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
                      </div>
                    ))}
                  </div>

                  {/* Input Field - Always at Bottom */}
                  {/* <div className="sticky bottom-0 w-[96%] drop-shadow-xl flex items-center rounded-xl bg-[#FFFFFF] border border-gray-300 m-[15px]">
                    <input
                      placeholder="How can I help you..."
                      className="w-full bg-[#FFFFFF] rounded-xl p-4 outline-none border-none focus:ring-0 focus:border-transparent"
                      value={inputText}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isLoading) {
                          handleSendMessage();
                        }
                      }}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`mr-6 text-[${storeDetails.themeDarkColor}] font-medium`}
                      style={{ color: storeDetails.themeDarkColor }}
                      onClick={() => handleSendMessage()}
                    >
                      {isLoading ? (
                        <div
                          className="m-3 animate-spin rounded-full h-6 w-6 border-b-2"
                          style={{
                            borderBottom: "2px solid",
                            color: storeDetails.tanyaThemeColor,
                          }}
                        />
                      ) : (
                        <Icon
                          icon="fluent:send-48-filled"
                          color={storeDetails.tanyaThemeColor}
                          width="24"
                          height="24"
                        />
                      )}
                    </button>
                  </div> */}

                  {/* Sticky Bottom Input Bar */}
                  <div className="flex flex-col gap-2 sticky bottom-0 left-0 right-0 bg-[#E3DEEF] z-50 px-4 py-2">
                    {/* New Chat Text */}
                    {/* <div className="flex justify-end items-center">
                      <p
                        className="text-sm font-nunitoSans font-bold text-[#FFFFFF] p-1.5 pl-3 pr-3 border border-[#C9C2DE] rounded-l-2xl rounded-tr-2xl max-w-[75%]"
                        style={{
                          background:
                            "linear-gradient(265.62deg, #6851C6 5.24%, #8668FF 98.49%)",
                        }}
                      >
                        New chat
                      </p>
                    </div> */}

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
