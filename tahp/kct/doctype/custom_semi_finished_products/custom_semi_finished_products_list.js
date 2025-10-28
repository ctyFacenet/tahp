frappe.listview_settings["Custom Semi Finished Products"] = {
  async onload(listview) {

    $(listview.page.body)
      .find(".list-row-container, .list-paging-area, .listview-control, .listview-header, .result, .page-form")
      .remove();
    listview.$result && listview.$result.hide();

    if (listview.vue_list) {
      listview.vue_list.destroy();
      listview.vue_list = null;
    }

    let $wrapper = $("#custom-semi-finish-product");
    if (!$wrapper.length) {
      $wrapper = $('<div id="custom-semi-finish-product"></div>').prependTo(listview.page.body);
    }

    await frappe.model.with_doctype(listview.doctype);
    const meta = frappe.get_meta(listview.doctype);

    const mapColumns = (fields) => {
      const cols = fields
        .filter(
          (f) =>
            f.label &&
            !["Section Break", "Column Break", "HTML", "Table"].includes(f.fieldtype) &&
            !["owner", "creation", "modified_by", "_assign", "_comments"].includes(f.fieldname)
        )
        .map((f) => ({
          title: f.label,
          key: f.fieldname,
          fieldtype: f.fieldtype,
        }));

      cols.push({ title: "Thao tác", key: "actions", fieldtype: "Actions" });
      return cols;
    };

    const columns = mapColumns(meta.fields);

    const fieldnames = meta.fields.map((f) => f.fieldname).filter(Boolean);
    const response = await frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: listview.doctype,
        fields: ["name", ...fieldnames],
        limit_page_length: 1000,
        order_by: "creation desc",
      },
    });

    const rows =
      response.message?.map((r, i) => ({
        stt: i + 1,
        docType: listview.doctype,
        ...r,
      })) || [];

    const renderVue = () => {
      if (listview.vue_list) listview.vue_list.destroy();

      listview.vue_list = new tahp.ui.CustomSemiFinishedProductsComponent({
        wrapper: $wrapper[0],
        rows,
        columns,
      });
    };

    renderVue();

    const originalRefresh = listview.refresh;
    listview.refresh = function (...args) {
      const result = originalRefresh.apply(this, args);
      frappe.after_ajax(() => renderVue());
      return result;
    };
  },
};
