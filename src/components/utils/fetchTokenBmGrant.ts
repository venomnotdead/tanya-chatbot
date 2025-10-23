import axios from "axios";
import { getHost } from ".";

// fetch bm mai email:password:client pass lagega aur ye user to user differ karega,  email:password:client  ko base64 encrypt kar k auth mai pass karna padega

// email:password:client need to be pass in encrypt form in the auth of fetchTokenBmGrant

// email:password:client is different from user to user
export const fetchTokenBmGrant = async () => {
  const URL = `${import.meta.env.VITE_SERVER_BASE_URL}`;
  try {
    const response = await axios.post(`${URL}api/auth/token-bm-grant?baseUrl=${getHost()}`);
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
