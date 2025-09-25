// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on('Operation Tracker', {
    before_save: async function (frm) {
            if (!frm.is_dirty()) return;
            return new Promise((resolve, reject) => {
                frappe.dom.unfreeze()
                frappe.confirm(
                    `Lần lưu này sẽ ảnh hưởng tới toàn bộ <b>phiếu đo đạc đang chạy</b>. Tiếp tục?`,
                    () => resolve(),
                    () => reject("❌ Action cancelled by user.")
                );
            });
    }
});


frappe.ui.form.on("Operation Tracker Item", {
    operation(frm, cdt, cdn) {
        frm.set_query("operation", "items", function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];

            // Lấy tất cả operation đã có trong table
            let existing_operations = (doc.items || [])
                .map(d => d.operation)
                .filter(Boolean);

            return {
                filters: [
                    ["Operation", "name", "not in", existing_operations]
                ]
            };
        });
    },

    qc_template(frm, cdt, cdn) {
        frm.set_query("qc_template", "items", function(doc) {
            return {
                filters: {
                    // filter nếu cần
                }
            };
        });
    }
});



                            // get_query: function() {
                            //     let selected = (d.get_values().items || [])
                            //         .map(r => r.employee)
                            //         .filter(Boolean);
                            //     return {
                            //             filters: [
                            //                 ["Employee", "employee", "not in", selected]
                            //             ]
                            //         };
                            // }