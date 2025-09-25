export type BuildTxResponse = {
  functionId: string;
  sender: string;
  chainId: number;
  payload: {
    function: string;
    typeArguments: string[];
    functionArguments: any[];
  };
  gasUnitPrice?: string;
  maxGas?: string;
};

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
