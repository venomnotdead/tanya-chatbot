import { apiConfig } from "../../config/api";
import { authData } from "../../sfcc-apis/session";
import {
  clientId,
  getHost,
  getSiteId,
  organisationId,
  shortCode,
} from "../utils";
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

export const createBasket = async (customer_token: string, data?: any) => {
  const { serverUrl, basePath } = apiConfig();
  const URL = `${serverUrl}`;
  try {
    const response = await axios.post(
      `${URL}${basePath}/basket/create?baseUrl=${getHost()}&siteId=${getSiteId()}&pubCfg=${clientId()}&envRef=${shortCode()}&orgRef=${organisationId()}`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: customer_token,
        },
      }
    );
    window.postMessage(
      {
        type: "WIDGET_CREATED_BASKET",
        basketId: response.data?.basket_id || response.data?.basketId,
      },
      "*"
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error creating basket:", error.response || error.message);
    } else {
      console.error("Unexpected error:", error);
    }
    return null;
  }
};

export const createAgenticBasket = async () => {
  const authDetails = await authData();
  const customer_token = "Bearer " + authDetails?.access_token;
  const { serverUrl, basePath } = apiConfig();
  const URL = `${serverUrl}`;
  try {
    const response = await axios.post(
      `${URL}${basePath}/basket/agentic-create?baseUrl=${getHost()}&siteId=${getSiteId()}&pubCfg=${clientId()}&envRef=${shortCode()}&orgRef=${organisationId()}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: customer_token,
        },
      }
    );
    window.postMessage(
      {
        type: "WIDGET_CREATED_BASKET",
        basketId: response.data?.basket_id || response.data?.basketId,
      },
      "*"
    );

    return response.data;
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
  const { serverUrl, basePath } = apiConfig();
  const URL = `${serverUrl}`;
  try {
    const response = await axios.post(
      `${URL}${basePath}/basket/add-product/${basketId}?baseUrl=${getHost()}&siteId=${getSiteId()}&pubCfg=${clientId()}&envRef=${shortCode()}&orgRef=${organisationId()}`,
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
  const { serverUrl, basePath } = apiConfig();
  const URL = `${serverUrl}`;
  try {
    const response = await axios.get(
      `${URL}${basePath}/basket/${basketId}?baseUrl=${getHost()}&siteId=${getSiteId()}&pubCfg=${clientId()}&envRef=${shortCode()}&orgRef=${organisationId()}`,
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

export const getShippingMethods = async (basketId: string) => {
  const { serverUrl, basePath } = apiConfig();
  const URL = `${serverUrl}`;
  const authDetails = await authData();
  const customer_token = "Bearer " + authDetails?.access_token;
  try {
    const response = await axios.get(
      `${URL}${basePath}/basket/shipping-methods/${basketId}?baseUrl=${getHost()}&siteId=${getSiteId()}&pubCfg=${clientId()}&envRef=${shortCode()}&orgRef=${organisationId()}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: customer_token,
        },
      }
    );
    console.log("the shipping data\n", response.data);
    if (response?.data?.isNewBasket) {
      window.postMessage(
        {
          type: "WIDGET_CREATED_BASKET",
          basketId: response.data?.basketId,
        },
        "*"
      );
    }
    return response?.data?.applicableShippingMethods || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Error fetching shipping methods:",
        error.response || error.message
      );
    } else {
      console.error("Unexpected error:", error);
    }
    return [];
  }
};
