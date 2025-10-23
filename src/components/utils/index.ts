/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { apiConfig } from "../../config/api";
import { fetchTokenBmGrant } from "./fetchTokenBmGrant";
import { fetchExistingGuestCustomerToken } from "./fetchExistingRegisterCustomerToken";

export const getHost = () => {
  const host = sessionStorage.getItem("Host");
  return host;
};

export const getSearchResults = async (query: string, token: string) => {
  const { serverUrl } = apiConfig();

  try {
    const host = getHost();
    const response = await axios.get(
      `${serverUrl}sc-api/search-sfcc?baseUrl=${host}&query=${query}`,
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
  const { serverUrl } = apiConfig();
  const host = getHost();
  const response = await axios.get(
    `${serverUrl}api/product-sfcc/${id}?baseUrl=${host}`,
    {
      headers: {
        "Content-Type": "application/json",
        // Authorization: `Bearer ${token}`,
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
    `${serverUrl}api/get-interest?baseUrl=${getHost()}&customerId=${customerId}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `${customer_token}`,
      },
    }
  );

  return response.data;
};
