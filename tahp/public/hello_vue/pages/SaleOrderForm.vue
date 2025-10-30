<template>
  <BaseFormWithTable :frm="frm" title="THÔNG TIN ĐƠN HÀNG TỔNG">
    <template #table>
      <BaseDataTable
        title="Danh sách đơn hàng chi tiết"
        :columns="columns"
        :rows="rows"
        :scroll-x="2000"
      >
        <template #actions>
          <a-button type="link" size="small" class="tw-text-blue-600 tw-flex tw-items-center tw-gap-1"
            @click="handleAddRow">
            <PlusCircleOutlined /> <span>Thêm mới</span>
          </a-button>
          <a-button type="link" size="small" class="tw-text-blue-600 tw-flex tw-items-center tw-gap-1"
            @click="handleStockCheck">
            <BarsOutlined /> <span>Kiểm tra tồn kho</span>
          </a-button>
        </template>

        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" class="tw-px-1" @click="editRow(record)">
                <EditOutlined />
              </a-button>
              <a-button type="link" size="small" danger class="tw-px-1" @click="deleteRow(record)">
                <DeleteOutlined />
              </a-button>
            </a-space>
          </template>
        </template>
      </BaseDataTable>
    </template>
  </BaseFormWithTable>
</template>

<script setup>
import { ref } from "vue";
import dayjs from "dayjs";
import BaseFormWithTable from "../components/common/BaseFormWithTable.vue";
import BaseDataTable from "../components/common/BaseDataTable.vue";
import { orderDetails } from "../mock/orderDetails";
import {
  PlusCircleOutlined,
  BarsOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";

const frm = ref({
  doctype: "Custom Sale Order",
  doc: {
    customername: "CÔNG TY TNHH CÔNG NGHỆ JOHNSON HEALTH (VIỆT NAM)",
    order_code: "JOHNSON25104",
    order_date: "2025-10-22",
    delivery_date: "2025-10-25",
    qty_required: 350,
    qty_delivered: 0,
    qty_remaining: 350,
    salesperson: "Trần Tiến Đạt",
    note: "",
  },
  meta: {
    fields: [
      { fieldname: "customername", label: "Khách hàng", fieldtype: "Data", reqd: 1, fullWidth: true },
      { fieldname: "order_code", label: "Mã đơn hàng tổng", fieldtype: "Data", reqd: 1 },
      { fieldname: "order_date", label: "Ngày tạo đơn hàng tổng", fieldtype: "Date", reqd: 1 },
      { fieldname: "delivery_date", label: "Ngày giao hàng", fieldtype: "Date", reqd: 1 },
      { fieldname: "qty_required", label: "Số lượng yêu cầu", fieldtype: "Int", reqd: 1 },
      { fieldname: "qty_delivered", label: "Số lượng đã giao", fieldtype: "Int" },
      { fieldname: "qty_remaining", label: "Số lượng còn lại", fieldtype: "Int" },
      { fieldname: "salesperson", label: "Nhân viên bán hàng", fieldtype: "Data" },
      { fieldname: "note", label: "Diễn giải", fieldtype: "Long Text", fullWidth: true },
    ],
  },
});

const rows = ref(orderDetails);

const columns = [
  { title: "STT", dataIndex: "id", key: "id", align: "center", width: 60, fixed: "left" },
  { title: "Mã đơn chi tiết", dataIndex: "order_detail_code", key: "order_detail_code" },
  { title: "Mã hàng", dataIndex: "item_code", key: "item_code" },
  { title: "Tên hàng", dataIndex: "item_name", key: "item_name" },
  { title: "Trạng thái", dataIndex: "status", key: "status" },
  { title: "Số lượng yêu cầu", dataIndex: "qty_required", key: "qty_required", align: "right" },
  { title: "Tồn kho khả dụng", dataIndex: "stock_available", key: "stock_available", align: "right" },
  { title: "Tồn kho lô nhỡ cân", dataIndex: "stock_pending", key: "stock_pending", align: "right" },
  { title: "Tồn kho lô nhỡ cân sẽ giữ", dataIndex: "stock_pending_hold", key: "stock_pending_hold", align: "right" },
  { title: "Tồn kho sẽ giữ (1)", dataIndex: "stock_hold_1", key: "stock_hold_1", align: "right" },
  {
    title: "Số lượng khả dụng ở lệnh sản xuất nội bộ (chưa nhập kho)",
    dataIndex: "internal_prod_qty",
    key: "internal_prod_qty",
    align: "right",
  },
  {
    title: "Số lượng sẽ giữ ở lệnh sản xuất nội bộ (chưa nhập kho) (2)",
    dataIndex: "internal_hold_qty",
    key: "internal_hold_qty",
    align: "right",
  },
  {
    title: "Số lượng giữ (3) = (1) + (2)",
    dataIndex: "total_hold",
    key: "total_hold",
    align: "right",
  },
  { title: "Đơn vị tính", dataIndex: "uom", key: "uom", align: "center" },
  { title: "Ngày tạo", dataIndex: "created_date", key: "created_date", align: "center" },
  { title: "Ngày giao hàng", dataIndex: "delivery_date", key: "delivery_date", align: "center" },
  { title: "Thao tác", key: "actions", align: "center", width: 90, fixed: "right" },
];

function handleAddRow() {
  const next = rows.value.length + 1;
  rows.value.push({
    id: next,
    order_detail_code: "",
    item_code: "",
    item_name: "",
    status: "Mới",
    qty_required: 0,
    stock_available: 0,
    stock_pending: 0,
    stock_pending_hold: 0,
    stock_hold_1: 0,
    internal_prod_qty: 0,
    internal_hold_qty: 0,
    total_hold: 0,
    uom: "Kg",
    created_date: dayjs().format("DD/MM/YYYY"),
    delivery_date: "",
  });
}

function handleStockCheck() {
  frappe.msgprint("Kiểm tra tồn kho sản xuất");
}

function editRow(record) {
  frappe.msgprint(`Chỉnh sửa: ${record.item_code}`);
}

function deleteRow(record) {
  rows.value = rows.value.filter((r) => r.id !== record.id);
}
</script>

<style scoped>
.tw-text-blue-600 {
  color: #003a8c !important;
}
</style>
