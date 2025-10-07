import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useEffect, useState } from "react";
import { shortAddr } from "./lib.readable";
import { API_BASE_URL, apiCall } from "./api/config";
import { getBalance } from "./lib.aptosClient";
import { Network } from "@aptos-labs/ts-sdk";

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
  const [networkError, setNetworkError] = useState<string>("");

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

  // Auto-switch to Aptos testnet when wallet connects
  useEffect(() => {
    const switchToTestnet = async () => {
      // Only attempt network switch after wallet is connected with account
      if (connected && account?.address && wallet && network?.name !== Network.TESTNET) {
        console.log("🔄 Current network:", network?.name);
        console.log("🎯 Attempting to switch to Aptos Testnet...");

        try {
          // Try to switch network if wallet supports it
          // Note: Different wallets may have different API for network switching
          if (typeof (wallet as any).switchNetwork === 'function') {
            await (wallet as any).switchNetwork(Network.TESTNET);
            console.log("✅ Successfully switched to Aptos Testnet");
          } else {
            console.log("⚠️ Wallet doesn't support network switching");
          }
        } catch (error) {
          console.error("❌ Failed to switch network:", error);
        }
      }
    };

    // Delay the network switch attempt to ensure wallet is fully initialized
    const timer = setTimeout(switchToTestnet, 500);

    return () => clearTimeout(timer);
  }, [connected, account?.address, network?.name, wallet]);

  // Check network after connection and show error if not on testnet
  useEffect(() => {
    // Only check network after wallet is fully connected and has account
    if (connected && account?.address && network) {
      // Add a small delay to ensure network info is updated
      const timer = setTimeout(() => {
        if (network.name !== Network.TESTNET) {
          setNetworkError(`⚠️ Please switch to Aptos Testnet. Current network: ${network.name}`);
          console.warn(`❌ Wallet is on ${network.name}, but this app requires Aptos Testnet`);
        } else {
          setNetworkError("");
          console.log("✅ Wallet is on correct network: Aptos Testnet");
        }
      }, 1000); // Wait 1 second for network info to update

      return () => clearTimeout(timer);
    } else {
      // Clear error when not connected or no account
      setNetworkError("");
    }
  }, [connected, account?.address, network]);

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

        // For Nightly wallet, try single signature approach first
        if (wallet?.name === "Nightly") {
          console.log("🌙 Nightly wallet: Using single signature approach...");

          try {
            console.log("📝 Signature request for Nightly...");
            sig = await signMessage({
              message: ch.messageToSign,
              nonce: ch.nonce,
              address: true,
              application: true,
              chainId: true,
            } as any);

            console.log("✅ Signature received from Nightly");
          } catch (error: any) {
            console.error("❌ Signature failed for Nightly:", error?.message || "Unknown error");

            // Check if it's a user rejection error
            if (error?.message?.includes("User rejected") || error?.message?.includes("cancelled")) {
              console.log("🚫 User rejected the signature request");
              throw new Error("Please try again and approve the wallet popup when it appears.");
            }

            // If it's not a user rejection, try again after a delay
            console.log("⏳ Retrying signature after delay...");
            await new Promise((resolve) => setTimeout(resolve, 2000));

            try {
              sig = await signMessage({
                message: ch.messageToSign,
                nonce: ch.nonce,
                address: true,
                application: true,
                chainId: true,
              } as any);
              console.log("✅ Second signature attempt succeeded");
            } catch (error2: any) {
              console.error("❌ Second signature attempt failed:", error2?.message || "Unknown error");
              throw new Error(
                "Nightly wallet authentication failed: " +
                (error2?.message || "Unknown error")
              );
            }
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
          console.log("🔍 Address from wallet:", addr);
          console.log("🔍 Account address:", account?.address);

          // Handle signature formats for backend (expects object, not string)
          let signature = sig.signature;
          console.log("🔍 Original signature type:", typeof signature);
          console.log("🔍 Original signature value:", signature);

          if (Array.isArray(signature)) {
            console.log("🔧 Converting signature array to object format");
            // Handle nested arrays like [[r], [s]]
            let r, s;
            if (Array.isArray(signature[0]) && Array.isArray(signature[1])) {
              r = signature[0];
              s = signature[1];
            } else {
              r = signature[0];
              s = signature[1];
            }

            signature = { r, s };
            console.log("🔧 Converted to object:", signature);
          } else if (typeof signature === 'string') {
            // If backend expects object but we got string, this might be an issue
            console.log("⚠️ Signature is string but backend expects object");
            // For now, try to use as-is and let backend handle it
            console.log("🔧 Keeping signature as string for backend");
          } else if (typeof signature === 'object' && signature !== null) {
            // Ensure it's a proper object format for backend
            if (signature.r !== undefined && signature.s !== undefined) {
              // Already in correct format
              console.log("✅ Signature already in correct object format");
            } else if (signature.signature) {
              // Some wallets might wrap signature in another object
              signature = signature.signature;
              console.log("🔧 Extracted signature from nested object");
            } else {
              console.log("✅ Signature object format looks correct");
            }
          } else {
            throw new Error(`Unsupported signature format: ${typeof signature}`);
          }

          // Ensure signature is valid
          if (!signature) {
            console.error("❌ Empty signature!");
            throw new Error("Invalid signature received from wallet");
          }

          console.log("🔧 Final signature:", signature);
          console.log("🔧 Signature type:", typeof signature);

          // Debug signature object structure
          console.log("🔍 Signature object keys:", Object.keys(sig));
          console.log("🔍 Signature object:", sig);

          // Get public key - try multiple sources and formats
          let publicKey = sig.publicKey || account?.publicKey;

          // Try to extract public key from signature if not directly available
          if (!publicKey && sig) {
            // Some wallets might store public key differently in signature object
            publicKey = sig.pubKey || sig.public_key || sig.pk;
          }

          // Ensure address has correct format
          let cleanAddress = addr;
          if (cleanAddress && !cleanAddress.startsWith('0x')) {
            cleanAddress = `0x${cleanAddress}`;
            console.log("🔧 Fixed address format:", cleanAddress);
          }

          // Debug public key sources
          console.log("🔑 Public key from sig.publicKey:", sig.publicKey);
          console.log("🔑 Public key from account?.publicKey:", account?.publicKey);
          console.log("🔑 Public key from other sources:", publicKey);
          console.log("🔑 Final public key to use:", publicKey);
          console.log("🔑 Address used:", cleanAddress);

          // Ensure we have both public key and address
          if (!publicKey) {
            console.error("❌ No public key found!");
            console.log("🔍 Available signature data:", Object.keys(sig));
            throw new Error("No public key available for verification");
          }

          if (!cleanAddress) {
            console.error("❌ No address found!");
            throw new Error("No address available for verification");
          }

          // 2.3 verify → JWT
          const requestData = {
            address: cleanAddress || addr,
            publicKey,
            signature: signature,
            fullMessage: sig.fullMessage ?? sig.message,
          };

          console.log("🚀 Calling /auth/verify with data:");
          console.log("  - Address:", requestData.address);
          console.log("  - Public Key:", requestData.publicKey);
          console.log("  - Signature:", requestData.signature);
          console.log("  - Signature Type:", typeof requestData.signature);
          console.log("  - Full Message:", requestData.fullMessage);
          console.log("📦 Complete request data:", JSON.stringify(requestData, null, 2));

          const verifyRes = await apiCall(`${API_BASE_URL}/auth/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
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
        } catch (e: any) {
          console.error("❌ Authentication process failed:", e);

          // Show user-friendly error messages
          if (e.message?.includes("User rejected") || e.message?.includes("cancelled")) {
            console.log("🚫 User cancelled authentication");
            // Show helpful message for user cancellation
            setTimeout(() => {
              alert("🔐 Authentication Cancelled\n\nYou cancelled the wallet signature request. Please try connecting again and approve the signature popup when it appears.");
            }, 1000);
          } else if (e.message?.includes("Please try again and approve")) {
            console.log("🚫 User needs to approve signature");
            setTimeout(() => {
              alert("🔐 Signature Required\n\n" + e.message);
            }, 1000);
          } else {
            console.error("❌ Unexpected authentication error:", e.message);
            setTimeout(() => {
              alert("❌ Authentication Failed\n\nAn unexpected error occurred during authentication. Please try again.");
            }, 1000);
          }
        }
      }
    };

    runSignInFlow();
  }, [connected, account?.address, signMessage]);

  return (
    <div>
      {/* Network Error Alert */}
      {networkError && (
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffeaa7",
            color: "#856404",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          {networkError}
        </div>
      )}

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
              Network: <code>{account?.address && network ? (network.name || "unknown") : "N/A"}</code>
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
                  `Connected: Yes\nAuthenticated: ${isAuthenticated}\nToken: ${token ? "Present" : "None"
                  }\n\nActions:\n- Use "Logout" to clear token only\n- Use "Disconnect" to disconnect wallet AND clear token\n${wallet?.name === "Nightly"
                    ? "- Nightly wallet: First signature will fail (normal), wait for second signature request"
                    : ""
                  }`
                );
              }}
            >
              Check Status
            </button>

            {networkError && (
              <button
                onClick={async () => {
                  if (wallet && typeof (wallet as any).switchNetwork === 'function') {
                    try {
                      await (wallet as any).switchNetwork(Network.TESTNET);
                      setNetworkError("");
                      console.log("✅ Manual network switch attempted");
                    } catch (error) {
                      console.error("❌ Manual network switch failed:", error);
                      alert("Failed to switch network. Please switch manually in your wallet.");
                    }
                  } else {
                    alert("Please switch to Aptos Testnet manually in your wallet settings.");
                  }
                }}
                style={{
                  backgroundColor: "#ffc107",
                  color: "#212529",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  margin: "0 4px",
                  fontSize: "12px",
                }}
                title="Try switching to Aptos Testnet"
              >
                🔄 Switch to Testnet
              </button>
            )}

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
    </div>
  );
}
