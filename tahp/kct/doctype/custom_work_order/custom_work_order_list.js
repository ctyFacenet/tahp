frappe.listview_settings["Custom Work Order"] = {
  onload(listview) {
    $(listview.page.body)
      .find(".list-row-container, .list-paging-area, .listview-control, .listview-header, .result, .page-form")
      .remove();

    listview.$result && listview.$result.hide();

    if (listview.vue_list) {
      listview.vue_list.destroy();
      listview.vue_list = null;
    }

    let $wrapper = $("#custom-work-order");
    if (!$wrapper.length) {
      $wrapper = $('<div id="custom-work-order"></div>').prependTo(listview.page.body);
    }

    const mapRows = (data = []) =>
      data.map((row) => ({
        name: row.name,
        workOrderCode: row.workordercode,
        status: row.status,
        itemCode: row.productcode,
        itemName: row.productname,
        workOrderCreationDate: frappe.format(row.workordercreationdate, { fieldtype: "Date" }),
        plannedStartDate: frappe.format(row.plannedstartdate, { fieldtype: "Date" }),
        plannedEndDate: frappe.format(row.plannedenddate, { fieldtype: "Date" }),
        productionQuantity: row.productionquantity,
        completedQuantity: row.completedquantity,
        unitOfMeasure: row.unitofmeasure,
        createdBy: row.createdby,
      }));

    const renderVue = () => {
      const rows = mapRows(listview.data || []);
      if (listview.vue_list) listview.vue_list.destroy();

      listview.vue_list = new tahp.ui.CustomWorkOrderComponent({
        wrapper: $wrapper[0],
        rows,
      });
    };

    const originalRefresh = listview.refresh;
    listview.refresh = function (...args) {
      const result = originalRefresh.apply(this, args);
      frappe.after_ajax(() => renderVue());
      return result;
    };

    frappe.after_ajax(() => {
      if (listview.data && listview.data.length) renderVue();
    });
  },
};
