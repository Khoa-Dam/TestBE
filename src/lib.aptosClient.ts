import { Aptos, AptosConfig, Network, ClientConfig } from "@aptos-labs/ts-sdk";

// Read from environment variables (Vite style) with safe fallbacks
const NODE_API_URL = (import.meta as any).env?.VITE_APTOS_NODE_URL || undefined;
const API_KEY = (import.meta as any).env?.VITE_APTOS_API_KEY || undefined;


const clientConfig: ClientConfig = {
  API_KEY: API_KEY
};
const config = new AptosConfig({
  fullnode: NODE_API_URL,
  network: Network.TESTNET,
  clientConfig
});

export const aptos = new Aptos(config);

