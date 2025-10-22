frappe.listview_settings["Custom Semi Finished Products"] = {
  onload(listview) {

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

    const mapRows = (data = []) =>
      data.map((row) => ({
        lotNumber: row.lotnumber,
        qrLabelCode: row.qrlabelcode,
        status: row.status,
        outputSfgCode: row.outputsfgcode,
        workOrderCode: row.workordercode,
        processCode: row.processcode,
        machineName: row.machinename,
        lineGroup: row.linegroup || 'VT1.3',
        productionShift: row.productionshift,
        operatorName: row.operatorname || 'Nguyen Van A',
        classification: row.classification || 'OK',
        actualOutputQuantity: row.actualoutputquantity,
        estimatedOutputQuantity: row.estimatedoutputquantity,
        grossWeight: row.grossweight || '0',
        unitOfMeasure: row.unitofmeasure || 'Kg',
        materialLotCode: row.materiallotcode,
        labelCreationDate: frappe.format(row.labelcreationdate, { fieldtype: "Date" }),
        labelCancellationDate: frappe.format(row.labelcancellationdate, { fieldtype: "Date" }),
      }));

    const renderVue = () => {
      const rows = mapRows(listview.data || []);
      if (listview.vue_list) {
        listview.vue_list.destroy();
      }

      listview.vue_list = new tahp.ui.CustomSemiFinishedProductsComponent({
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
