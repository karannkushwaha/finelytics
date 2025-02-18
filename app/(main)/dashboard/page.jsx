import { getDashboardData, getUserAccounts } from "@/actions/dashboard";
import CreateAccountDrawer from "@/components/create-account-drawer";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import AccountCard from "./_components/account-card";
import { getCurrentBudget } from "@/actions/budget";
import BudgetProgress from "./_components/budget-progress";
import { Suspense } from "react";
import DashboardOverview from "./_components/transaction-overview";
import { dynamic } from "next/dynamic";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

const DashboardPage = async () => {
  console.log("Fetching user accounts...");
  const accounts = await getUserAccounts();
  console.log("Accounts:", accounts);

  const defaultAccount = accounts?.account?.find(
    (account) => account.isDefault
  );

  let budgetData = null;
  if (defaultAccount) {
    console.log("Fetching budget data...");
    budgetData = await getCurrentBudget(defaultAccount.id);
    console.log("Budget Data:", budgetData);
  }

  console.log("Fetching dashboard data...");
  const transaction = await getDashboardData();
  console.log("Transactions:", transaction);

  return (
    <div className="space-y-8">
      {defaultAccount && (
        <BudgetProgress
          initialBudget={budgetData?.budget}
          currentExpenses={budgetData?.currentExpenses || 0}
        />
      )}

      <Suspense fallback={<div>Loading Overview...</div>}>
        <DashboardOverview
          accounts={accounts}
          transactions={transaction || []}
        />
      </Suspense>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <CreateAccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Add New Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>
        {accounts?.account?.length > 0 &&
          accounts.account.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
      </div>
    </div>
  );
};

export default DashboardPage;
