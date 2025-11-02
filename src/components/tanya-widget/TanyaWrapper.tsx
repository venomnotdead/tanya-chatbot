import { ApolloProvider } from "@apollo/client";
import ReduxProvider from "../provider/reduxProvider";
import TanyaShoppingAssistantStream from "./tanya-shopping-assistent";
import { apolloClient } from "../graphQL/apollo-client";

const TanyaWrapper = () => {
  return (
    <ApolloProvider client={apolloClient}>
      <ReduxProvider>
        <TanyaShoppingAssistantStream />
      </ReduxProvider>
    </ApolloProvider>
  );
};

export default TanyaWrapper;
