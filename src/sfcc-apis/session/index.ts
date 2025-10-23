import axios from "axios";
import { apiConfig } from "../../config/api";

export async function authData() {
  if(!import.meta.env.VITE_SCAPI_ENVIRONMENT){
    return "";
  }
  const expires_in = localStorage.getItem("expires_in");
  const access_token = localStorage.getItem("access_token");
  if (
    expires_in &&
    access_token &&
    new Date().getTime() < parseInt(expires_in)
  ) {
    console.log("access token found in local storage");
    return { access_token, expires_in };
  }
  const { serverUrl } = apiConfig();
  const dwsid = JSON.parse(
    sessionStorage.getItem("customerData") || "{}"
  ).dwsid;
  const isGuest = JSON.parse(
    sessionStorage.getItem("customerData") || "{}"
  ).isGuest;
  const customerMail = "vaidikchauhan333@gmail.com";
  //TODO - get real data from session
  //   JSON.parse(
  //     sessionStorage.getItem('customerData') || '{}'
  //   ).customerMail;
  try {
    const endpoint = isGuest ? "unregister-auth" : "register-auth";
    const res = await axios.get(
      `${serverUrl}sc-api/${endpoint}?dwsid=${dwsid}&email=${customerMail}`
    );
    localStorage.setItem("access_token", res.data.access_token);
    localStorage.setItem(
      "expires_in",
      new Date().getTime() + res.data.expires_in
    );
    console.log(res.data);
    return res.data;
  } catch (err) {
    console.log(err);
  }
}
