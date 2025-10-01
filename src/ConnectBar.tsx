import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useState } from "react";
import { shortAddr } from "./lib.readable";
import { API_BASE_URL, apiCall } from "./api/config";
import { getBalance } from "./lib.aptosClient";

interface ConnectBarProps {
  onNavigateToProfile?: () => void;
}

interface ConnectBarProps {
  onNavigateToProfile?: () => void;
}

export default function ConnectBar({ onNavigateToProfile }: ConnectBarProps) {
  const {
    connect,
    disconnect,
    account,
    wallet,
    wallets,
    connected,
    network,
    signMessage,
  } = useWallet();
  const [aptBalance, setAptBalance] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      if (account?.address) {
        try {
          const b = await getBalance(account.address);
          console.log("aptBalance", b);
          setAptBalance(b.toString());
        } catch {
          setAptBalance("");
        }
      } else {
        setAptBalance("");
      }
    };
    load();
  }, [account?.address]);

  // Check authentication status on component mount and when localStorage changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const authenticated = !!token && !!account?.address;
      setIsAuthenticated(authenticated);
      console.log("🔐 Auth status updated:", {
        hasToken: !!token,
        hasAccount: !!account?.address,
        isAuthenticated: authenticated,
      });
    };

    checkAuth();

    // Listen for storage changes (when token is saved)
    const handleStorageChange = () => checkAuth();
    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, [account?.address]);

  // Auto-run sign-in flow when wallet is connected but no token exists
  useEffect(() => {
    const runSignInFlow = async () => {
      if (connected && account?.address && !localStorage.getItem("token")) {
        console.log("🔄 Auto-running sign-in flow after wallet connection...");

        const addr = account.address;

        // 2.1 challenge
        console.log("🚀 Calling /auth/challenge with address:", addr);

        // Try different approaches for the API call
        let chRes;
        try {
          // Try 1: POST with body (current approach)
          chRes = await apiCall(`${API_BASE_URL}/auth/challenge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: addr }),
          });
        } catch (error) {
          console.warn(
            "❌ POST with body failed, trying GET with query param..."
          );
          // Try 2: GET with query parameter
          chRes = await apiCall(
            `${API_BASE_URL}/auth/challenge?address=${addr}`,
            {
              method: "GET",
            }
          );
        }

        if (!chRes.ok) {
          const errorText = await chRes.text();
          console.error("❌ Challenge API failed:", chRes.status, errorText);
          return; // Exit early if challenge fails
        }

        const ch = await chRes.json();
        console.log("✅ Challenge response:", ch);

        // 2.2 wallet.signMessage (Signature request popup)
        console.log("✍️ Requesting signature from wallet...");
        console.log("📝 Message to sign:", ch.messageToSign);
        console.log("🔢 Nonce:", ch.nonce);
        console.log("🔗 Wallet name:", wallet?.name);
        console.log("🌐 Network:", network?.name);

        let sig: any;

        // For Nightly wallet, we need double signature approach (first fails, second succeeds)
        if (wallet?.name === "Nightly") {
          console.log("🌙 Nightly wallet: Using double signature approach...");

          // First signature attempt (will fail but necessary to "wake up" the session)
          // This is OUTSIDE try-catch so it will throw error and stop execution if it fails
          console.log(
            "📝 First signature attempt for Nightly (will fail but necessary)..."
          );
          await signMessage({
            message: ch.messageToSign,
            nonce: ch.nonce,
            address: true,
            application: true,
            chainId: true,
          } as any);
          console.log("⚠️ Unexpected: First signature succeeded for Nightly");

          // Wait a bit then try second signature (this should succeed)
          console.log("⏳ Waiting before second signature attempt...");
          await new Promise((resolve) => setTimeout(resolve, 1500));

          try {
            console.log(
              "📝 Second signature request for Nightly (the real one)..."
            );
            sig = await signMessage({
              message: ch.messageToSign,
              nonce: ch.nonce,
              address: true,
              application: true,
              chainId: true,
            } as any);

            console.log(
              "✅ Second signature received from Nightly - using this for verification"
            );
          } catch (error2: any) {
            console.error(
              "❌ Second signature failed for Nightly:",
              error2?.message || "Unknown error"
            );
            throw new Error(
              "Nightly wallet authentication failed: " +
                (error2?.message || "Unknown error")
            );
          }
        } else {
          // Regular wallet - single signature
          sig = await signMessage({
            message: ch.messageToSign,
            nonce: ch.nonce,
            address: true,
            application: true,
            chainId: true,
          } as any);
        }

        console.log("✅ Final signature received from wallet");

        // Continue with authentication process
        try {
          console.log("✅ Got signature from wallet:", sig);
          console.log("🔍 Signature type:", typeof sig.signature);
          console.log("🔍 Signature value:", sig.signature);

          // Ensure signature is a string - handle both array and string formats
          let signature = sig.signature;
          if (Array.isArray(signature)) {
            console.log("🔧 Converting signature array to string");
            signature = Array.isArray(signature[0])
              ? signature[0].join(",")
              : signature.join(",");
          }

          console.log("🔧 Final signature:", signature);

          const publicKey = sig.publicKey || account?.publicKey;

          // 2.3 verify → JWT
          console.log("🚀 Calling /auth/verify with signature...");
          const verifyRes = await apiCall(`${API_BASE_URL}/auth/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: addr,
              publicKey,
              signature: signature,
              fullMessage: sig.fullMessage ?? sig.message,
            }),
          });

          if (!verifyRes.ok) {
            const errorText = await verifyRes.text();
            console.error("❌ Verify API failed:", verifyRes.status, errorText);
            throw new Error(
              `Verify API failed: ${verifyRes.status} ${errorText}`
            );
          }

          const verify = await verifyRes.json();
          console.log("🔓 Verify response:", verify);

          if (verify?.access_token) {
            console.log("💾 Saving JWT token to localStorage");
            localStorage.setItem("token", verify.access_token);

            // Update authentication state and force UI refresh
            setIsAuthenticated(true);
            window.dispatchEvent(new Event("storage"));

            console.log("✅ Auto sign-in completed successfully");
            console.log(
              "🎉 You are now authenticated! Token saved to localStorage"
            );
          } else {
            console.error("❌ No access token in verify response:", verify);
            throw new Error("No access token received from verify API");
          }

          // Load profile after login
          try {
            console.log("👤 Loading user profile...");
            const meRes = await apiCall(`${API_BASE_URL}/me/overview`);
            const me = await meRes.json();
            console.log("✅ Profile loaded:", me);
            console.log("🎯 Authentication fully completed with profile data");
          } catch (e) {
            console.warn(
              "⚠️ Failed to load profile, but authentication succeeded:",
              e
            );
          }
        } catch (e) {
          console.error("❌ Authentication process failed:", e);
        }
      }
    };

    runSignInFlow();
  }, [connected, account?.address, signMessage]);

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
          <button
            key={w.name}
            onClick={async () => {
              try {
                console.log("🚀 Starting connect flow for wallet:", w.name);

                // Note: Nightly wallet session cannot be cleared automatically
                // We need to handle double signature approach in the auth flow

                // 1) Connect first (Connection request popup)
                console.log("📱 Connecting to wallet...");
                await connect(w.name);
                console.log("✅ Wallet connected successfully");

                // Wait briefly for account state to update
                console.log("⏳ Waiting for account state to update...");
                await new Promise((r) => setTimeout(r, 300));

                // Note: Sign-in flow now runs automatically in useEffect when connected && !token
                // This ensures the signature popup appears every time, even after page refresh
              } catch (e) {
                console.error("❌ Connect & sign-in failed:", e);
              }
            }}
          >
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
          <span>
            Balance: <code>{aptBalance || ""}</code>
          </span>
          <span
            style={{
              color: isAuthenticated ? "green" : "orange",
              fontWeight: "bold",
            }}
          >
            🔐 Auth:{" "}
            {isAuthenticated
              ? (() => {
                  const token = localStorage.getItem("token");
                  return token === "test-token-skip-auth"
                    ? "✅ Test Mode"
                    : "✅ Connected";
                })()
              : "⏳ Authenticating..."}
          </span>
          <button
            onClick={() => {
              const token = localStorage.getItem("token");
              console.log("🔍 Current auth status:", {
                connected: true,
                hasToken: !!token,
                isAuthenticated,
                token: token ? `${token.substring(0, 20)}...` : null,
              });
              alert(
                `Connected: Yes\nAuthenticated: ${isAuthenticated}\nToken: ${
                  token ? "Present" : "None"
                }\n\nActions:\n- Use "Logout" to clear token only\n- Use "Disconnect" to disconnect wallet AND clear token\n${
                  wallet?.name === "Nightly"
                    ? "- Nightly wallet: First signature will fail (normal), wait for second signature request"
                    : ""
                }`
              );
            }}
          >
            Check Status
          </button>

          <button
            onClick={() => {
              if (onNavigateToProfile) {
                onNavigateToProfile();
              } else {
                alert("👤 My Profile\n\nNavigation function not provided.");
              }
            }}
            style={{
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              margin: "0 4px",
            }}
          >
            👤 My Profile
          </button>

          <button
            onClick={() => {
              // Clear authentication token when disconnecting
              localStorage.removeItem("token");
              setIsAuthenticated(false);
              console.log("🔐 Token cleared and auth state reset");
              disconnect();
            }}
          >
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}
