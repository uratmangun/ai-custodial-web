// src/components/custom/BalanceTable.tsx
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Balance {
  token: string;
  symbol: string;
  balance: string;
  value: string;
}

interface BalanceTableProps {
  balances: Balance[];
}

const BalanceTable: React.FC<BalanceTableProps> = ({ balances }) => {
  return (
    <Card className="w-full max-w-2xl shadow-md"> {/* Added Card wrapper */}
      <CardHeader>
        <CardTitle className="text-slate-800">Your Balances</CardTitle> {/* Adjusted title */}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-700">Token</TableHead> {/* Adjusted header text color */}
                <TableHead className="text-slate-700">Symbol</TableHead> {/* Adjusted header text color */}
                <TableHead className="text-slate-700">Balance</TableHead> {/* Adjusted header text color */}
                <TableHead className="text-right text-slate-700">Value (USD)</TableHead> {/* Adjusted header text color */}
                <TableHead className="text-center text-slate-700">Action</TableHead> {/* Added Action Header */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                    No balances found.
                  </TableCell>
                </TableRow>
              ) : (
                balances.map((balance) => (
                  <TableRow key={balance.symbol}>
                    <TableCell className="font-medium text-slate-900">{balance.token}</TableCell> {/* Adjusted cell text color */}
                    <TableCell className="text-slate-600">{balance.symbol}</TableCell> {/* Adjusted cell text color */}
                    <TableCell className="text-slate-600">{balance.balance}</TableCell> {/* Adjusted cell text color */}
                    <TableCell className="text-right text-slate-600">{balance.value}</TableCell> {/* Adjusted cell text color */}
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button variant="outline" size="sm">Bridge</Button>
                        <Button variant="outline" size="sm">Swap</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceTable;
