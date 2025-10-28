frappe.listview_settings["BOM"] = {
  hide_name_column: true,

  onload(listview) {

    if (listview.vue_list) listview.vue_list.destroy();
    if (listview.vue_grid) listview.vue_grid.destroy();

    const $list_wrapper = $('<div id="custom-bom-list"></div>')
      .prependTo(listview.page.body);

    listview.vue_list = new tahp.ui.CustomListComponent({
      wrapper: $list_wrapper,
    });

    const $grid_wrapper = $('<div id="custom-bom-grid" style="margin-top:20px"></div>')
      .appendTo(listview.page.body);

    const rows = [
      { item_code: "SP001", item_name: "Sản phẩm A", qty: 10 },
      { item_code: "SP002", item_name: "Sản phẩm B", qty: 15 },
      { item_code: "SP003", item_name: "Sản phẩm C", qty: 5 },
    ];

    listview.vue_grid = new tahp.ui.GridViewComponent({
      wrapper: $grid_wrapper,
      rows: rows,
    });
  },

  onrefresh(listview) {

    if (listview.vue_grid) {
      listview.vue_grid.destroy();
      const $grid_wrapper = $("#custom-bom-grid", listview.page.body);

      const rows = [
        { item_code: "SP001", item_name: "Sản phẩm A", qty: 10 },
        { item_code: "SP002", item_name: "Sản phẩm B", qty: 15 },
        { item_code: "SP003", item_name: "Sản phẩm C", qty: 5 },
      ];

      listview.vue_grid = new tahp.ui.GridViewComponent({
        wrapper: $grid_wrapper,
        rows: rows,
      });
    }
  },
};
