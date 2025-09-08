import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { generateToken } from "../utils/generateToken";

const BASE_URL = import.meta.env.VITE_BASE_URL;

if (!BASE_URL) {
  console.error("Missing base URL");
  throw new Error("Missing base URL");
}

const httpLink = createHttpLink({
  uri: `${BASE_URL}`,
});

const authLink = setContext(async (_, { headers }) => {
  // Always get fresh token instead of storing it
  const token = await generateToken();

  return {
    headers: {
      ...headers,
      authorization: `Bearer ${token}`,
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
    },
  },
});
