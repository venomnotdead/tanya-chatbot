import axios from "axios";

export const generateToken = async (): Promise<string | null> => {
  const URL = import.meta.env.VITE_TOKEN_URL;
  const clientId = import.meta.env.VITE_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_CLIENT_SECRET;

  if (!URL || !clientId || !clientSecret) {
    console.error("Missing token credentials");
    throw new Error("Missing token credentials");
  }

  const authHeader =
    "Basic " +
    btoa(encodeURIComponent(clientId) + ":" + encodeURIComponent(clientSecret));

  try {
    const response = await axios.post(
      URL,
      new URLSearchParams({ grant_type: "client_credentials" }), // Only grant_type in body
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: authHeader,
        },
      },
    );

    if (response.status === 200 && response.data.access_token) {
      return response.data.access_token;
    } else {
      console.error("Failed to fetch token:", response.data);
      return null;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error fetching token:", error.response || error.message);
    } else {
      console.error("Unexpected error:", error);
    }
    return null;
  }
};
