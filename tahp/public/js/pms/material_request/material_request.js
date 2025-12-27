frappe.ui.form.on("Material Request", {
    refresh: async function(frm) {
        await frm.trigger('autofill_employee')
        await frm.trigger('budget_wrapper')
    },

    custom_employee: async function(frm) {
        await frm.trigger('autofill_employee')
    },

    autofill_employee: async function (frm) {
        if (frm.doc.custom_employee) return
        let res = await frappe.xcall("tahp.pms.doc_events.material_request.material_request.autofill_employee")
        frm.set_value({
            "custom_employee": res.name,
            "custom_department": res.department,
        })
    },

    budget_wrapper: async function(frm) {
        if (!frm.budget_wrapper) frm.budget_wrapper = new tahp.pms.utils.BudgetWrapper(
            frm,
            "custom_budget_wrapper",
            "custom_purchase_purpose",
            "amount",
            false,
            true
        )
        await frm.budget_wrapper.refresh()
    }
})

frappe.ui.form.on("Material Request Item", {
    item_code: async function(frm, cdt, cdn) {
        let row = locals[cdt][cdn]
        if (!row.item_code) return
        frappe.model.set_value(cdt, cdn, "bom_no", null)
        frappe.model.set_value(cdt, cdn, "qty", 5)
        frappe.model.set_value(cdt, cdn, "schedule_date", frappe.datetime.add_days(frappe.datetime.get_today(), 7))
        let res = await frappe.xcall("tahp.pms.doc_events.utils.autofill_item_rate", {item_code: row.item_code})
        if (res) {
            frappe.model.set_value(cdt, cdn, {
                "rate": (res.rate || 0),
                "brand": (res.origin || ""),
                "amount": (res.qty || 0) * (res.rate || 0)
            })
        }
        let purpose = await frappe.xcall("tahp.pms.doc_events.material_request.material_request.autofill_purpose", {item_code: row.item_code})
        if (purpose) frappe.model.set_value(cdt, cdn, "custom_purchase_purpose", purpose)
        frm.budget_wrapper.refresh()
    },

    qty: function(frm, cdt, cdn) {
        frm.budget_wrapper.refresh()
    },

    rate: function(frm, cdt, cdn) {
        frm.budget_wrapper.refresh()
    },

    items_add: function(frm, cdt, cdn) {
        frm.budget_wrapper.refresh()
    },

    items_remove: function(frm, cdt, cdn) {
        frm.budget_wrapper.refresh()
    },

    custom_purchase_purpose: function(frm, cdt, cdn) {
        frm.budget_wrapper.refresh()
    }
})