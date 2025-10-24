frappe.listview_settings["Custom Work Order Approved"] = {
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

    let $wrapper = $("#custom-work-order-approved");
    if (!$wrapper.length) {
      $wrapper = $('<div id="custom-work-order-approved"></div>').prependTo(listview.page.body);
    }

    const mapRows = (data = []) =>
      data.map((row) => ({
        workOrderCode: row.workordercode, // Mã lệnh sản xuất
        status: row.status, // Trạng thái
        itemCode: row.productcode, // Mã hàng
        itemName: row.productname, // Tên hàng
        canCode: row.can, // CAN
        kdaiCode: row.kdai, // KDAI
        ktrungCode: row.ktrung, // KTRUNG
        ktieuCode: row.ktieu, // KTIEU
        mahzCode: row.mahz, // MAHZ
        malhCode: row.malh, // MALH
        mavtCode: row.mavt, // MAVT
        actualStartTime: frappe.format(row.actualstarttime, { fieldtype: "Datetime" }), // Thời gian bắt đầu sản xuất thực tế
        actualEndTime: frappe.format(row.actualendtime, { fieldtype: "Datetime" }), // Thời gian kết thúc sản xuất thực tế
        productionQuantity: row.productionquantity, // Số lượng sản xuất
        estimatedOutputQuantity: row.estimatedoutputquantity, // Số lượng đầu ra ước tính
        estimatedOkQuantity: row.estimatedokquantity, // Số lượng OK ước tính
        estimatedNgQuantity: row.estimatedngquantity, // Số lượng NG ước tính
        actualOutputQuantity: row.actualoutputquantity, // Số lượng đầu ra thực tế
        actualOkQuantity: row.actualokquantity, // Số lượng OK thực tế
        actualNgQuantity: row.actualngquantity, // Số lượng NG thực tế
        unitOfMeasure: row.unitofmeasure, // Đơn vị tính
        createdBy: row.createdby, // Người tạo lệnh
      }));

    const renderVue = () => {
      const rows = mapRows(listview.data || []);
      if (listview.vue_list) listview.vue_list.destroy();

      listview.vue_list = new tahp.ui.CustomWorkOrderApprovedComponent({
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
