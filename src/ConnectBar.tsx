import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { shortAddr } from "./lib.readable";

export default function ConnectBar() {
  const { connect, disconnect, account, wallet, wallets, connected, network } =
    useWallet();

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {!connected ? (
        wallets?.map((w) => (
          <button key={w.name} onClick={() => connect(w.name)}>
            Connect {w.name}
          </button>
        ))
      ) : (
        <>
          <span>
            Wallet: <b>{wallet?.name}</b>
          </span>
          <span>
            Account: <code>{shortAddr(account?.address)}</code>
          </span>
          <span>
            Network: <code>{network?.name || "unknown"}</code>
          </span>
          <button onClick={() => disconnect()}>Disconnect</button>
        </>
      )}
    </div>
  );
}
