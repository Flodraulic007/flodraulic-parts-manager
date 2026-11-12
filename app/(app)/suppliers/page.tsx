import type { Metadata } from "next";
import { getSuppliers } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SupplierList } from "./supplier-list";

export const metadata: Metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const [suppliers, user] = await Promise.all([getSuppliers(), requireUser()]);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Reference"
        title="Suppliers"
        subtitle={`${suppliers.length} suppliers. Started from the suppliers named in the part ledger — add contact details as you go.`}
      />
      <SupplierList suppliers={suppliers} canDelete={user.role === "manager"} />
    </div>
  );
}
