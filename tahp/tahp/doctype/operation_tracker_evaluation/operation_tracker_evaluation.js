// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Operation Tracker Evaluation", {
	refresh(frm) {
        frm.set_query('item_code', function(doc) {
            return {
                filters: {
                    "disabled": 0,
                    "has_variants": 0 
                }
            };
        });
	},
});
