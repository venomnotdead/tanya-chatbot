// import axios from "axios";
// import { apiConfig } from "../../config/api";

// export const fetchTokenSFCC = async () => {
//   const { serverUrl } = apiConfig();
//   const URL = `${serverUrl}`;
//   try {
//     const response = await axios.post(`${URL}api/auth/token-sfcc`, {
//       type: "guest",
//     });
//     if (response.status !== 200 && !response.data.access_token) {
//       console.error("Failed to fetch token:");
//     }
//     console.log("token res fe11", response.data);
//     return response.data.access_token;
//   } catch (error) {
//     if (axios.isAxiosError(error)) {
//       console.error("Error fetching token:", error.response || error.message);
//     } else {
//       console.error("Unexpected error:", error);
//     }
//     return null;
//   }
// };
