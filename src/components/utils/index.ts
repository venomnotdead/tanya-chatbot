import axios from "axios";
import { apiConfig } from "../../config/api";

export const getSearchResults = async (query: string) => {
  // const token = await getAccessToken();
  const { serverUrl } = apiConfig();
  // if (!token) throw new Error("Failed to fetch token");
  try {
    const response = await axios.get(
      `${serverUrl}api/search-sfcc?query=${query}`,
      {
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${token}`,
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

  const response = await axios.get(`${serverUrl}api/product-sfcc/${id}`, {
    headers: {
      "Content-Type": "application/json",
      // Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};
