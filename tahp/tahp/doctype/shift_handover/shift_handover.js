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
        if (frm.doc.work_order) setup_button(frm);
        $(frm.page.wrapper).find('.actions-btn-group').hide();
    },
});

function setup_button(frm) {
    switch(frm.doc.workflow_state) {
        case 'Draft':
            create_buttons(frm, [
                { label: "Bàn giao", class: "btn-primary", handler: setup_draft_buttons},
            ])
            break;
        case 'Handed Over':
            create_buttons(frm, [
                {label: "Nhận bàn giao", class: "btn-primary", handler: setup_handed_over_buttons},
                {label: "Từ chối", handler: setup_decline_buttons}
            ])
            break;
        case 'Completed':
            setup_completed_buttons(frm);
            break;
    }
}

async function create_buttons(frm, buttons) {
    if (frm.is_new() || frm.doc.docstatus !== 0) return;

    const $wrapper = $(frm.fields_dict.wrapper.wrapper || null);
    if ($wrapper) $wrapper.empty();
    console.log($wrapper)

    buttons.forEach(btn => {
        frm.add_custom_button(__(btn.label), async () => {
            await btn.handler(frm);
        }).addClass(btn.class || 'btn-default');

        if ($wrapper) {
            const $mobileBtn = $(`
                <button 
                    class="btn ${btn.class || 'btn-default'} ellipsis w-100 d-md-none mb-3 py-2"
                    style="font-weight: 500;"
                >
                    ${btn.label}
                </button>
            `);
            $mobileBtn.on("click", async () => {
                await btn.handler(frm);
            });
            $wrapper.append($mobileBtn);
        }
    });
}

// Nút cho trạng thái Draft → Handed Over
function setup_draft_buttons(frm) {
    frappe.confirm(
        "Bạn có chắc chắn muốn bàn giao ca làm việc này?",
        function() {
            frm.selected_workflow_action = "Bàn Giao";
            trigger_workflow_action(frm, "Handed Over");
        }
    );
}

// Nút cho trạng thái Handed Over → Completed
async function setup_handed_over_buttons(frm) {
    frappe.confirm(
        "Bạn có chắc chắn muốn nhận bàn giao ca làm việc này?",
        function() {
            frm.selected_workflow_action = "Nhận bàn giao";
            trigger_workflow_action(frm, "Completed");
        }
    );
}

async function setup_decline_buttons(frm) {
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
        },
        "Nhập lý do từ chối",
        "Xác nhận"
    );
}

// Nút cho trạng thái Completed
async function setup_completed_buttons(frm) {
    const $wrapper = $(frm.fields_dict.wrapper.wrapper || null);
    if ($wrapper) $wrapper.empty();
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




