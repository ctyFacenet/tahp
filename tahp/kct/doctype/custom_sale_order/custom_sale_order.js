// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Custom Sale Order", {
  async refresh(frm) {

    if (frm.vue_form) frm.vue_form.destroy?.();

    const wrapperId = "vue-dynamic-frappe-form";
    let wrapper = frm.$wrapper.find(`#${wrapperId}`);
    if (!wrapper.length) {
      wrapper = $(`<div id="${wrapperId}" class="tw-mt-4"></div>`).appendTo(frm.body);
    }

    frm.vue_form = new tahp.ui.CustomDynamicFormComponent({
      wrapper: wrapper[0],
      frm: frm,
      title: "Thông tin đơn hàng",
    });
  },
});

