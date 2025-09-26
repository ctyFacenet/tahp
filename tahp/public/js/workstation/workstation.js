frappe.ui.form.on("Workstation", {
    custom_qr_button: async function(frm) {
        const r = await frappe.call({
            method: 'tahp.utils.qr_code.generate_qr',
            args: { data: frm.doc.custom_qr },
        });

        if(r.message) {
            let d = new frappe.ui.Dialog({
                size: 'small',
                title: __(`Mã QR của ${frm.doc.name}`),
                fields: [
                    {
                        fieldname: "qr_html",
                        fieldtype: "HTML",
                        options: `<div style="text-align:center;">
                                    <img src="data:image/png;base64,${r.message}" style="width:200px;height:200px;">
                                  </div>`
                    }
                ],
            });
            d.show();
        }
    },
    custom_inspection: function(frm) {
        frappe.new_doc("Workstation Inspection", {
            workstations: [
                {
                    workstation: frm.doc.custom_parent || frm.doc.name
                }
            ]            
        })
    }
});
