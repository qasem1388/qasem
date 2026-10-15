import { CrudManager } from "@/components/admin/CrudManager";

export default function CategoriesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">التصنيفات</h1>
      <CrudManager
        resource="categories"
        defaults={{ name: "", slug: "", description: "", image: "", bannerImage: "", sortOrder: 0, active: true, seoTitle: "", seoDescription: "" }}
        fields={[
          { key: "name", label: "الاسم", type: "text" },
          { key: "slug", label: "الرابط (slug)", type: "text", placeholder: "يُولّد تلقائياً" },
          { key: "sortOrder", label: "الترتيب", type: "number" },
          { key: "active", label: "مفعّل", type: "checkbox" },
          { key: "description", label: "الوصف", type: "textarea" },
          { key: "image", label: "صورة دائرية للتصنيف", type: "image", folder: "categories" },
          { key: "bannerImage", label: "بنر صفحة التصنيف", type: "image", folder: "categories" },
          { key: "seoTitle", label: "عنوان SEO", type: "text" },
          { key: "seoDescription", label: "وصف SEO", type: "text" },
        ]}
        columns={[
          { key: "image", label: "", render: "image" },
          { key: "name", label: "الاسم" },
          { key: "slug", label: "الرابط" },
          { key: "_count.products", label: "المنتجات" },
          { key: "active", label: "مفعّل", render: "bool" },
        ]}
      />
    </div>
  );
}
