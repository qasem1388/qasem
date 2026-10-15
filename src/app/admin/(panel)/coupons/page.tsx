import { CrudManager } from "@/components/admin/CrudManager";

export default function CouponsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">كوبونات الخصم</h1>
      <CrudManager
        resource="coupons"
        defaults={{ code: "", type: "percent", value: 10, minOrder: 0, maxUses: 0, expiresAt: "", active: true }}
        fields={[
          { key: "code", label: "الكود", type: "text" },
          { key: "type", label: "النوع", type: "select", options: [["percent", "نسبة مئوية %"], ["fixed", "مبلغ ثابت"], ["free_shipping", "شحن مجاني"]] },
          { key: "value", label: "القيمة", type: "number" },
          { key: "minOrder", label: "الحد الأدنى للطلب", type: "number" },
          { key: "maxUses", label: "عدد مرات الاستخدام (0 = غير محدود)", type: "number" },
          { key: "expiresAt", label: "تاريخ الانتهاء", type: "date" },
          { key: "active", label: "مفعّل", type: "checkbox" },
        ]}
        columns={[
          { key: "code", label: "الكود" },
          { key: "type", label: "النوع" },
          { key: "value", label: "القيمة" },
          { key: "minOrder", label: "الحد الأدنى" },
          { key: "usedCount", label: "مرات الاستخدام" },
          { key: "expiresAt", label: "ينتهي", render: "date" },
          { key: "active", label: "مفعّل", render: "bool" },
        ]}
      />
    </div>
  );
}
