// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Student Overview", {
// 	refresh(frm) {

// 	},
// });

// frm: form object
// cdt: child doctype
// cdn: uniqueID

frappe.ui.form.on('Student Overview', {
    // thay doi credit_price
    credit_price: function(frm) {
        update_all_total_cost(frm);
    },
    
    // refresh form
    refresh: function(frm) {
        calculate_graduation_status(frm);
        frm.add_custom_button('Report', () => {
            frappe.set_route('query-report', 'test')
        });
    }
});

frappe.ui.form.on('Student Registration Item', {
    // thay đổi credit
    credit: function(frm, cdt, cdn) {
        calculate_total_cost(frm, cdt, cdn);
        calculate_graduation_status(frm);
    },
    
    // Khi thêm dòng mới
    subject_add: function(frm) {
        calculate_graduation_status(frm);
    },
    
    // Khi xóa dòng
    subject_remove: function(frm) {
        calculate_graduation_status(frm);
    },
});

// tính total_cost 
function calculate_total_cost(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let credit_price = frm.doc.credit_price || 0;
    let credit = row.credit || 0;
    
    frappe.model.set_value(cdt, cdn, 'total_cost', credit_price * credit);
}

// update total_cost khi credit_price change
function update_all_total_cost(frm) {
    if (frm.doc.subject) {
        frm.doc.subject.forEach(function(row) {
            let credit = row.credit || 0;
            let credit_price = frm.doc.credit_price || 0;
            
            frappe.model.set_value(row.doctype, row.name, 'total_cost', credit_price * credit);
            frm.refresh_field('subject');
        });
    }
    console.log(credit)
    console.log(credit_price)
    
}

// tinh graduation_status
function calculate_graduation_status(frm) {
    let total_credits = 0;
    
    if (frm.doc.subject) {
        frm.doc.subject.forEach(function(row) {
            console.log(row.credit)
            total_credits += (row.credit || 0);
        });
    }
    //console.log(total_credits)
    let status = total_credits > 10 ? "Đủ điều kiện tốt nghiệp" : "Đang học tập";
    frm.set_value('graduation_status', status);
}