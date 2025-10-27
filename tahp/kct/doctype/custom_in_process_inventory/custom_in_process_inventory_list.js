frappe.listview_settings["Custom In Process Inventory"] = {
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

    let $wrapper = $("#custom-inventory-balance");
    if (!$wrapper.length) {
      $wrapper = $('<div id="custom-inventory-balance"></div>').prependTo(
        listview.page.body
      );
    }

    const mapRows = (data = []) =>
      data.map((row) => ({
        name: row.name,
        warehouseName: row.warehousename,
        materialGroup: row.materialgroup,
        materialType: row.materialtype,
        materialCode: row.materialcode,
        materialName: row.materialname,
        classification: row.classification,
        openingBalance: row.openingbalance,
        quantityIn: row.quantityin,
        quantityOut: row.quantityout,
        closingBalance: row.closingbalance,
        stocktakingQuantity: row.stocktakingquantity,
        quantityDifference: row.quantitydifference,
        unitOfMeasure: row.unitofmeasure || 'Kg',
      }));

    const renderVue = () => {
      const rows = mapRows(listview.data || []);
      if (listview.vue_list) {
        listview.vue_list.destroy();
      }

      listview.vue_list = new tahp.ui.CustomInProcessInventoryComponent({
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
        console.log("⏳ Waiting for listview data...");
      }
    });
  },
};
