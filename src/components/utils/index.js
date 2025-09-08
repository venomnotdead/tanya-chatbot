import axios from "axios";
import { getAccessToken } from "./getAccessToken";

export const getSearchResults = async (query) => {
  // const token = await getAccessToken();
  // if (!token) throw new Error("Failed to fetch token");
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_SERVER_BASE_URL}api/search-sfcc?query=${query}`,
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

export const getProductById = async (id) => {
  if (!id) throw new Error("Product ID is required");

  const response = await axios.get(
    `${import.meta.env.VITE_SERVER_BASE_URL}api/product-sfcc/${id}`,
    {
      headers: {
        "Content-Type": "application/json",
        // Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
