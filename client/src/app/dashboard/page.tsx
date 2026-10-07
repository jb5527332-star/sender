"use client";

import DashboardLayout from "@/components/DashboardLayout";
import DashboardPage from "@/components/pages/dashboard-page";
import { withAuth } from "@/contexts/auth-context";

function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardPage />
    </DashboardLayout>
  );
}

export default withAuth(Dashboard);
