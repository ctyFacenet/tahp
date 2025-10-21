frappe.listview_settings["Custom Statistical Report"] = {
  onload(listview) {

    $(listview.page.body)
      .find(".list-row-container, .list-paging-area, .listview-control, .listview-header, .result, .page-form")
      .remove();

    listview.$result && listview.$result.hide();

    if (listview.vue_list) {
      listview.vue_list.destroy();
      listview.vue_list = null;
    }

    let $wrapper = $("#custom-statistical-report");
    if (!$wrapper.length) {
      $wrapper = $('<div id="custom-statistical-report"></div>').prependTo(listview.page.body);
    }


    const renderVue = () => {
      const rows = [];

      if (listview.vue_list) {
        listview.vue_list.destroy();
      }

      listview.vue_list = new tahp.ui.CustomStatisticalReportComponent({
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
