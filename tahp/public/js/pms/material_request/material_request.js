frappe.ui.form.on("Material Request", {
    refresh: async function(frm) {
        await frm.trigger('autofill_employee')
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
    }
})

// frappe.ui.form.on("Material Request Item", {
//     item_code: async function(frm, cdt, cdn) {
//         let row = locals[cdt][cdn]
//         if (!row.item_code) return
//         console.log("hello")
//     },
// })