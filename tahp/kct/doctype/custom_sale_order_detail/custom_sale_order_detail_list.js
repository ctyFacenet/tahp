frappe.listview_settings["Custom Sale Order Detail"] = {
  onload(listview) {

    $(listview.page.body)
      .find(".list-row-container, .list-paging-area, .listview-control, .listview-header, .result, .page-form")
      .remove();
    listview.$result && listview.$result.hide();

    if (listview.vue_list) {
      listview.vue_list.destroy();
      listview.vue_list = null;
    }

    let $wrapper = $("#custom-sale-order-detail");
    if (!$wrapper.length) {
      $wrapper = $('<div id="custom-sale-order-detail"></div>').prependTo(listview.page.body);
    }

    const mapRows = (data = []) =>
      data.map((row) => ({
        docType: listview.doctype,
        name: row.name,
        detailOrderCode: row.detailordercode,
        status: row.status,
        detailOrderCreationDate: frappe.format(row.detailordercreationdate, { fieldtype: "Date" }),
        masterOrderCode: row.masterordercode,
        masterOrderCreationDate: frappe.format(row.masterordercreationdate, { fieldtype: "Date" }),
        customerCode: row.customercode,
        customerName: row.customername,
        productCode: row.productcode,
        productName: row.productname,
        requestedQuantity: row.requestedquantity,
        reservedQuantity: row.reservedquantity,
        requiredProductionQty: row.productionquantity,
        deliveredQuantity: row.deliveredquantity,
        remainingDeliveryQuantity: row.remainingdeliveryquantity,
        completedQuantity: row.completedquantity,
        unitOfMeasure: row.unitofmeasure,
        deliveryDate: frappe.format(row.deliverydate, { fieldtype: "Date" }),
      }));

    const renderVue = () => {
      const rows = mapRows(listview.data || []);
      if (listview.vue_list) {
        listview.vue_list.destroy();
      }

      listview.vue_list = new tahp.ui.CustomSaleOrderDetailListComponent({
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
