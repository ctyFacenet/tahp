<template>
  <BaseFormWithTable :frm="frm" title="THÔNG TIN LỆNH SẢN XUẤT">
    <template #tabs>
      <BaseTabsCard>
        <a-tab-pane key="1" tab="Danh sách đơn sản xuất">
          <BaseDataTable title="Danh sách đơn sản xuất" :columns="columnsOrders" :rows="rowsOrders" :scroll-x="1200">
            <template #actions>
              <a-button type="link" size="small" class="tw-text-blue-600 tw-flex tw-items-center tw-gap-1"
                @click="addOrderRow">
                <PlusCircleOutlined /> <span>Thêm đơn SX</span>
              </a-button>
            </template>
          </BaseDataTable>
        </a-tab-pane>

        <a-tab-pane key="2" tab="Danh sách công đoạn">
          <BaseDataTable title="Danh sách công đoạn" :columns="columnsProcesses" :rows="rowsProcesses" :scroll-x="1800">
            <template #actions>
              <a-button type="link" size="small" class="tw-text-blue-600 tw-flex tw-items-center tw-gap-1"
                @click="addProcessRow">
                <PlusCircleOutlined /> <span>Thêm công đoạn</span>
              </a-button>
            </template>
          </BaseDataTable>
        </a-tab-pane>

        <a-tab-pane key="3" tab="Danh sách nguyên vật liệu">
          <BaseDataTable title="Danh sách nguyên vật liệu" :columns="columnsMaterials" :rows="rowsMaterials"
            :scroll-x="1500">
            <template #actions>
              <a-button type="link" size="small" class="tw-text-blue-600 tw-flex tw-items-center tw-gap-1"
                @click="addMaterialRow">
                <PlusCircleOutlined /> <span>Thêm NVL</span>
              </a-button>
            </template>
          </BaseDataTable>
        </a-tab-pane>
      </BaseTabsCard>
    </template>
  </BaseFormWithTable>
</template>

<script setup>
import { ref } from "vue";
import BaseFormWithTable from "../components/common/BaseFormWithTable.vue";
import BaseDataTable from "../components/common/BaseDataTable.vue";
import BaseTabsCard from "../components/common/BaseTabsCard.vue";
import { PlusCircleOutlined } from "@ant-design/icons-vue";

const frm = ref({
  doctype: "Custom Work Order",
  doc: {
    work_order_code: "WO_EIAIW050_A_25_251030.1",
    item_code: "EIAIW050_A_25",
    item_name: "Dây đồng điện tử 1EI/AIW - 0.50mm - A - PT25",
    qty_production: 300,
    date_create: "2025-10-30",
    start_date: "2025-10-30",
    end_date: "2025-11-02",
    uom: "Kg",
    created_by: "nambv@kct.vn",
  },
  meta: {
    fields: [
      { fieldname: "work_order_code", label: "Mã lệnh sản xuất", fieldtype: "Data", reqd: 1 },
      { fieldname: "item_code", label: "Mã hàng", fieldtype: "Data" },
      { fieldname: "item_name", label: "Tên hàng", fieldtype: "Data", fullWidth: true },
      { fieldname: "qty_production", label: "Số lượng sản xuất", fieldtype: "Int" },
      { fieldname: "date_create", label: "Ngày tạo lệnh", fieldtype: "Date" },
      { fieldname: "start_date", label: "Ngày bắt đầu sản xuất dự kiến", fieldtype: "Date" },
      { fieldname: "end_date", label: "Ngày kết thúc sản xuất dự kiến", fieldtype: "Date" },
      { fieldname: "uom", label: "Đơn vị tính", fieldtype: "Data" },
      { fieldname: "created_by", label: "Người tạo lệnh", fieldtype: "Data", fullWidth: true },
    ],
  },
});

const rowsOrders = ref([
  {
    id: 1,
    work_order_code: "MO_KCT_251026",
    priority: 1,
    end_date: "02/11/2025",
    qty_unassigned: 300,
    qty_production: 300,
    qty_done: 300,
    uom: "Kg",
  },
]);

const columnsOrders = [
  { title: "STT", dataIndex: "id", key: "id", align: "center", width: 60 },
  { title: "Mã đơn sản xuất", dataIndex: "work_order_code", key: "work_order_code" },
  { title: "Thứ tự ưu tiên", dataIndex: "priority", key: "priority", align: "center" },
  { title: "Ngày kết thúc sản xuất dự kiến", dataIndex: "end_date", key: "end_date", align: "center" },
  { title: "Số lượng chưa tạo lệnh sản xuất", dataIndex: "qty_unassigned", key: "qty_unassigned", align: "right" },
  { title: "Số lượng sản xuất", dataIndex: "qty_production", key: "qty_production", align: "right" },
  { title: "Số lượng hoàn thành", dataIndex: "qty_done", key: "qty_done", align: "right" },
  { title: "Đơn vị tính", dataIndex: "uom", key: "uom", align: "center" },
];

function addOrderRow() {
  const next = rowsOrders.value.length + 1;
  rowsOrders.value.push({
    id: next,
    work_order_code: "",
    priority: next,
    end_date: "",
    qty_unassigned: 0,
    qty_production: 0,
    qty_done: 0,
    uom: "Kg",
  });
}

const rowsProcesses = ref([
  {
    id: 1,
    process_code: "MALH",
    process_name: "Mạ Liên hoàn",
    machine: "LH1",
    line: "LH1.4",
    bobbin: 14,
    time_standard: 1.23,
    time_replace_enamel: 120,
    time_replace_core: 110,
    time_production: 599,
    time_start: "08:27:53 30/10/2025",
    time_end: "18:26:53 30/10/2025",
    qty_output: 300,
  },
]);

const columnsProcesses = [
  { title: "STT", dataIndex: "id", key: "id", align: "center", width: 60 },
  { title: "Mã công đoạn", dataIndex: "process_code", key: "process_code" },
  { title: "Tên công đoạn", dataIndex: "process_name", key: "process_name" },
  { title: "Máy", dataIndex: "machine", key: "machine", align: "center" },
  { title: "Nhóm line", dataIndex: "line", key: "line", align: "center" },
  { title: "Số bobbin", dataIndex: "bobbin", key: "bobbin", align: "right" },
  { title: "Định mức thời gian sản xuất (phút)", dataIndex: "time_standard", key: "time_standard", align: "right" },
  { title: "Thời gian chờ thay men (phút)", dataIndex: "time_replace_enamel", key: "time_replace_enamel", align: "right" },
  { title: "Thời gian chờ thay cỡ (phút)", dataIndex: "time_replace_core", key: "time_replace_core", align: "right" },
  { title: "Thời gian cần để sản xuất (phút)", dataIndex: "time_production", key: "time_production", align: "right" },
  { title: "Thời gian bắt đầu dự kiến", dataIndex: "time_start", key: "time_start", align: "center" },
  { title: "Thời gian kết thúc dự kiến", dataIndex: "time_end", key: "time_end", align: "center" },
  { title: "Số lượng sản xuất (Kg)", dataIndex: "qty_output", key: "qty_output", align: "right" },
];

function addProcessRow() {
  const next = rowsProcesses.value.length + 1;
  rowsProcesses.value.push({
    id: next,
    process_code: "",
    process_name: "",
    machine: "",
    line: "",
    bobbin: 0,
    time_standard: 0,
    time_replace_enamel: 0,
    time_replace_core: 0,
    time_production: 0,
    time_start: "",
    time_end: "",
    qty_output: 0,
  });
}

const rowsMaterials = ref(
  Array.from({ length: 20 }, (_, i) => {
    const id = i + 1;
    const materialList = [
      { code: "EIAIW120_A_25", name: "Dây đồng điện tử 1EI/AIW - 1.2mm - A - PT25", uom: "Kg" },
      { code: "M.E.7340AX", name: "Voltatex 7340AX (EIW)", uom: "Kg" },
      { code: "DB.CR107", name: "Dầu bóng CR - 107", uom: "Kg" },
      { code: "TUIBONGPT25", name: "Túi bóng trùm bobbin PT25", uom: "Cái" },
      { code: "HOPPT25", name: "Hộp carton loại PT25", uom: "Cái" },
    ];
    const m = materialList[i % materialList.length];
    const baseQty = [300, 250, 150, 600, 300][i % 5];

    return {
      id,
      material_code: `${m.code}_${String(id).padStart(2, "0")}`,
      material_name: `${m.name} - Lô ${String(id).padStart(3, "0")}`,
      input_rate: 0.5 + Math.random() * 1.5,
      qty_required: baseQty + Math.floor(Math.random() * 200),
      uom: m.uom,
    };
  })
);


const columnsMaterials = [
  { title: "STT", dataIndex: "id", key: "id", align: "center", width: 60 },
  { title: "Mã vật tư", dataIndex: "material_code", key: "material_code" },
  { title: "Tên vật tư", dataIndex: "material_name", key: "material_name" },
  { title: "Định mức đầu vào", dataIndex: "input_rate", key: "input_rate", align: "right" },
  { title: "Số lượng cần cho sản xuất", dataIndex: "qty_required", key: "qty_required", align: "right" },
  { title: "Đơn vị tính", dataIndex: "uom", key: "uom", align: "center" },
];

function addMaterialRow() {
  const next = rowsMaterials.value.length + 1;
  rowsMaterials.value.push({
    id: next,
    material_code: "",
    material_name: "",
    input_rate: 0,
    qty_required: 0,
    uom: "Kg",
  });
}
</script>

<style scoped>
.tw-text-blue-600 {
  color: #003a8c !important;
}
</style>
