/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloProvider } from "@apollo/client";
import ReduxProvider from "../provider/reduxProvider";
import TanyaShoppingAssistantStream from "./tanya-shopping-assistent";
import { apolloClient } from "../graphQL/apollo-client";

const TanyaWrapper = (props: any) => {
 
 const { tanyaConfig } = props;
  return (
    <ApolloProvider client={apolloClient}>
      <ReduxProvider>
        <TanyaShoppingAssistantStream tanyaConfig={tanyaConfig} />
      </ReduxProvider>
    </ApolloProvider>
  );
};

export default TanyaWrapper;
