// Copyright (c) 2025, FaceNet
// License: See license.txt

frappe.ui.form.on("Test print format custom", {
  refresh(frm) {
    const meta = frappe.get_meta(frm.doc.doctype);
    let label_map = {};
    meta.fields.forEach(f => {
      if (f.fieldname && f.label) {
        label_map[f.fieldname] = f.label;
      }
    });
    frm.doc._labels = label_map;

  }
});
