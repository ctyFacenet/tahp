// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Shift Handover", {
	
    work_order: function(frm) {
        if(frm.doc.work_order) {
            frm.call('populate_job_cards').then(() => {
                frm.refresh_field('job_card_list');
            })
        }
        else {
            frm.clear_table('job_card_list');
            frm.refresh_field('job_card_list');
        }
    }
});
