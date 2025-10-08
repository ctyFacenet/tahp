// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Custom Invoice Summary", {
	refresh(frm) {
        if (frm.doc.type_posting) {
            let title = "";

            switch (frm.doc.type_posting) {
                case "Phiếu nhập kho":
                    title = `Phiếu nhập ${frm.doc.name}`
                    break;
                case "Phiếu xuất kho":
                    title = `Phiếu xuất ${frm.doc.name}`
                    break;
                default:
                    title = frm.doc.name;
            }
            frm.page.set_title(title);
        }
	},
});
