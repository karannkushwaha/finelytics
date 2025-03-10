"use client";

import { useState } from "react"; // Import React explicitly (optional in React 17+)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer } from "recharts";
import PropTypes from "prop-types"; // Import PropTypes for validation

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
  "#D4A5A5",
  "#9FA8DA",
];

const DashboardOverview = ({
  accounts = { account: [] },
  transactions = [],
}) => {
  const defaultAccountId =
    accounts?.account &&
    Array.isArray(accounts.account) &&
    accounts.account.length > 0
      ? accounts.account.find((a) => a.isDefault)?.id || accounts.account[0].id
      : null;

  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId);

  const accountTransactions = transactions
    .filter((t) => t.accountId === selectedAccountId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const currentMonthEx = accountTransactions.filter((t) => {
    const transactionDate = new Date(t.date);
    return (
      t.accountId === selectedAccountId &&
      transactionDate.getMonth() === new Date().getMonth() &&
      transactionDate.getFullYear() === new Date().getFullYear()
    );
  });

  const expenseByCategory = currentMonthEx.reduce((acc, transaction) => {
    const category = transaction.category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += transaction.amount;
    return acc;
  }, {});

  const pieChartData = Object.entries(expenseByCategory).map(
    ([category, amount]) => ({
      name: category,
      value: amount,
    })
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 min-w-[300px]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-normal">
            Recent Transactions
          </CardTitle>
          <Select
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select account">
                {accounts?.account && Array.isArray(accounts.account)
                  ? accounts.account.find((acc) => acc.id === selectedAccountId)
                      ?.name || "Select account"
                  : "Select account"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(accounts?.account) &&
                accounts.account.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accountTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No recent transactions
              </p>
            ) : (
              accountTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {transaction.description || "Untitled Transaction"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.date), "PP")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex items-center",
                        transaction.type === "EXPENSE"
                          ? "text-red-500"
                          : "text-green-500"
                      )}
                    >
                      {transaction.type === "EXPENSE" ? (
                        <ArrowDownRight className="mr-1 h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="mr-1 h-4 w-4" />
                      )}
                      ₹{transaction.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-normal">
            Monthly Expense Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-5">
          {pieChartData.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No expense this month
            </p>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ₹${value.toFixed(2)}`}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Add PropTypes validation
DashboardOverview.propTypes = {
  accounts: PropTypes.shape({
    account: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        isDefault: PropTypes.bool,
      })
    ),
  }),
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      accountId: PropTypes.string.isRequired,
      description: PropTypes.string,
      date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)])
        .isRequired,
      amount: PropTypes.number.isRequired,
      type: PropTypes.oneOf(["INCOME", "EXPENSE"]).isRequired,
      category: PropTypes.string,
    })
  ),
};

// Default props are already defined using object destructuring defaults, but kept here for clarity
DashboardOverview.defaultProps = {
  accounts: { account: [] },
  transactions: [],
};

export default DashboardOverview;
