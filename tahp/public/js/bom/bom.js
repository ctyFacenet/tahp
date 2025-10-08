frappe.ui.form.on('BOM', {
  async custom_qc_template(frm) {
    if (!frm.doc.custom_qc_template) {
      frm.clear_table("custom_params");
      frm.refresh_field("custom_params");
      return;
    }

    let template = await frappe.db.get_doc('Quality Inspection Template', frm.doc.custom_qc_template);
    frm.clear_table("custom_params");

    (template.item_quality_inspection_parameter || []).forEach(param => {
      let row = frm.add_child("custom_params");
      row.specification = param.specification;
      row.custom_left = param.custom_left;
      row.custom_left_value = param.custom_left_value;
      row.custom_right = param.custom_right;
      row.custom_right_value = param.custom_right_value;
      row.custom_unit = param.custom_unit;
    });

    frm.refresh_field("custom_params");
  },

  custom_is_templated_filtered: function (frm) {
    frm.set_query("custom_qc_template", () => {
      if (frm.doc.custom_is_templated_filtered) {
        return {
          filters: {
            custom_is_for_bom: 1
          }
        };
      }
      return {};
    });
  },

  refresh: function (frm) {
    frm.set_df_property("routing", "only_select", 1);

    if (!frm.vue_wrapper) {
      frm.vue_wrapper = $(`<div id="vue-test" style="padding:10px; border:1px solid #ddd"></div>`)
        .appendTo(frm.page.wrapper);
    }

    if (frm.vue_component) {
      frm.vue_component.destroy();
    }

    frm.vue_wrapper.empty();
    new tahp.ui.HelloWorldComponent({
      wrapper: frm.vue_wrapper
    });

    frm.add_custom_button("Open Wizard", () => {
      const d = new frappe.ui.Dialog({
        title: "Multi-step Wizard với Vue",
        size: "extra-large"
      });

      const wrapper = $('<div></div>').appendTo(d.body);

      new tahp.ui.WizardDialogComponent({
        wrapper,
        rows: [
          { item_code: "SP001", item_name: "Sản phẩm A", qty: 15 },
          { item_code: "SP002", item_name: "Sản phẩm B", qty: 3 },
          { item_code: "SP003", item_name: "Sản phẩm C", qty: 8 },
          { item_code: "SP004", item_name: "Sản phẩm D", qty: 18 },
          { item_code: "SP005", item_name: "Sản phẩm K", qty: 2 }
        ]
      });

      d.show();
    });

    frm.add_custom_button("Open Dialog", () => {
      const d = new frappe.ui.Dialog({
        title: "Thông tin công đoạn",
        size: "extra-large"
      });

      const wrapper = $('<div></div>').appendTo(d.body);

      new tahp.ui.ProductionInfoDialogComponent({
        wrapper,
        status: "Chờ sản xuất",
        headerFields: {
          "Mã lệnh sản xuất": "WO_EIAW015_A_25_2506.43",
          "Mã công đoạn": "CAN",
          "Mã BTP đầu ra": "BTP.DAYDONG5.6A",
          "Số lượng sản xuất": "200",
          "Đơn vị tính": "Kg",
          "Tên BTP đầu ra": "Dây đồng điện tử 5.6mm PT25",
          "Thời gian bắt đầu dự kiến": "08:00 25/06/2025",
          "Thời gian kết thúc dự kiến": "17:00 25/06/2025",
        },
        colsInput: ["STT", "Mã QR code", "Mã vật tư", "Tên vật tư", "Lot NVL", "Định mức đầu vào", "Số lượng yêu cầu", "Số lượng nhận", "Đơn vị tính"],
        rowsInput: [
          ["1", "2000000992638", "DAYDONG2.6A", "Dây đồng thiếc 2.6", "20250607", "1.02051", "204.0102", "205", "Kg"],
          ["2", "1000000938844", "M.TEREBEC", "Men El Elantas", "30929.49", "1.71", "342", "342", "Kg"],
        ],
        colsResult: ["STT", "Nhân viên chạy máy", "Máy", "Nhóm line", "Ca", "Thời gian bắt đầu", "Thời gian kết thúc", "SL đầu ra ước tính", "OK ước tính", "NG ước tính", "SL đầu ra thực tế", "OK thực tế", "NG thực tế", "ĐVT"],
        rowsResult: [
          ["1", "Nguyễn Văn Tú", "CAN1.1", "CAN1.1", "Ca 1", "08:05 26/06/2025", "20:31 26/06/2025", "105", "100", "5", "100", "100", "0", "Kg"]
        ],
        footerResult: ["", "", "", "", "", "", "", "220", "211", "9", "205", "200", "200", "Kg"],
        colsReason: ["STT", "Nhân viên", "Máy", "Nhóm line", "Ca", "Nguyên nhân", "Phân loại", "Thời gian bắt đầu", "Thời gian kết thúc", "Thời gian dừng (phút)"],
        rowsReason: [
          ["1", "Nguyễn Văn Tú", "CAN1.1", "CAN1.1", "Ca 1", "Lỗi đứt dây trong khi sấy", "Hỏng", "10:05 26/06/2025", "10:35 26/06/2025", "30.5"],
        ],
        colsScrap: ["STT", "Mã BTP đầu ra", "Tên BTP đầu ra", "Mã lỗi", "Tên lỗi", "Nguyên nhân lỗi", "Số lượng", "ĐVT", "Nhân viên", "Ca", "Ngày khai báo", "Ghi chú", "Thao tác"],
        rowsScrap: [
          ["1", "EIAW015_A_25", "Dây đồng điện tử 0.15mm PT25", "DIR001", "Đường kính nhỏ", "Không kiểm tra dies", "48", "Kg", "Trần Tiến Đạt", "Ca 1", "19/08/2025", "", "🗑️"]
        ],
        colsCancel: ["STT", "Mã tem QR", "Trạng thái", "Mã BTP đầu ra", "Lot", "Số lượng thực tế", "ĐVT", "Nhân viên", "Thao tác"],
        rowsCancel: [
          ["1", "200000000000369368", "Chờ hủy", "BTP.DAYDONG5.6A", "20250627", "57", "Kg", "Nguyễn Thị Uyên", "🚫"]
        ],
        formLabel: {
          qrCode: "200000000000369371",
          btpCode: "BTP.DAYDONG5.6A",
          orderCode: "WO_EIAW015_A_25_2506.43",
          operationCode: "CAN",
          lot: "20250719",
          materialLot: "NVL_20250719.2",
          shift: "Ca 1",
          machine: "CAN1",
          lineGroup: "CAN1.1",
          quantity: 52,
          unit: "Kg",
          operator: "Nguyễn Thị Uyên",
          printDate: "28/06/2025",
          ballWeight: "",
          classification: "OK",
          errorName: "",
        }
      });

      d.show();
    });

    frm.add_custom_button("Open CRUD Vue", () => {
      const d = new frappe.ui.Dialog({
        title: "Demo CRUD Vue",
        size: "extra-large"
      });

      const wrapper = $('<div></div>').appendTo(d.body);
      new tahp.ui.CrudItemDemoComponent({
        wrapper,
      });
      d.show();
    });
  },

  with_operations: function (frm) {
    frm.set_df_property("fg_based_operating_cost", "hidden", 1);
  }
});
