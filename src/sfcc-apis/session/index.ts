import axios from "axios";
import { apiConfig } from "../../config/api";
import { clientId, getSiteId, organisationId, shortCode } from "../../components/utils";

export async function authData() {
  if (!import.meta.env.VITE_SCAPI_ENVIRONMENT) {
    return "";
  }
  const expires_in = localStorage.getItem("expires_in");
  const access_token = localStorage.getItem("access_token");
  const isGuest = JSON.parse(
    sessionStorage.getItem("customerData") || "{}"
  ).isGuest;
  if (
    expires_in &&
    access_token &&
    new Date().getTime() < parseInt(expires_in) &&
    isGuest === JSON.parse(localStorage.getItem("isGuest") || "false")
  ) {
    console.log("access token found in local storage");
    return { access_token, expires_in };
  }
  const { serverUrl } = apiConfig();
  const dwsid = JSON.parse(
    sessionStorage.getItem("customerData") || "{}"
  ).dwsid;

  const customerMail = JSON.parse(
    sessionStorage.getItem("customerData") || "{}"
  ).usrRef;

  try {
    const endpoint = isGuest ? "unregister-auth" : "register-auth";
    const res = await axios.get(
      `${serverUrl}sc-api/${endpoint}?dwsid=${dwsid}&email=${customerMail}&pubCfg=${clientId()}&envRef=${shortCode()}&orgRef=${organisationId()}&siteId=${getSiteId()}`
    );
    localStorage.setItem("access_token", res.data.access_token);
    localStorage.setItem(
      "expires_in",
      String(new Date().getTime() + res.data.expires_in * 1000)
    );
    localStorage.setItem("isGuest", isGuest.toString());
    console.log(res.data);
    return res.data;
  } catch (err) {
    console.log(err);
  }
}
