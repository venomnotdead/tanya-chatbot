/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { apiConfig } from "../../config/api";
import { fetchTokenBmGrant } from "./fetchTokenBmGrant";
import { fetchExistingGuestCustomerToken } from "./fetchExistingRegisterCustomerToken";
import { authData } from "../../sfcc-apis/session";

export const getHost = () => {
  const host = sessionStorage.getItem("Host");
  return host;
};

export const getSiteId = () => {
  const siteId = sessionStorage.getItem("SiteId");
  return siteId;
};

export const getSearchResults = async (query: string, token: string) => {
  const { serverUrl, basePath } = apiConfig();

  try {
    const host = getHost();
    const response = await axios.get(
      `${serverUrl}${basePath}/search-sfcc?baseUrl=${host}&query=${query}&siteId=${getSiteId()}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.hits;
  } catch (error) {
    console.error("Error fetching search results:", error);
    throw error;
  }
};

export const getProductById = async (id: number | string) => {
  if (!id) throw new Error("Product ID is required");
  const { serverUrl, basePath } = apiConfig();
  const host = getHost();
  const { access_token } = await authData();
  const response = await axios.get(
    `${serverUrl}${basePath}/product-sfcc/${id}?baseUrl=${host}&siteId=${getSiteId()}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
    }
  );

  return response.data;
};

export const getInterestApi = async (customerId: any) => {
  if (!customerId) throw new Error("customerId is required");
  const access_token = await fetchTokenBmGrant();

  const { customer_token } = await fetchExistingGuestCustomerToken(
    access_token
  );
  const { serverUrl } = apiConfig();

  const response = await axios.get(
    `${serverUrl}api/get-interest?baseUrl=${getHost()}&customerId=${customerId}&siteId=${getSiteId()}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `${customer_token}`,
      },
    }
  );

  return response.data;
};
