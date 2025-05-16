import {Chain} from 'viem';
import {
    base,
    baseSepolia,
} from 'viem/chains';

// Map of chain IDs to chain objects
const chainMap: Record<number, Chain> = {

    [base.id]: base,
    [baseSepolia.id]: baseSepolia,

};

/**
 * Get a chain object by its ID
 * @param chainId The chain ID to look up
 * @returns The corresponding chain object, or undefined if not found
 */
export const getChainById = (chainId: number): Chain | undefined => {
    return chainMap[chainId];
};

/**
 * Check if a chain is supported
 * @param chainId The chain ID to check
 * @returns True if the chain is supported, false otherwise
 */
export const isChainSupported = (chainId: number): boolean => {
    return chainId in chainMap;
};

/**
 * Get all supported chains
 * @returns An array of all supported chains
 */
export const getSupportedChains = (): Chain[] => {
    return Object.values(chainMap);
};

/**
 * Get all supported chain IDs
 * @returns An array of all supported chain IDs
 */
export const getSupportedChainIds = (): number[] => {
    return Object.keys(chainMap).map(Number);
};

export type {Chain};
