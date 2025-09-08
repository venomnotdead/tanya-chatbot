// import axios from "axios";

// export const fetchTokenSFCC = async () => {
//   const URL = `${import.meta.env.VITE_SERVER_BASE_URL}`;
//   try {
//     const response = await axios.post(`${URL}api/auth/token-sfcc`);
//     console.log("token res fe", response.data)
//     if (response.status === 200 && response.data.access_token) {
//       return response.data.access_token;
//     } else {
//       console.error("Failed to fetch token:", response.data);
//       return null;
//     }
//   } catch (error) {
//     if (axios.isAxiosError(error)) {
//       console.error("Error fetching token:", error.response || error.message);
//     } else {
//       console.error("Unexpected error:", error);
//     }
//     return null;
//   }
// };
