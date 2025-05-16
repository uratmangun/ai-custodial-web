import type {
  Implementation,
  MetaMaskSmartAccount,
} from "@metamask/delegation-toolkit";
import { lineaSepolia } from "viem/chains";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  createBundlerClient,
  createPaymasterClient,
} from "viem/account-abstraction";
import { http } from "viem";
import { Chain, getChainById } from "../utils/chains";

export const paymasterClient = createPaymasterClient({
  transport: http(process.env.NEXT_PUBLIC_BUNDLER_URL),
});

// Default bundler using lineaSepolia
export const bundler = createBundlerClient({
  transport: http(process.env.NEXT_PUBLIC_BUNDLER_URL),
  paymaster: paymasterClient,
  chain: lineaSepolia,
});

// Create a bundler with a specific chain
export const createBundlerWithChain = (chainId: number) => {
  const chain = getChainById(chainId) || lineaSepolia;
  
  return createBundlerClient({
    transport: http(process.env.NEXT_PUBLIC_BUNDLER_URL),
    paymaster: paymasterClient,
    chain,
  });
};

export const pimlicoClient = createPimlicoClient({
  transport: http(process.env.NEXT_PUBLIC_BUNDLER_URL),
});

export const sendUserOp = async (
  smartAccount: MetaMaskSmartAccount<Implementation.Hybrid>,
  calls: readonly unknown[],
  chainId?: number
) => {
  const { fast: fees } = await pimlicoClient.getUserOperationGasPrice();
  
  // Use the dynamic bundler if chainId is provided, otherwise use the default bundler
  const bundlerClient = chainId ? createBundlerWithChain(chainId) : bundler;

  const userOpHash = await bundlerClient.sendUserOperation({
    account: smartAccount,
    calls,
    ...fees,
  });

  const receipt = await bundlerClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  return receipt;
};
