import { CrudManager } from "@/components/admin/CrudManager";

export default function ReviewsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">تقييمات العملاء</h1>
      <CrudManager
        resource="reviews"
        canCreate={false}
        defaults={{}}
        fields={[]}
        columns={[
          { key: "product.name", label: "المنتج" },
          { key: "name", label: "العميل" },
          { key: "rating", label: "التقييم" },
          { key: "comment", label: "التعليق" },
          { key: "approved", label: "معتمد", render: "bool" },
          { key: "createdAt", label: "التاريخ", render: "date" },
        ]}
      />
    </div>
  );
}
