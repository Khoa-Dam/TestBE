import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";

const dappInfo = {
  name: "NFT Marketplace Demo",
  url: "http://localhost:5173",
  icon: "https://avatars.githubusercontent.com/u/108340147?s=200&v=4",
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AptosWalletAdapterProvider autoConnect>
      <App />
    </AptosWalletAdapterProvider>
  </React.StrictMode>
);
