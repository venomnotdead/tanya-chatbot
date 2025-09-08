export const apiConfig = () => {
  const aiConversationUrl = `https://x5wxb6y197.execute-api.us-east-1.amazonaws.com/ecs/api/bedrock/invoke`;
  const xAPIKey = "BJBtjpPkqGatuoa3qJqdR8aHXSsHkgvGaootbubi";
  const serverUrl = "https://auras-server.vercel.app/";
  // const serverUrl = "http://localhost:4001/";
  return { aiConversationUrl, xAPIKey, serverUrl };
};
