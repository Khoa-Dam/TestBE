import React, { useEffect, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { createCompleteDraft, type Draft } from "./api";

interface CreateCollectionProps {
  onDraftCreated: (draft: Draft) => void;
}

export default function CreateCollection({
  onDraftCreated,
}: CreateCollectionProps) {
  const { account, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    adminAddr: "",
    name: "",
    desc: "",
    maxSupply: "100",
    perWalletCap: "5",
    presalePrice: "100000000", // 1 APT in octas
    publicPrice: "150000000", // 1.5 APT
    treasury: "",
    assetMetadataAddr: "0x1::aptos_coin::AptosCoin", // APT token
    presaleStart: "",
    publicStart: "",
    saleEnd: "",
    // Phase Management
    setPhaseManual: false, // Disable manual phase control by default
    phaseManual: "0", // PHASE_CLOSED by default
    freezeAfter: false, // Don't freeze by default
  });

  // Sync adminAddr to connected wallet address when available
  useEffect(() => {
    if (connected && account?.address) {
      setFormData((prev) => ({ ...prev, adminAddr: account.address }));
    }
  }, [connected, account]);

  const [files, setFiles] = useState({
    banner: null as File | null,
    images: [] as File[],
    manifest: null as File | null,
  });

  // Collection mode state
  const [collectionMode, setCollectionMode] = useState<"manual" | "manifest">(
    "manual"
  );

  // Manifest preview state
  const [manifestPreview, setManifestPreview] = useState<{
    totalNFTs?: number;
    hasError?: boolean;
    errorMessage?: string;
  } | null>(null);

  const [splits, setSplits] = useState([{ to: "", bps: 0 }]);

  const [allowlist, setAllowlist] = useState([""]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: newValue };

      // Auto-configure when setPhaseManual is enabled
      if (name === "setPhaseManual" && newValue === true) {
        updated.phaseManual = "2"; // Set to PUBLIC sale
        updated.freezeAfter = true; // Enable freeze to respect timestamps
      }
      // Reset when setPhaseManual is disabled
      else if (name === "setPhaseManual" && newValue === false) {
        updated.phaseManual = "0"; // Reset to CLOSED
        updated.freezeAfter = false; // Disable freeze
      }

      return updated;
    });
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "banner" | "images" | "manifest"
  ) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    if (type === "images") {
      setFiles((prev) => ({
        ...prev,
        images: Array.from(selectedFiles),
      }));
    } else {
      setFiles((prev) => ({
        ...prev,
        [type]: selectedFiles[0],
      }));
    }

    // Auto-detect mode when manifest is uploaded
    if (type === "manifest" && selectedFiles[0]) {
      setCollectionMode("manifest");
      // Preview manifest content
      previewManifestFile(selectedFiles[0]);
    } else if (type === "manifest" && !selectedFiles[0]) {
      setCollectionMode("manual");
      setManifestPreview(null);
    }
  };

  const previewManifestFile = async (file: File) => {
    try {
      const text = await file.text();
      const manifest = JSON.parse(text);

      // Try to extract total NFTs from manifest
      let totalNFTs = 0;
      if (Array.isArray(manifest)) {
        totalNFTs = manifest.length;
      } else if (manifest.nfts && Array.isArray(manifest.nfts)) {
        totalNFTs = manifest.nfts.length;
      } else if (manifest.count) {
        totalNFTs = manifest.count;
      }

      setManifestPreview({
        totalNFTs,
        hasError: false,
      });
    } catch (error) {
      setManifestPreview({
        hasError: true,
        errorMessage: `Invalid JSON: ${(error as Error).message}`,
      });
    }
  };

  const addSplit = () => {
    setSplits((prev) => [...prev, { to: "", bps: 0 }]);
  };

  const updateSplit = (
    index: number,
    field: "to" | "bps",
    value: string | number
  ) => {
    setSplits((prev) =>
      prev.map((split, i) =>
        i === index ? { ...split, [field]: value } : split
      )
    );
  };

  const addAllowlistAddress = () => {
    setAllowlist((prev) => [...prev, ""]);
  };

  const updateAllowlist = (index: number, value: string) => {
    setAllowlist((prev) => prev.map((addr, i) => (i === index ? value : addr)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation based on mode
    if (collectionMode === "manifest") {
      if (!files.manifest) {
        alert("❌ Manifest file is required when using Manifest Mode!");
        return;
      }

      if (manifestPreview?.hasError) {
        alert(`❌ Invalid manifest file: ${manifestPreview.errorMessage}`);
        return;
      }

      if (!manifestPreview?.totalNFTs || manifestPreview.totalNFTs <= 0) {
        alert("❌ Manifest file must contain at least 1 NFT!");
        return;
      }
    }

    if (
      collectionMode === "manual" &&
      (!formData.maxSupply || parseInt(formData.maxSupply) <= 0)
    ) {
      alert("❌ Max Supply must be greater than 0 in Manual Mode!");
      return;
    }

    // (No special non-manifest validation — Manual mode covers non-manifest workflows)

    setLoading(true);

    try {
      console.log("📋 FormData before submission:");
      console.log("🔧 Form Data Object:", formData);
      console.log("📁 Files:", files);
      console.log("💰 Splits:", splits);
      console.log("📜 Allowlist:", allowlist);

      const submitData = new FormData();

      // Required fields
      submitData.append("adminAddr", formData.adminAddr);
      submitData.append("name", formData.name);
      submitData.append("desc", formData.desc);

      // Pricing
      submitData.append(
        "prices",
        JSON.stringify({
          presale: formData.presalePrice,
          public: formData.publicPrice,
        })
      );

      // Supply config - different handling based on mode
      // Submit collection mode (manual or manifest)
      submitData.append("collectionMode", collectionMode);

      if (collectionMode === "manual") {
        submitData.append("maxSupply", formData.maxSupply);
      } else {
        // In manifest mode, max supply will be calculated from manifest by backend
        submitData.append("maxSupply", "0"); // Placeholder, will be overridden by backend
      }
      submitData.append("perWalletCap", formData.perWalletCap);

      // Schedule (convert to unix timestamp)
      if (formData.presaleStart) {
        submitData.append(
          "presaleStart",
          Math.floor(
            new Date(formData.presaleStart).getTime() / 1000
          ).toString()
        );
      }
      if (formData.publicStart) {
        submitData.append(
          "publicStart",
          Math.floor(new Date(formData.publicStart).getTime() / 1000).toString()
        );
      }
      if (formData.saleEnd) {
        submitData.append(
          "saleEnd",
          Math.floor(new Date(formData.saleEnd).getTime() / 1000).toString()
        );
      }

      // Payment config
      submitData.append("treasury", formData.treasury || formData.adminAddr);
      submitData.append("assetMetadataAddr", formData.assetMetadataAddr);

      // Splits (filter empty)
      const validSplits = splits.filter((split) => split.to && split.bps > 0);
      if (validSplits.length > 0) {
        submitData.append("splits", JSON.stringify(validSplits));
      }

      // Allowlist (filter empty)
      const validAllowlist = allowlist.filter((addr) => addr.trim());
      if (validAllowlist.length > 0) {
        submitData.append("allowlist", JSON.stringify(validAllowlist));
      }

      // Phase Management
      submitData.append("setPhaseManual", formData.setPhaseManual.toString());
      submitData.append("phaseManual", formData.phaseManual);
      submitData.append("freezeAfter", formData.freezeAfter.toString());

      console.log("🎛️ Phase Management values being sent:");
      console.log(
        `   setPhaseManual: ${
          formData.setPhaseManual
        } (${typeof formData.setPhaseManual})`
      );
      console.log(
        `   phaseManual: ${
          formData.phaseManual
        } (${typeof formData.phaseManual})`
      );
      console.log(
        `   freezeAfter: ${
          formData.freezeAfter
        } (${typeof formData.freezeAfter})`
      );

      // Files
      if (files.banner) {
        submitData.append("banner", files.banner);
      }

      files.images.forEach((image) => {
        submitData.append("images", image);
      });

      if (files.manifest) {
        submitData.append("manifest", files.manifest);
      }

      // Log FormData contents before sending
      console.log("📤 Complete FormData being sent to backend:");
      for (const [key, value] of submitData.entries()) {
        if (value instanceof File) {
          console.log(`   ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`   ${key}: ${value}`);
        }
      }

      console.log("🚀 Calling createCompleteDraft API...");
      const draft = await createCompleteDraft(submitData);
      onDraftCreated(draft);
    } catch (error) {
      console.error("Create draft error:", error);
      alert("Error creating draft: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h2>🚀 Create NFT Collection</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        {/* Collection Mode Selection */}
        <section
          style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}
        >
          <h3>🎯 Collection Mode</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: "bold",
                }}
              >
                Choose Collection Type:
              </label>
              <div style={{ display: "flex", gap: 16 }}>
                <label
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="radio"
                    name="collectionMode"
                    value="manual"
                    checked={collectionMode === "manual"}
                    onChange={(e) =>
                      setCollectionMode(e.target.value as "manual" | "manifest")
                    }
                  />
                  📝 Manual Supply (Enter max supply manually)
                </label>
                <label
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="radio"
                    name="collectionMode"
                    value="manifest"
                    checked={collectionMode === "manifest"}
                    onChange={(e) =>
                      setCollectionMode(e.target.value as "manual" | "manifest")
                    }
                  />
                  📋 Manifest Mode (Max supply calculated from manifest)
                </label>
              </div>
            </div>

            {collectionMode === "manual" && (
              <div
                style={{
                  padding: 12,
                  background: "#e7f3ff",
                  borderRadius: 6,
                  borderLeft: "4px solid #007bff",
                }}
              >
                <strong>📝 Manual Mode:</strong> You will enter the max supply
                manually. Make sure your NFT images match this number.
              </div>
            )}

            {collectionMode === "manifest" && (
              <div
                style={{
                  padding: 12,
                  background: "#fff3cd",
                  borderRadius: 6,
                  borderLeft: "4px solid #ffc107",
                }}
              >
                <strong>📋 Manifest Mode:</strong> Max supply will be
                automatically calculated from your manifest.json file.
                {files.manifest && (
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        fontSize: "0.9em",
                        color: "#856404",
                        marginBottom: 8,
                      }}
                    >
                      ✅ Manifest uploaded: {files.manifest.name}
                    </div>
                    {manifestPreview && (
                      <div style={{ fontSize: "0.9em" }}>
                        {manifestPreview.hasError ? (
                          <div style={{ color: "#dc3545" }}>
                            ❌ {manifestPreview.errorMessage}
                          </div>
                        ) : manifestPreview.totalNFTs ? (
                          <div style={{ color: "#28a745", fontWeight: "bold" }}>
                            📊 Expected NFTs: {manifestPreview.totalNFTs}
                          </div>
                        ) : (
                          <div style={{ color: "#6c757d" }}>
                            📊 Reading manifest...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!files.manifest && (
                  <div
                    style={{
                      fontSize: "0.9em",
                      color: "#856404",
                      marginTop: 8,
                    }}
                  >
                    ⚠️ Please upload a manifest.json file to see the NFT count
                  </div>
                )}
              </div>
            )}

            {/* No special Non-Manifest panel - Manual mode covers non-manifest workflows */}
          </div>
        </section>

        {/* Basic Info */}
        <section
          style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}
        >
          <h3>📝 Basic Information</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                name="adminAddr"
                placeholder="Admin Address (0x...)"
                value={formData.adminAddr}
                onChange={handleInputChange}
                required
                readOnly={connected}
                style={connected ? { background: "#f8f9fa" } : {}}
              />
              {!connected && (
                <button
                  type="button"
                  onClick={() => {
                    // Try to set adminAddr from wallet if available
                    if (account?.address) {
                      setFormData((prev) => ({
                        ...prev,
                        adminAddr: account.address,
                      }));
                    } else {
                      alert("No wallet connected");
                    }
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    background: "#fff",
                  }}
                >
                  Use Connected Wallet
                </button>
              )}
            </div>
            {connected && account?.address && (
              <div style={{ fontSize: "12px", color: "#6c757d" }}>
                Using connected wallet: {account.address}
              </div>
            )}
            <input
              name="name"
              placeholder="Collection Name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <textarea
              name="desc"
              placeholder="Collection Description"
              value={formData.desc}
              onChange={handleInputChange}
              required
              rows={3}
            />
          </div>
        </section>

        {/* Supply & Pricing */}
        <section
          style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}
        >
          <h3>💰 Supply & Pricing</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {/* Max Supply - Conditional based on mode */}
            <div style={{ display: "grid", gap: 8 }}>
              {collectionMode === "manual" ? (
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontWeight: "bold",
                    }}
                  >
                    Max Supply: *
                  </label>
                  <input
                    name="maxSupply"
                    placeholder="Enter max supply (e.g., 1000)"
                    type="number"
                    value={formData.maxSupply}
                    onChange={handleInputChange}
                    required
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      borderRadius: 4,
                    }}
                  />
                  <small style={{ color: "#666", fontSize: "0.85em" }}>
                    💡 Enter the total number of NFTs you want to create
                  </small>
                </div>
              ) : (
                <div
                  style={{
                    padding: 12,
                    background: "#f8f9fa",
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <strong>📊 Max Supply (Auto-calculated)</strong>
                  </div>
                  <div
                    style={{
                      fontSize: "0.9em",
                      color: "#666",
                      marginBottom: 8,
                    }}
                  >
                    {files.manifest ? (
                      <span>
                        ✅ Will be calculated from manifest.json when submitted
                      </span>
                    ) : (
                      <span>⚠️ Please upload a manifest.json file first</span>
                    )}
                  </div>
                  <input
                    name="maxSupply"
                    type="text"
                    value="Auto-calculated from manifest"
                    disabled
                    style={{
                      padding: 8,
                      background: "#e9ecef",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      color: "#6c757d",
                      width: "100%",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Other pricing fields */}
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontWeight: "bold",
                  }}
                >
                  Per Wallet Cap:
                </label>
                <input
                  name="perWalletCap"
                  placeholder="Max NFTs per wallet"
                  type="number"
                  value={formData.perWalletCap}
                  onChange={handleInputChange}
                  style={{
                    padding: 8,
                    border: "1px solid #ccc",
                    borderRadius: 4,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontWeight: "bold",
                  }}
                >
                  Presale Price (APT):
                </label>
                <input
                  name="presalePrice"
                  placeholder="Presale price in APT"
                  type="number"
                  step="0.00000001"
                  value={formData.presalePrice}
                  onChange={handleInputChange}
                  style={{
                    padding: 8,
                    border: "1px solid #ccc",
                    borderRadius: 4,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 4,
                    fontWeight: "bold",
                  }}
                >
                  Public Price (APT):
                </label>
                <input
                  name="publicPrice"
                  placeholder="Public price in APT"
                  type="number"
                  step="0.00000001"
                  value={formData.publicPrice}
                  onChange={handleInputChange}
                  style={{
                    padding: 8,
                    border: "1px solid #ccc",
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Payment Config */}
        <section
          style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}
        >
          <h3>💳 Payment Configuration</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              name="treasury"
              placeholder="Treasury Address (default: admin)"
              value={formData.treasury}
              onChange={handleInputChange}
            />
            <input
              name="assetMetadataAddr"
              placeholder="Asset Metadata Address"
              value={formData.assetMetadataAddr}
              onChange={handleInputChange}
            />
          </div>
        </section>

        {/* Schedule */}
        <section
          style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}
        >
          <h3>⏰ Sale Schedule</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              Presale Start:
              <input
                name="presaleStart"
                type="datetime-local"
                value={formData.presaleStart}
                onChange={handleInputChange}
              />
            </label>
            <label>
              Public Start:
              <input
                name="publicStart"
                type="datetime-local"
                value={formData.publicStart}
                onChange={handleInputChange}
              />
            </label>
            <label>
              Sale End:
              <input
                name="saleEnd"
                type="datetime-local"
                value={formData.saleEnd}
                onChange={handleInputChange}
              />
            </label>
          </div>
        </section>

        {/* Phase Management */}
        <section
          style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}
        >
          <h3>🎛️ Phase Management</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                name="setPhaseManual"
                checked={formData.setPhaseManual}
                onChange={handleInputChange}
              />
              Set Phase Manually (Override schedule-based phase)
            </label>

            {formData.setPhaseManual && (
              <label>
                Manual Phase:
                <select
                  name="phaseManual"
                  value={formData.phaseManual}
                  onChange={handleInputChange}
                  style={{ padding: 8, marginLeft: 8 }}
                >
                  <option value="0">🔒 Closed</option>
                  <option value="1">🎯 Presale</option>
                  <option value="2">🌍 Public Sale</option>
                </select>
              </label>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                name="freezeAfter"
                checked={formData.freezeAfter}
                onChange={handleInputChange}
              />
              Freeze Schedule After Configuration (Use time-based phases)
            </label>

            <small style={{ color: "#666", fontSize: "0.9em" }}>
              💡 <strong>Tip:</strong>
              <br />• <strong>Set Phase Manually</strong>: Force specific phase
              regardless of time
              <br />• <strong>Freeze Schedule</strong>: Lock configuration and
              use automatic time-based phases
              <br />• If both unchecked: Phase stays manually controllable
            </small>
          </div>
        </section>

        {/* Fee Splits */}
        <section
          style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}
        >
          <h3>📊 Fee Splits (Optional)</h3>
          {splits.map((split, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "2fr 1fr auto",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <input
                placeholder="Address (0x...)"
                value={split.to}
                onChange={(e) => updateSplit(index, "to", e.target.value)}
              />
              <input
                placeholder="BPS (500 = 5%)"
                type="number"
                value={split.bps}
                onChange={(e) =>
                  updateSplit(index, "bps", parseInt(e.target.value) || 0)
                }
              />
              <button
                type="button"
                onClick={() =>
                  setSplits((prev) => prev.filter((_, i) => i !== index))
                }
              >
                ❌
              </button>
            </div>
          ))}
          <button type="button" onClick={addSplit}>
            + Add Split
          </button>
        </section>

        {/* Allowlist */}
        <section
          style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}
        >
          <h3>✅ Allowlist (Optional)</h3>
          {allowlist.map((addr, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <input
                placeholder="Allowlisted Address (0x...)"
                value={addr}
                onChange={(e) => updateAllowlist(index, e.target.value)}
              />
              <button
                type="button"
                onClick={() =>
                  setAllowlist((prev) => prev.filter((_, i) => i !== index))
                }
              >
                ❌
              </button>
            </div>
          ))}
          <button type="button" onClick={addAllowlistAddress}>
            + Add Address
          </button>
        </section>

        {/* Files */}
        <section
          style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}
        >
          <h3>📁 Files</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              Banner Image:
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "banner")}
              />
            </label>
            <label>
              NFT Images:
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(e, "images")}
              />
              <small>Selected: {files.images.length} files</small>
            </label>
            {collectionMode === "manifest" && (
              <label>
                Manifest JSON:
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileChange(e, "manifest")}
                />
              </label>
            )}
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 24px",
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading
            ? "⏳ Creating Draft..."
            : collectionMode === "manifest"
            ? "🚀 Create Manifest Collection"
            : "🚀 Create Manual Collection"}
        </button>
      </form>
    </div>
  );
}
