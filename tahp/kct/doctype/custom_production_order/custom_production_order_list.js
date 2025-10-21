frappe.listview_settings["Custom Production Order"] = {
  onload(listview) {
    $(listview.page.body)
      .find(
        ".list-row-container, .list-paging-area, .listview-control, .listview-header, .result, .page-form"
      )
      .remove();
    listview.$result && listview.$result.hide();

    if (listview.vue_list) {
      listview.vue_list.destroy();
      listview.vue_list = null;
    }

    let $wrapper = $("#custom-product-order");
    if (!$wrapper.length) {
      $wrapper = $('<div id="custom-product-order"></div>').prependTo(listview.page.body);
    }

    const mapRows = (data = []) =>
      data.map((row) => ({
        productCode: row.productcode,
        status: row.status,
        productionOrderCode: row.productionordercode,
        detailOrderCode: row.detailordercode,
        productionOrderType: row.productionordertype,
        productionOrderCreationDate: frappe.format(row.productionordercreationdate, { fieldtype: "Date" }),
        productName: row.productname,
        bomCode: row.bomcode,
        requiredProductionQuantity: row.requiredproductionquantity,
        createdWorkOrderQuantity: row.createdworkorderquantity,
        uncreatedWorkOrderQuantity: row.uncreatedworkorderquantity,
        completedQuantity: row.completedquantity,
        unitOfMeasure: row.unitofmeasure,
        createdBy: row.createdby,
        expectedProductionEndDate: frappe.format(row.expectedproductionenddate, { fieldtype: "Date" }),
      }));


    const renderVue = () => {
      const rows = mapRows(listview.data || []);

      if (listview.vue_list) {
        listview.vue_list.destroy();
      }

      listview.vue_list = new tahp.ui.CustomProductOrderComponent({
        wrapper: $wrapper[0],
        rows,
      });
    };

    const originalRefresh = listview.refresh;
    listview.refresh = function (...args) {
      const result = originalRefresh.apply(this, args);
      frappe.after_ajax(() => {
        renderVue();
      });
      return result;
    };

    frappe.after_ajax(() => {
      if (listview.data && listview.data.length) {
        renderVue();
      } else {
        console.log("⏳ Waiting for Custom Production Order data...");
      }
    });
  },
};
