import { CrudManager } from "@/components/admin/CrudManager";

export default function BannersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">السلايدرات والبنرات</h1>
      <p className="text-sm text-neutral-500">السلايدر الرئيسي (hero) يظهر أعلى الصفحة الرئيسية — بنرات التصنيفات تظهر كشبكة — بنر العروض يظهر بعرض كامل. المقاس المقترح: 1920×800 للسلايدر و1200×750 للبنرات.</p>
      <CrudManager
        resource="banners"
        defaults={{ position: "hero", title: "", subtitle: "", image: "", link: "/", buttonText: "تسوق الآن", sortOrder: 0, active: true }}
        fields={[
          { key: "position", label: "المكان", type: "select", options: [["hero", "السلايدر الرئيسي"], ["category", "بنر تصنيف"], ["promo", "بنر عروض"]] },
          { key: "title", label: "العنوان", type: "text" },
          { key: "subtitle", label: "العنوان الفرعي", type: "text" },
          { key: "buttonText", label: "نص الزر", type: "text" },
          { key: "link", label: "الرابط", type: "text", placeholder: "/category/..." },
          { key: "sortOrder", label: "الترتيب", type: "number" },
          { key: "image", label: "الصورة", type: "image", folder: "banners" },
          { key: "active", label: "مفعّل", type: "checkbox" },
        ]}
        columns={[
          { key: "image", label: "", render: "image" },
          { key: "position", label: "المكان" },
          { key: "title", label: "العنوان" },
          { key: "link", label: "الرابط" },
          { key: "active", label: "مفعّل", render: "bool" },
        ]}
      />
    </div>
  );
}
