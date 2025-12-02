/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { apiConfig } from "../../config/api";
import {
  clientId,
  getSiteId,
  organisationId,
  shortCode,
} from "../../components/utils";

export async function authData() {
  // if (!import.meta.env.VITE_SCAPI_ENVIRONMENT) {
  //   return "";
  // }
  const siteId = getSiteId();
  const accessKey = "access_token" + "_" + siteId;
  const expiresInKey = "expires_in" + "_" + siteId;
  const expires_in = localStorage.getItem(expiresInKey);
  const access_token = localStorage.getItem(accessKey);
  console.log(access_token);
  const isGuest =
    JSON.parse(sessionStorage.getItem("customerData") || "{}")?.isGuest || true;
  // if (
  //   expires_in &&
  //   access_token &&
  //   new Date().getTime() < parseInt(expires_in)
  //   // && (isGuest === localStorage.getItem("isGuest") || "true")
  // ) {
  console.log("access token found in local storage");
  return { access_token, expires_in };
  // }
  // const { serverUrl } = apiConfig();
  // const dwsid = JSON.parse(
  //   sessionStorage.getItem("customerData") || "{}"
  // ).dwsid;

  // const customerMail = JSON.parse(
  //   sessionStorage.getItem("customerData") || "{}"
  // ).usrRef;

  // try {
  //   const endpoint = isGuest ? "unregister-auth" : "register-auth";
  //   const res = await axios.get(
  //     `${serverUrl}sc-api/${endpoint}?dwsid=${dwsid}&email=${customerMail}&pubCfg=${clientId()}&envRef=${shortCode()}&orgRef=${organisationId()}&siteId=${getSiteId()}&token=true`,
  //     {
  //       withCredentials: true,
  //     }
  //   );
  //   // localStorage.setItem(accessKey, res.data.access_token);
  //   // localStorage.setItem(
  //   //   expiresInKey,
  //   //   String(new Date().getTime() + res.data.expires_in * 1000)
  //   // );
  //   // localStorage.setItem("isGuest", isGuest ? "true" : "false");
  //   return res.data;
  // } catch (err) {
  //   console.log(err);
  // }
}

export const getJWTToken = async (cachedToken: any, tokenExpiry: any) => {
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
      throw new Error(`Token request failed! status: ${tokenResponse.status}`);
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
