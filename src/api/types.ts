// Types for API responses
export type Draft = {
  _id: string;
  adminAddr: string;
  name: string;
  desc: string;
  status:
    | "draft"
    | "files_uploaded"
    | "ipfs_published"
    | "deploy_pending"
    | "onchain_created";
  imageFileNames?: string[];
  bannerFileName?: string;
  manifest?: any[];
  config?: any;
  baseUri?: string;
  collectionUri?: string;
  ownerAddr?: string; // Resource Account address
  collectionId?: string;
};

export type MintProgress = {
  totalTokens: number;
  mintedCount: number;
  remainingTokens: number;
  mintedIndexes: number[];
  progress: number;
};

export type RandomMintResult = {
  transaction: any;
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: any[];
  };
  tokenIndex: number;
  remainingTokens: number;
  totalTokens: number;
};
