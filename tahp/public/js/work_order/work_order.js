frappe.ui.form.on("Work Order", {
  refresh: async function (frm) {
    frm.set_intro("");
    await finish_button(frm);
  },
  production_item: async function (frm) {
    await autofill_items(frm);
  },

  on_submit: async function (frm) {
    if (frm.doc.custom_is_qc_tracked) {
      frappe.show_alert({
        message: __("Đang tạo phiếu kiểm tra chất lượng..."),
        indicator: "blue",
      });

      // Tìm tất cả Job Card liên quan đến Work Order này
      const job_cards = await frappe.db.get_list("Job Card", {
        filters: { work_order: frm.doc.name },
        fields: ["name"],
      });

      // Lặp qua từng Job Card và gọi hàm tạo QC cho nó
      for (let job_card of job_cards) {
        const response = await frappe.xcall(
          "tahp.doc_events.work_order.work_order_utils.create_qc_and_notify",
          {
            job_card_name: job_card.name,
          },
        );

        // Hiển thị thông báo thành công hoặc thất bại cho mỗi Job Card
        if (response.startsWith("Successfully")) {
          frappe.show_alert({
            message: __(response),
            indicator: "green",
          });
        } else {
          frappe.show_alert({
            message: __(
              "Tạo phiếu QC thất bại cho Job Card " +
                job_card.name +
                ": " +
                response,
            ),
            indicator: "red",
          });
        }
      }
    }
  },
  // The rest of your existing event handlers and functions
  custom_is_qc_tracked: async function (frm) {
    await toggle_qc_tracking(frm);
  },
  production_item: async function (frm) {
    await autofill_items(frm);
  },
  bom_no: async function (frm) {
    await autofill_items(frm);
  },
});

frappe.ui.form.on("Work Order Operation", {
  operation: async function (frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row.operation) return;
    let operation_doc = await frappe.db.get_doc("Operation", row.operation);
    if (operation_doc) {
      frappe.model.set_value(
        cdt,
        cdn,
        "workstation",
        operation_doc.workstation,
      );
      frappe.model.set_value(cdt, cdn, "sequence_id", 1);
      if (operation_doc.custom_team && operation_doc.custom_team.length === 1) {
        frappe.model.set_value(
          cdt,
          cdn,
          "custom_employee",
          operation_doc.custom_team[0].employee,
        );
      }
    }
  },
});

async function finish_button(frm) {
  if (frm.is_new() || frm.doc.docstatus != 1 || frm.doc.status == "Completed")
    return;
  frm.remove_custom_button("Finish");
  const response = await frappe.call({
    method: "tahp.doc_events.work_order.before_submit.check_status",
    args: { work_order: frm.doc.name },
  });
  if (response.message) {
    frm
      .add_custom_button(__("Hoàn thành"), async function () {
        const stock_entry = await frappe.xcall(
          "erpnext.manufacturing.doctype.work_order.work_order.make_stock_entry",
          {
            work_order_id: frm.doc.name,
            purpose: "Manufacture",
            qty: frm.doc.qty,
          },
        );
        frappe.model.sync(stock_entry);
        frappe.set_route("Form", stock_entry.doctype, stock_entry.name);
      })
      .addClass("btn-primary");
  }
}

async function autofill_items(frm) {
  setTimeout(async () => {
    console.log(frm.doc.operations);
    for (let row of frm.doc.operations) {
      let op_doc = await frappe.db.get_doc("Operation", row.operation);
      if (op_doc.custom_team && op_doc.custom_team.length === 1) {
        frappe.model.set_value(
          row.doctype,
          row.name,
          "custom_employee",
          op_doc.custom_team[0].employee,
        );
      }
      let trackers = await frappe.db.get_list("Operation Tracker", {
        filters: { operation: row.operation, docstatus: 1 },
        fields: ["name"],
        order_by: "creation desc",
        limit: 1,
      });
      if (trackers.length > 0)
        frappe.model.set_value(
          row.doctype,
          row.name,
          "custom_is_qc_tracked",
          1,
        );
    }
    frm.refresh_field("operations");
  }, 100);
}

// Huy Section
frappe.ui.form.on("Work Order", {
    refresh: function(frm) {
        frm.set_intro("");
        if (!frm.is_new() && frm.doc.docstatus === 0) show_shift_handover(frm)
    }
});

function show_shift_handover(frm) {
    if (frm.doc.custom_plan && frm.doc.custom_plan_code) {
        frappe.call({ method: "tahp.doc_events.work_order.work_order_api.check_shift_handover",  
            args: { work_order: frm.doc.name, custom_plan: frm.doc.custom_plan, custom_plan_code: frm.doc.custom_plan_code },
            callback: function(r) {
                if (r.message && r.message.warning) { frm.set_intro(""); frm.set_intro(r.message.warning, "orange")}
            }
        });
    }
}