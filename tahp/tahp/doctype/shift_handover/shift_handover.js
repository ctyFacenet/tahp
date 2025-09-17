// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt



/**
 * Script cho DocType Shift Handover.
 * 
 * Chức năng:
 * - Ẩn toàn bộ nút workflow mặc định (Actions).
 * - Chỉ hiển thị các nút custom khi liên kết Stock Entry đã được Submit (docstatus = 1).
 * - Quản lý luồng chuyển trạng thái: Draft → Handed Over → Completed.
 * - Gọi API backend để xử lý logic khi hoàn tất bàn giao.
 */
frappe.ui.form.on("Shift Handover", {
    refresh: function(frm) {
        if (frm.doc.workflow_state) {
            //  check docstatus Stock Entry
            if (frm.doc.stock_entry) {
                frappe.db.get_value("Stock Entry", frm.doc.stock_entry, "docstatus")
                    .then(r => {
                        if (r.message && r.message.docstatus === 1) {
                            setup_button(frm); // run khi Stock Entry đã Submit
                        } else {
                            console.log("no button");
                        }
                    });
            } else {
                // không có Stock Entry thì không hiện nút
                console.log("no button");
            }
        }
        // frm.page.set_primary_action('Xin chào', ()=>{})
        $(frm.page.wrapper).find('.actions-btn-group').hide();
    },
});

function setup_button(frm) {
    switch(frm.doc.workflow_state) {
        case 'Draft':
            setup_draft_buttons(frm);
            break;
        // case 'Ready to Handover':
        //     setup_ready_buttons(frm);
        //     break;
        case 'Handed Over':
            setup_handed_over_buttons(frm);
            break;
        case 'Completed':
            setup_completed_buttons(frm);
            break;
    }
}

// Nút cho trạng thái Draft → Handed Over
function setup_draft_buttons(frm) {
    frm.add_custom_button("Bàn Giao", function() {
        frappe.confirm(
            "Bạn có chắc chắn muốn bàn giao ca làm việc này?",
            function() {
                frm.selected_workflow_action = "Bàn Giao";
                trigger_workflow_action(frm, "Handed Over");
            }
        );
    }).addClass("btn-primary");
}

// Nút cho trạng thái Handed Over → Completed
async function setup_handed_over_buttons(frm) {
    frm.add_custom_button("Nhận bàn giao", function() {
        frappe.confirm(
            "Bạn có chắc chắn muốn nhận bàn giao ca làm việc này?",
            function() {
                frm.selected_workflow_action = "Nhận bàn giao";
                trigger_workflow_action(frm, "Completed");
            }
        );
    }).addClass("btn-primary");
    frm.add_custom_button("Từ chối", function() {
        frappe.prompt(
            [
                {
                    label: "Lý do từ chối",
                    fieldname: "comment",
                    fieldtype: "Small Text",
                    reqd: 1
                }
            ],
            async function(values) {
                frm.selected_workflow_action = "Từ chối";
                await frappe.call({
                    method: "tahp.tahp.doctype.shift_handover.shift_handover.reject",
                    args: {
                        name: frm.doc.name,
                        comment: values.comment
                    }
                });
                trigger_workflow_action(frm, "Draft");
            },
            "Nhập lý do từ chối",
            "Xác nhận"
        );
    });

}

// Nút cho trạng thái Completed
async function setup_completed_buttons(frm) {
    // Nếu đã xử lý rồi thì không chạy lại nữa
    if (frm._completed_processed) return;

    frm._completed_processed = true;  // flag

    frm.dashboard.add_comment("Biên bản giao ca đã hoàn thành", "green", true);
    console.log("Shift Handover Name:", frm.doc.name);

    let r = await frappe.call({
        method: 'tahp.doc_events.work_order.work_order_api.complete_shift_handover',
        args: {
            shift_handover_name: frm.doc.name
        }
    });

    if (r.message && r.message.status === "success") {
        frappe.msgprint(r.message.message);
        await frm.reload_doc(); // reload lại form để thấy update
    }
}


// Hàm gọi API apply_workflow
function trigger_workflow_action(frm, next_state) {
    frappe.call({
        method: "frappe.model.workflow.apply_workflow",
        args: {
            doc: frm.doc,
            action: frm.selected_workflow_action
        },
        callback: function(r) {
            if (r.message) {
                frm.reload_doc();
            }
        }
    });
}




