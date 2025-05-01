// src/components/custom/BalanceTable.tsx
import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

interface RawBalanceItem {
  block_num: number;
  datetime: string;
  contract: string;
  amount: string;
  value: number;
  decimals: number;
  symbol: string;
  network_id: string;
}

interface BalanceTableProps {
  balances: RawBalanceItem[] | null;
}

export function BalanceTable({ balances }: BalanceTableProps) {
  // Helper to format balance
  const formatDisplayBalance = (amount: string, decimals: number): string => {
    try {
      const divisor = Math.pow(10, decimals);
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount)) return "Invalid Amount";
      return (numericAmount / divisor).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      });
    } catch (e) {
      console.error("Error formatting balance:", e);
      return "Error";
    }
  };

  // Helper to format timestamp
  const formatTimestamp = (datetime: string): string => {
    try {
      return new Date(datetime).toLocaleString();
    } catch (e) {
      return datetime;
    }
  };

  // Helper to shorten contract address
  const shortenAddress = (address: string): string => {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Table>
      <TableCaption>A list of your recent token balances.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Token</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead className="text-right">Decimals</TableHead>
          <TableHead className="text-right">Block #</TableHead>
          <TableHead>Timestamp</TableHead>
          <TableHead>Contract</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {balances && balances.length > 0 ? (
          balances.map((item, index) => (
            <TableRow key={`${item.contract}-${index}`}>
              <TableCell className="font-medium">{item.symbol}</TableCell>
              <TableCell className="text-right font-mono text-xs">{item.amount}</TableCell>
              <TableCell className="text-right">
                {formatDisplayBalance(item.amount, item.decimals)}
              </TableCell>
              <TableCell className="text-right">{item.decimals}</TableCell>
              <TableCell className="text-right">{item.block_num}</TableCell>
              <TableCell>{formatTimestamp(item.datetime)}</TableCell>
              <TableCell title={item.contract}>
                {shortenAddress(item.contract)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {/* Removed View Tx button */}
                  {/* Re-added Swap/Bridge Buttons (placeholders) */}
                  <Button variant="outline" size="sm">Bridge</Button>
                  <Button variant="outline" size="sm">Swap</Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={8} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
