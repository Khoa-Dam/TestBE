# Frontend API Guide: Buy NFT

## 🎯 Quick Start

Để mua NFT, bạn cần gọi 2 APIs theo thứ tự:

1. **Prepare Buy Transaction** → Get transaction to sign
2. **Confirm Transaction** → Update database after signing

---

## 📡 API 1: Prepare Buy Transaction

### **Endpoint**
```
POST /nft/:nftId/buy
```

### **Request**

#### **Headers**
```javascript
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

#### **URL Params**
```
nftId: "67890abcdef1234567890abc"  // MongoDB NFT ID
```

#### **Body**
```json
{}
```
**Note:** Body rỗng! Buyer address tự động lấy từ JWT token.

---

### **Response - Success**

```json
{
  "success": true,
  "transactionMeta": {
    "function": "0x1a2b3c4d5e6f7890abcdef1234567890::vendor_list::buy_listing",
    "typeArguments": [],
    "functionArguments": [
      "0xabc123def456789...escrow",
      "0x456789abc123def...token"
    ]
  },
  "trackingId": "buy_67890abcdef1234567890abc_1728294567890",
  "instructions": {
    "message": "Transaction prepared for buy. Sign and submit to complete.",
    "nextStep": "POST /transactions/{trackingId}/confirm with transaction hash after signing",
    "cancelStep": "POST /transactions/{trackingId}/cancel if you don't want to proceed"
  },
  "purchaseInfo": {
    "tokenAddr": "0x456789abc123def456789abc123def456789abc123def456789abc123def4567",
    "buyer": "0x789abc123def456789abc123def456789abc123def456789abc123def456789a",
    "seller": "0xdef456789abc123def456789abc123def456789abc123def456789abc123def4",
    "price": "1000000000",
    "feeEstimate": {
      "totalPrice": "1000000000",
      "fees": [
        {
          "recipient": "0x111222333444555666777888999aaabbbcccdddeeefff000111222333444",
          "amount": "25000000",
          "bps": 250,
          "percentage": "2.5%"
        },
        {
          "recipient": "0x222333444555666777888999aaabbbcccdddeeefff000111222333444555",
          "amount": "50000000",
          "bps": 500,
          "percentage": "5%"
        }
      ],
      "totalFees": "75000000",
      "sellerReceives": "925000000"
    }
  }
}
```

#### **Response Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` if transaction prepared successfully |
| `transactionMeta` | object | Transaction payload to sign with wallet |
| `transactionMeta.function` | string | Smart contract function to call |
| `transactionMeta.typeArguments` | array | Type arguments (usually empty) |
| `transactionMeta.functionArguments` | array | Function arguments [escrowAddr, tokenAddr] |
| `trackingId` | string | Use this to confirm transaction |
| `purchaseInfo` | object | Purchase details |
| `purchaseInfo.price` | string | NFT price in octas (1 APT = 100,000,000 octas) |
| `purchaseInfo.buyer` | string | Buyer wallet address |
| `purchaseInfo.seller` | string | Seller wallet address |
| `purchaseInfo.feeEstimate.totalFees` | string | Total fees in octas |
| `purchaseInfo.feeEstimate.sellerReceives` | string | Amount seller receives in octas |

---

## 📡 API 1: Prepare Buy Transaction

### **Endpoint**
```
POST /nft/:nftId/buy
```

### **Request**

#### **Headers**
```javascript
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

#### **URL Params**
```
nftId: "67890abcdef1234567890abc"  // MongoDB NFT ID
```

#### **Body**
```json
{}
```
**Note:** Body rỗng! Buyer address tự động lấy từ JWT token.

---

### **Response - Success**

```json
{
  "success": true,
  "transactionMeta": {
    "function": "0x1a2b3c4d5e6f7890abcdef1234567890::vendor_list::buy_listing",
    "typeArguments": [],
    "functionArguments": [
      "0xabc123def456789...escrow",
      "0x456789abc123def...token"
    ]
  },
  "trackingId": "buy_67890abcdef1234567890abc_1728294567890",
  "instructions": {
    "message": "Transaction prepared for buy. Sign and submit to complete.",
    "nextStep": "POST /transactions/{trackingId}/confirm with transaction hash after signing",
    "cancelStep": "POST /transactions/{trackingId}/cancel if you don't want to proceed"
  },
  "purchaseInfo": {
    "tokenAddr": "0x456789abc123def456789abc123def456789abc123def456789abc123def4567",
    "buyer": "0x789abc123def456789abc123def456789abc123def456789abc123def456789a",
    "seller": "0xdef456789abc123def456789abc123def456789abc123def456789abc123def4",
    "price": "1000000000",
    "feeEstimate": {
      "totalPrice": "1000000000",
      "fees": [
        {
          "recipient": "0x111222333444555666777888999aaabbbcccdddeeefff000111222333444",
          "amount": "25000000",
          "bps": 250,
          "percentage": "2.5%"
        },
        {
          "recipient": "0x222333444555666777888999aaabbbcccdddeeefff000111222333444555",
          "amount": "50000000",
          "bps": 500,
          "percentage": "5%"
        }
      ],
      "totalFees": "75000000",
      "sellerReceives": "925000000"
    }
  }
}
```

#### **Response Fields Explained:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` if transaction prepared successfully |
| `transactionMeta` | object | Transaction payload to sign with wallet |
| `transactionMeta.function` | string | Smart contract function to call |
| `transactionMeta.typeArguments` | array | Type arguments (usually empty) |
| `transactionMeta.functionArguments` | array | Function arguments [escrowAddr, tokenAddr] |
| `trackingId` | string | Use this to confirm transaction |
| `purchaseInfo` | object | Purchase details |
| `purchaseInfo.price` | string | NFT price in octas (1 APT = 100,000,000 octas) |
| `purchaseInfo.buyer` | string | Buyer wallet address |
| `purchaseInfo.seller` | string | Seller wallet address |
| `purchaseInfo.feeEstimate.totalFees` | string | Total fees in octas |
| `purchaseInfo.feeEstimate.sellerReceives` | string | Amount seller receives in octas |

---

### **Response - Errors**

#### **NFT Not Found**
```json
{
  "success": false,
  "error": "NFT not found"
}
```

#### **NFT Not Listed**
```json
{
  "success": false,
  "error": "This NFT is not currently listed for sale"
}
```

#### **Cannot Buy Own NFT**
```json
{
  "success": false,
  "error": "You cannot buy your own NFT"
}
```

#### **Unauthorized (401)**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## 📡 API 2: Confirm Transaction

### **Endpoint**
```
POST /transactions/:trackingId/confirm
```

### **Request**

#### **Headers**
```javascript
{
  "Content-Type": "application/json"
}
```
**Note:** Không cần Authorization header!

#### **URL Params**
```
trackingId: "buy_67890abcdef1234567890abc_1728294567890"  // From API 1 response
```

#### **Body**
```json
{
  "transactionHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "blockNumber": 12345678,
  "gasUsed": 500
}
```

#### **Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transactionHash` | string | ✅ Yes | Transaction hash from wallet after signing |
| `blockNumber` | number | ✅ Yes | Block number/version from blockchain |
| `gasUsed` | number | ✅ Yes | Gas used (can estimate ~500 if not available) |

---

### **Response - Success**

```json
{
  "success": true,
  "message": "Transaction confirmed",
  "transaction": {
    "trackingId": "buy_67890abcdef1234567890abc_1728294567890",
    "transactionType": "buy",
    "entityId": "67890abcdef1234567890abc",
    "entityType": "nft",
    "userAddress": "0x789abc123def456789abc123def456789abc123def456789abc123def456789a",
    "status": "confirmed",
    "transactionHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "blockNumber": 12345678,
    "gasUsed": 500,
    "confirmedAt": "2025-10-07T10:30:15.000Z"
  }
}
```

---

### **Response - Errors**

#### **Transaction Not Found**
```json
{
  "success": false,
  "error": "Transaction not found"
}
```

#### **Already Confirmed**
```json
{
  "success": false,
  "error": "Transaction already confirmed"
}
```

---

## 💻 Frontend Implementation

### **React + TypeScript Example**

```typescript
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useState } from 'react';

interface BuyNFTButtonProps {
  nftId: string;
  price: number; // in octas
  onSuccess?: () => void;
}

function BuyNFTButton({ nftId, price, onSuccess }: BuyNFTButtonProps) {
  const { signAndSubmitTransaction, account } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    if (!account) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Prepare buy transaction
      const jwtToken = localStorage.getItem('jwtToken');

      const prepareRes = await fetch(`${API_BASE_URL}/nft/${nftId}/buy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
      });

      const prepareData = await prepareRes.json();

      if (!prepareData.success) {
        throw new Error(prepareData.error);
      }

      console.log('✅ Transaction prepared');
      console.log('Price:', prepareData.purchaseInfo.price);
      console.log('Fees:', prepareData.purchaseInfo.feeEstimate.totalFees);

      // Step 2: Sign transaction with wallet
      const txResult = await signAndSubmitTransaction({
        type: 'entry_function_payload',
        function: prepareData.transactionMeta.function,
        type_arguments: prepareData.transactionMeta.typeArguments,
        arguments: prepareData.transactionMeta.functionArguments,
      });

      console.log('✅ Transaction signed:', txResult.hash);

      // Step 3: Confirm transaction
      const confirmRes = await fetch(
        `${API_BASE_URL}/transactions/${prepareData.trackingId}/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactionHash: txResult.hash,
            blockNumber: txResult.version || 0,
            gasUsed: txResult.gas_used || 500,
          }),
        }
      );

      const confirmData = await confirmRes.json();

      if (confirmData.success) {
        console.log('✅ NFT purchased successfully!');
        onSuccess?.();
      } else {
        throw new Error(confirmData.error);
      }

    } catch (err: any) {
      console.error('❌ Buy failed:', err);
      setError(err.message || 'Failed to buy NFT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleBuy}
        disabled={loading || !account}
        className="buy-button"
      >
        {loading ? 'Processing...' : `Buy for ${price / 100000000} APT`}
      </button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default BuyNFTButton;
```

---

### **JavaScript/Fetch Example**

```javascript
async function buyNFT(nftId) {
  const jwtToken = localStorage.getItem('jwtToken');

  try {
    // 1. Prepare transaction
    const prepareRes = await fetch(`/nft/${nftId}/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
    });

    const prepareData = await prepareRes.json();

    if (!prepareData.success) {
      throw new Error(prepareData.error);
    }

    // Show confirmation dialog
    const priceInAPT = prepareData.purchaseInfo.price / 100000000;
    const feesInAPT = prepareData.purchaseInfo.feeEstimate.totalFees / 100000000;

    const confirmed = confirm(
      `Buy this NFT?\n\n` +
      `Price: ${priceInAPT} APT\n` +
      `Fees: ${feesInAPT} APT\n` +
      `Total: ${priceInAPT} APT`
    );

    if (!confirmed) return;

    // 2. Sign transaction
    const txResult = await window.aptos.signAndSubmitTransaction({
      type: 'entry_function_payload',
      function: prepareData.transactionMeta.function,
      type_arguments: prepareData.transactionMeta.typeArguments,
      arguments: prepareData.transactionMeta.functionArguments,
    });

    console.log('Transaction signed:', txResult.hash);

    // 3. Confirm transaction
    const confirmRes = await fetch(
      `/transactions/${prepareData.trackingId}/confirm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionHash: txResult.hash,
          blockNumber: txResult.version || 0,
          gasUsed: txResult.gas_used || 500,
        }),
      }
    );

    const confirmData = await confirmRes.json();

    if (confirmData.success) {
      alert('NFT purchased successfully! 🎉');
      window.location.href = '/my-nfts';
    } else {
      throw new Error(confirmData.error);
    }

  } catch (error) {
    console.error('Buy failed:', error);
    alert(`Failed to buy NFT: ${error.message}`);
  }
}
```

---

### **Axios Example**

```javascript
import axios from 'axios';

async function buyNFT(nftId) {
  const jwtToken = localStorage.getItem('jwtToken');

  try {
    // 1. Prepare
    const { data: prepareData } = await axios.post(
      `/nft/${nftId}/buy`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
      }
    );

    if (!prepareData.success) {
      throw new Error(prepareData.error);
    }

    // 2. Sign
    const txResult = await window.aptos.signAndSubmitTransaction({
      type: 'entry_function_payload',
      function: prepareData.transactionMeta.function,
      type_arguments: prepareData.transactionMeta.typeArguments,
      arguments: prepareData.transactionMeta.functionArguments,
    });

    // 3. Confirm
    const { data: confirmData } = await axios.post(
      `/transactions/${prepareData.trackingId}/confirm`,
      {
        transactionHash: txResult.hash,
        blockNumber: txResult.version || 0,
        gasUsed: txResult.gas_used || 500,
      }
    );

    if (confirmData.success) {
      return confirmData;
    } else {
      throw new Error(confirmData.error);
    }

  } catch (error) {
    console.error('Buy failed:', error);
    throw error;
  }
}
```

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    BUY NFT COMPLETE FLOW                    │
└─────────────────────────────────────────────────────────────┘

1. User clicks "Buy NFT" button
   │
   ▼
2. Frontend calls: POST /nft/:nftId/buy
   │ Headers: Authorization: Bearer {JWT}
   │ Body: {}
   │
   ▼
3. Backend returns:
   │ - transactionMeta (to sign)
   │ - trackingId (to confirm)
   │ - purchaseInfo (price, fees)
   │
   ▼
4. Frontend shows confirmation dialog
   │ "Buy for 10 APT (0.75 APT fees)?"
   │
   ▼
5. User confirms
   │
   ▼
6. Frontend signs with wallet SDK
   │ window.aptos.signAndSubmitTransaction(transactionMeta)
   │
   ▼
7. Wallet returns:
   │ - hash
   │ - version (blockNumber)
   │ - gas_used
   │
   ▼
8. Frontend calls: POST /transactions/:trackingId/confirm
   │ Body: { transactionHash, blockNumber, gasUsed }
   │
   ▼
9. Backend updates database:
   │ - NFT ownership → buyer
   │ - is_listed → false
   │ - Add "buy" to history
   │
   ▼
10. Backend returns: { success: true }
    │
    ▼
11. Frontend shows success message
    │ Redirect to /my-nfts
```

---

## 🧪 Testing with cURL

### **Step 1: Buy**
```bash
curl -X POST 'http://localhost:3000/nft/67890abcdef1234567890abc/buy' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

### **Step 2: Confirm**
```bash
curl -X POST 'http://localhost:3000/transactions/buy_67890abcdef1234567890abc_1728294567890/confirm' \
  -H 'Content-Type: application/json' \
  -d '{
    "transactionHash": "0x1234567890abcdef...",
    "blockNumber": 12345678,
    "gasUsed": 500
  }'
```

---

## 📝 Important Notes

### **Price Conversion**
```javascript
// Backend sends price in octas
const priceInOctas = "1000000000";

// Convert to APT for display
const priceInAPT = parseInt(priceInOctas) / 100000000;
// Result: 10 APT
```

### **Error Handling**
```javascript
try {
  // API calls
} catch (error) {
  if (error.response?.status === 401) {
    // JWT expired, redirect to login
    window.location.href = '/login';
  } else if (error.message.includes('not listed')) {
    // NFT not available
    alert('This NFT is no longer available');
  } else {
    // Other errors
    alert(`Error: ${error.message}`);
  }
}
```

### **Loading States**
```javascript
// Show loading during all 3 steps:
setLoading(true);
try {
  await prepare();   // Step 1
  await sign();      // Step 2
  await confirm();   // Step 3
} finally {
  setLoading(false);
}
```

---

## ✅ Checklist for FE Implementation

- [ ] Get JWT token from login/auth
- [ ] Call POST `/nft/:nftId/buy` with JWT
- [ ] Check `response.success` before proceeding
- [ ] Display price and fees to user
- [ ] Get user confirmation
- [ ] Sign transaction with wallet SDK
- [ ] Call POST `/transactions/:trackingId/confirm`
- [ ] Handle errors gracefully
- [ ] Show success message
- [ ] Redirect or refresh NFT list

---

## 🆘 Common Issues

### **Issue 1: 401 Unauthorized**
**Solution:** Check JWT token is valid and not expired

### **Issue 2: "NFT not listed"**
**Solution:** Check NFT status before showing buy button

### **Issue 3: Wallet not connected**
**Solution:** Check wallet connection before calling API

### **Issue 4: Transaction failed to confirm**
**Solution:** Retry confirmation or check blockchain explorer

---

## 🔗 Related Documentation

- Full API docs: `API_BUY_NFT_USER.md`
- Testing guide: `TEST_CANCEL_AND_CONFIRM.md`
- Postman collection: `postman_collection_buy_nft.json`

---

## 📞 Support

Questions? Check:
1. Console logs for error messages
2. Network tab for API responses
3. Backend logs for debugging
