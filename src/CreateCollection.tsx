import React, { useState } from "react";
import { createCompleteDraft, type Draft } from "./api";

interface CreateCollectionProps {
  onDraftCreated: (draft: Draft) => void;
}

export default function CreateCollection({
  onDraftCreated,
}: CreateCollectionProps) {
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

  const [files, setFiles] = useState({
    banner: null as File | null,
    images: [] as File[],
    manifest: null as File | null,
  });

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

      // Supply config
      submitData.append("maxSupply", formData.maxSupply);
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
        {/* Basic Info */}
        <section
          style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}
        >
          <h3>📝 Basic Information</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              name="adminAddr"
              placeholder="Admin Address (0x...)"
              value={formData.adminAddr}
              onChange={handleInputChange}
              required
            />
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
          <div
            style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}
          >
            <input
              name="maxSupply"
              placeholder="Max Supply"
              type="number"
              value={formData.maxSupply}
              onChange={handleInputChange}
            />
            <input
              name="perWalletCap"
              placeholder="Per Wallet Cap"
              type="number"
              value={formData.perWalletCap}
              onChange={handleInputChange}
            />
            <input
              name="presalePrice"
              placeholder="Presale Price (octas)"
              value={formData.presalePrice}
              onChange={handleInputChange}
            />
            <input
              name="publicPrice"
              placeholder="Public Price (octas)"
              value={formData.publicPrice}
              onChange={handleInputChange}
            />
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
            <label>
              Manifest JSON:
              <input
                type="file"
                accept=".json"
                onChange={(e) => handleFileChange(e, "manifest")}
              />
            </label>
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
          {loading ? "⏳ Creating Draft..." : "🚀 Create Collection Draft"}
        </button>
      </form>
    </div>
  );
}
