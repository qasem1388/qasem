import type { ReactNode } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { CompanySettingsPage } from "@/features/company/CompanySettingsPage";
import { CompanyProvider } from "@/features/company/useCompany";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ModulePlaceholder } from "@/features/modules/ModulePlaceholder";
import { ForbiddenPage, NotFoundPage } from "@/features/system/StatusPages";
import { UsersPage } from "@/features/users/UsersPage";
import type { Permission } from "@/shared/api/types";
import { useSession } from "./auth";

/** Client-side guard for UX; the backend authorises every command regardless. */
function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useSession();
  return can(permission) ? children : <ForbiddenPage />;
}

// Hash routing works from the `tauri://` origin without server rewrites.
const router = createHashRouter([
  {
    path: "/",
    element: (
      <CompanyProvider>
        <AppLayout />
      </CompanyProvider>
    ),
    children: [
      { index: true, element: <RequirePermission permission="dashboard_view"><DashboardPage /></RequirePermission> },
      { path: "company", element: <RequirePermission permission="company_view"><CompanySettingsPage /></RequirePermission> },
      { path: "users", element: <RequirePermission permission="users_manage"><UsersPage /></RequirePermission> },
      { path: "m/:moduleKey", element: <ModulePlaceholder /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
