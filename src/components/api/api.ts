import { apiConfig } from "../../config/api";
import { getHost, getSiteId } from "../utils";
import { getAccessToken } from "../utils/getAccessToken";
import axios from "axios";

export const fetchStoreConfig = async (storeCode: string) => {
  try {
    const token = await getAccessToken();
    const { serverUrl } = apiConfig();
    const response = await axios.get(
      `${serverUrl}api/logo?storeCode=${storeCode}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return error;
    // console.error("Error fetching logo details:", error);
  }
};

interface Product {
  product_id: string;
  quantity: number;
}

export const createBasket = async (customer_token: string) => {
  const { serverUrl } = apiConfig();
  const URL = `${serverUrl}`;
  try {
    const response = await axios.post(
      `${URL}api/basket/create?baseUrl=${getHost()}&siteId=${getSiteId()}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: customer_token,
        },
      }
    );

    if (response.status === 201 && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error creating basket:", error.response || error.message);
    } else {
      console.error("Unexpected error:", error);
    }
    return null;
  }
};

export const addProductToBasket = async (
  basketId: string,
  products: Product[],
  customer_token: string
) => {
  const { serverUrl } = apiConfig();
  const URL = `${serverUrl}`;
  try {
    const response = await axios.post(
      `${URL}api/basket/add-product/${basketId}?baseUrl=${getHost()}&siteId=${getSiteId()}`,
      products,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: customer_token,
        },
      }
    );

    if (response.status === 200 && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Error adding products to basket:",
        error.response || error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    return null;
  }
};

export const fetchBasket = async ({
  basketId,
  customer_token,
}: {
  basketId: string;
  customer_token: string;
}) => {
  const { serverUrl } = apiConfig();
  const URL = `${serverUrl}`;
  try {
    const response = await axios.get(
      `${URL}api/basket/${basketId}?baseUrl=${getHost()}&siteId=${getSiteId()}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: customer_token,
        },
      }
    );
    return { status: response.status, data: response.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return { status: error.response?.status, data: null };
    } else {
      return { status: null, data: null };
    }
  }
};
