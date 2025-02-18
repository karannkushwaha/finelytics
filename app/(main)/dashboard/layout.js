import { Suspense, lazy } from "react";
import { BarLoader } from "react-spinners";

const DashboardPage = lazy(() =>
  import("./page").catch((error) => {
    console.error("Error loading DashboardPage:", error);
    throw error;
  })
);

const DashboardLayout = () => {
  return (
    <div className="px-5">
      <h1 className="text-6xl font-bold gradient-title mb-5">
        DashboardLayout
      </h1>
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <DashboardPage />
      </Suspense>
    </div>
  );
};

export default DashboardLayout;
