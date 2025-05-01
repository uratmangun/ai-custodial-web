"use client";

import React, { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  value: string;
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
  className?: string;
  children?: React.ReactNode;
}

const CopyButton = ({
  value,
  onCopy,
  onError,
  timeout = 2000,
  className,
  children,
}: CopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    if (
      typeof window === "undefined" ||
      !navigator.clipboard.writeText ||
      !value
    ) {
      return;
    }

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      onCopy?.();

      setTimeout(() => setIsCopied(false), timeout);
    }, onError);
  };

  const icon = isCopied ? <CheckIcon size={14} /> : <CopyIcon size={14} />;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={copyToClipboard}
      className={cn(
        "opacity-0 transition-opacity group-hover:opacity-100",
        className
      )}
    >
      {children ?? icon}
    </Button>
  );
};

export default CopyButton;
