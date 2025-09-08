import axios from "axios";

interface Customer {
  access_token: string;
  customerId: string;
}

// function getCookie(name: string): string | null {
//   const value = `; ${document.cookie}`;
//   console.log("parts", value,value.includes("dwsid"));
//   const parts = value.split(`; ${name}=`);
//   if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
//   return null;
// }

export const fetchExistingRegisterCustomerToken = async ({
  access_token,
  customerId,
}: Customer) => {
  const URL = `${import.meta.env.VITE_SERVER_BASE_URL}`;
  try {
    const response = await axios.post(
      `${URL}api/auth/token-existing-register-customer/${customerId}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (response.status === 200 && response.data) {
      // console.log("customer token res fe", response.data)
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

export const fetchExistingGuestCustomerToken = async (
  access_token: string,
) => {
  const URL = `${import.meta.env.VITE_SERVER_BASE_URL}`;
  try {
    const dwsid = JSON.parse(sessionStorage.getItem("customerData")|| "{}").dwsid // fetch cookie

    const response = await axios.post(
      `${URL}api/auth/token-existing-guest-customer?dwsid=${dwsid}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        // withCredentials: true, // ensures cookies are respected in CORS
      }
    );

    if (response.status === 200 && response.data) {
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
