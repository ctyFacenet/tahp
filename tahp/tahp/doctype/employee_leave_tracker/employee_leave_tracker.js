// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

// frappe.ui.form.on('Employee Leave Tracker', {
//     short_name_btn : function(frm) {
//         frappe.call({
//             method: 'tahp.tahp.doctype.employee_leave_tracker.employee_leave_tracker.generate_short_name',
//             args:{
//                     doctype: frm.doc.doc_type,
//                     module: "Tahp",
                    
//                 },
//             callback: () => {}
            
//         })
//     }
// })

frapple.ui.form.on('Employee Leave Tracker', {
    refresh: async function(frm){
        frm.add_custom_button(_('Test'), async function() {
            frappe.call({method: 'tahp.tahp.doctype.employee_leave_tracker.employee_leave_tracker.generate_short_name'})
        });

    }
});


// frappe.ui.form.on('Student Overview', {
    

//     refresh: async function(frm) {
//         frm.add_custom_button(__('Xem danh sách GPA < 4666'), function() {
//             frappe.set_route('query-report', 'GPA dưới 4');
//         });
//         frm.add_custom_button(__("Test"), async function () {
//             frappe.call({method: "tahp.tahp.doctype.student_overview.student_overview.generate"})
//         })
//     }
// });