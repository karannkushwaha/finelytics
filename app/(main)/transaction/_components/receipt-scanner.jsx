"use client";

import React from "react"; // Import React explicitly (optional in React 17+)
import PropTypes from "prop-types"; // Import PropTypes
import { scanReceipt } from "@/actions/transaction";
import { Button } from "@/components/ui/button";
import useFetch from "@/hooks/use-fetch";
import { Loader2 } from "lucide-react";
import { Camera } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const ReceiptScanner = ({ onScanComplete }) => {
  const fileInputRef = useRef();
  const {
    loading: scanReceiptLoading,
    fn: scanReceiptFn,
    data: scanedData,
  } = useFetch(scanReceipt);

  const handleReceiptScan = async (file) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB...!");
      return;
    }
    await scanReceiptFn(file);
  };

  useEffect(() => {
    if (scanedData && !scanReceiptLoading) {
      onScanComplete(scanedData);
      toast.success("Receipt scanned Successfully.");
    }
  }, [scanReceiptLoading, scanedData, onScanComplete]);

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleReceiptScan(file);
        }}
      />
      <Button
        className="w-full h-10 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 animate-gradient hover:opacity-90 transition-opacity text-white hove:text-white"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanReceiptLoading}
      >
        {scanReceiptLoading ? (
          <>
            <Loader2 className="mr-2 animate-spin" />
            <span>Scanning Receipt...</span>
          </>
        ) : (
          <>
            <Camera className="mr-2" />
            <span>Scan Receipt with AI</span>
          </>
        )}
      </Button>
    </div>
  );
};

// Add PropTypes validation
ReceiptScanner.propTypes = {
  onScanComplete: PropTypes.func.isRequired, // Validate onScanComplete
};

export default ReceiptScanner;
