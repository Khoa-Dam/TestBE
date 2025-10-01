import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import {
  AptosJSProClient,
} from "@aptos-labs/js-pro";
const config = new AptosConfig({
  network: Network.TESTNET,
});

export const aptos = new Aptos(config);


// import { Aptos, AptosConfig, Network, ClientConfig } from "@aptos-labs/ts-sdk";

// Read from environment variables (Vite style) with safe fallbacks
// const NODE_API_URL = (import.meta as any).env?.VITE_APTOS_NODE_URL || undefined;
// const API_KEY = (import.meta as any).env?.VITE_APTOS_API_KEY || undefined;


// const clientConfig: ClientConfig = {
//   API_KEY: API_KEY
// };
// const config = new AptosConfig({
//   fullnode: NODE_API_URL,
//   network: Network.TESTNET,
//   clientConfig
// });

// export const aptos = new Aptos(config);
const client = new AptosJSProClient({
  network: { network: Network.TESTNET },
});
export async function getBalance(address: string) {
  const balance = await client.fetchAptBalance({
    address: address,
  });
  return (Number(balance) / 100000000).toString();
}