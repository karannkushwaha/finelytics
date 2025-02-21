"use client";

import { updateDefaultAccount } from "@/actions/accounts";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import useFetch from "@/hooks/use-fetch";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react"; // Import React explicitly (optional in React 17+)
import { toast } from "sonner";
import PropTypes from "prop-types"; // Import PropTypes for validation

const AccountCard = ({ account }) => {
  const { name, type, balance, id, isDefault } = account;
  const {
    loading: updateDefaultLoading,
    fn: updateDefaultFn,
    data: updatedAccount,
    error,
  } = useFetch(updateDefaultAccount);

  const handleDefaultAccount = async (event) => {
    event.preventDefault();

    if (isDefault) {
      toast.warning("You need at least one default account");
      return;
    }
    await updateDefaultFn(id);
  };

  useEffect(() => {
    if (updatedAccount && updatedAccount?.success && !updateDefaultLoading) {
      toast.success("Default account updated successfully");
    }
  }, [updatedAccount, updateDefaultLoading]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to update default account");
    }
  }, [error]);

  return (
    <div>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group relative">
        <Link href={`/account/${id}`}>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium capitalize">
              {name}
            </CardTitle>
            <Switch
              checked={isDefault}
              onClick={handleDefaultAccount}
              disabled={updateDefaultLoading}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{parseFloat(balance).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}{" "}
              Account
            </p>
          </CardContent>
          <CardFooter className="flex justify-between text-sm text-muted-foreground">
            <div className="flex items-center">
              <ArrowUpRight className="mr-1 h-6 w-4 text-green-500" />
              Income
            </div>
            <div className="flex items-center">
              <ArrowDownRight className="mr-1 h-6 w-4 text-red-500" />
              Expense
            </div>
          </CardFooter>
        </Link>
      </Card>
    </div>
  );
};

// Add PropTypes validation
AccountCard.propTypes = {
  account: PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired, // Validates `type`; methods like `charAt` and `slice` are implicitly covered
    balance: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
      .isRequired, // Allow number or string (parsed later)
    id: PropTypes.string.isRequired,
    isDefault: PropTypes.bool.isRequired,
  }).isRequired,
};

export default AccountCard;
