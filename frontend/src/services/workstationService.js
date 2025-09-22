import { call } from "frappe-ui";

export async function getWorkstations(limit = 50) {
  try {
    return await call("frappe.client.get_list", {
      doctype: "Workstation",
      fields: [
        "name",
        "workstation_name",
        "workstation_type",
        "status",
        "custom_is_parent",
        "custom_parent",
      ],
      limit_page_length: limit,
    });
  } catch (err) {
    console.error("❌ Lỗi khi gọi API getWorkstations:", err);
    throw err;
  }
}
