import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://testnet.cedra.dev" as string,
});
export const aptos = new Aptos(config);
