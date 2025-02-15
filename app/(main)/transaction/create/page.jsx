import { getUserAccounts } from "@/actions/dashboard";
import { defaultCategories } from "@/data/categories";
import AddTransactionForm from "../_components/add-transaction-form";
import { getTransaction } from "@/actions/transaction";

export const dynamic = "force-dynamic";

const AddTransactionPage = async ({ searchParams }) => {
  const editId = searchParams?.edit ?? null;

  const accounts = await getUserAccounts();

  let initialData = null;
  if (editId) {
    try {
      initialData = await getTransaction(editId);
    } catch (error) {
      console.error("Failed to fetch transaction:", error);
      initialData = null;
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5">
      <h1 className="text-5xl gradient-title mb-8">
        {editId ? "Edit Transaction" : "Add Transaction"}
      </h1>
      <AddTransactionForm
        accounts={accounts}
        categories={defaultCategories}
        initialData={initialData}
        editMode={Boolean(editId)}
      />
    </div>
  );
};

export default AddTransactionPage;
