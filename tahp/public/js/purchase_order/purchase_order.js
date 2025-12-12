frappe.ui.form.on("Purchase Order", {
    refresh: function(frm) {
        frm.set_intro("")
        const $wrapper = $(frm.fields_dict.custom_wrapper.wrapper);
        $wrapper.empty();
        const component = new tahp.ui.ReuseableTableComponent({
            wrapper: $wrapper, 
            frm: frm, 
            childTableName: "custom_detail", 
            totalFieldName: "total", 
            showIndex: true
        })
    }
})