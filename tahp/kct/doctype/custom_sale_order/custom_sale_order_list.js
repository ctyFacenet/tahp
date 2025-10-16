frappe.listview_settings["Custom Sale Order"] = {
  onload(listview) {

    $(listview.page.body)
      .find(".list-row-container, .list-paging-area, .listview-control, .listview-header, .result, .page-form")
      .remove();

    listview.$result && listview.$result.hide();

    if (listview.vue_list) {
      listview.vue_list.destroy();
      listview.vue_list = null;
    }

    let $wrapper = $("#custom-sale-order");
    if (!$wrapper.length) {
      $wrapper = $('<div id="custom-sale-order"></div>').prependTo(listview.page.body);
    }

    const mapRows = (data = []) =>
      data.map((row) => ({
        masterordercode: row.masterordercode,
        ordercreationdate: frappe.format(row.ordercreationdate, { fieldtype: "Date" }),
        customername: row.customername,
        orderdescription: row.orderdescription,
        requestedquantity: row.requestedquantity,
        deliveredquantity: row.deliveredquantity,
        remainingquantity: row.remainingquantity,
        deliverydate: frappe.format(row.deliverydate, { fieldtype: "Date" }),
        salesperson: row.salesperson,
      }));

    const renderVue = () => {
      const rows = mapRows(listview.data || []);

      if (listview.vue_list) {
        listview.vue_list.destroy();
      }

      listview.vue_list = new tahp.ui.CustomSaleOrderComponent({
        wrapper: $wrapper[0],
        rows,
      });
    };

    const originalRefresh = listview.refresh;
    listview.refresh = function (...args) {
      const result = originalRefresh.apply(this, args);
      frappe.after_ajax(() => {
        console.log("🔄 Data refreshed → re-render Vue");
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
