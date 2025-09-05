# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ManufacturingCategory(Document):
    def validate(self):
        self.validate_table()

    def validate_table(self):
        seen_categories = set()
        seen_materials = {}

        for idx, row in enumerate(self.items, start=1):
            cat = (row.category or "").strip()
            if not cat:
                continue

            # --- Check category ---
            if cat.lower() in seen_categories:
                frappe.throw(f"Đã có sẵn hệ {cat.capitalize()} trong hệ thống (dòng {idx})")
            seen_categories.add(cat.lower())

            # --- Chuẩn hoá materials ---
            if row.materials:
                normalized_list = []
                seen_in_row = set()  # track trong 1 ô materials

                for m in row.materials.split(","):
                    cleaned = m.strip()
                    if not cleaned:
                        continue

                    key = cleaned.lower()

                    # Nếu đã thấy trong chính ô này rồi → bỏ qua
                    if key in seen_in_row:
                        continue

                    # Nếu đã thấy ở ô trước → dùng version cũ
                    if key in seen_materials:
                        normalized_list.append(seen_materials[key])
                    else:
                        normalized_list.append(cleaned)
                        seen_materials[key] = cleaned

                    seen_in_row.add(key)

                row.materials = ", ".join(normalized_list)


@frappe.whitelist()
def get():
    return frappe.get_single("Manufacturing Category")