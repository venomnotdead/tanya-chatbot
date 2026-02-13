/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloProvider } from "@apollo/client";
import ReduxProvider from "../provider/reduxProvider";
import TanyaShoppingAssistantStream from "./tanya-shopping-assistent";
import { apolloClient } from "../graphQL/apollo-client";

const TanyaWrapper = (props: any) => {
  const { tanyaConfig, customerData } = props;
  return (
    <ApolloProvider client={apolloClient}>
      <ReduxProvider>
        <TanyaShoppingAssistantStream tanyaConfig={tanyaConfig} customerData={customerData} />
      </ReduxProvider>
    </ApolloProvider>
  );
};

export default TanyaWrapper;
