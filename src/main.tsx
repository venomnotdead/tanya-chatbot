import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// import App from "./App";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "../src/components/graphQL/apollo-client";
import { BrowserRouter } from "react-router-dom";
import ReduxProvider from "./components/provider/reduxProvider";
import "./index.css";
import { ToastContainer } from "react-toastify";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <ReduxProvider>
        <BrowserRouter>
          {" "}
          {/* <-- Wrap your app with BrowserRouter */}
          {/* <App /> */}
          hi
          <ToastContainer />
        </BrowserRouter>
      </ReduxProvider>
    </ApolloProvider>
  </StrictMode>
);
