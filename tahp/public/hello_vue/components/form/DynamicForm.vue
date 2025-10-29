<template>
  <div class="tw-border tw-border-blue-300 tw-rounded-md tw-bg-white tw-shadow-sm tw-p-4 tw-space-y-6">
    <h3 v-if="title"
      class="tw-text-base tw-font-semibold tw-text-blue-700 tw-border-b tw-border-blue-200 tw-pb-2 tw-uppercase">
      {{ title }}
    </h3>

    <a-form layout="vertical" class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-4">
      <template v-for="field in visibleFields" :key="field.fieldname">
        <a-form-item :label="field.label" :required="!!field.reqd"
          :class="field.fullWidth ? 'sm:tw-col-span-2 lg:tw-col-span-4' : ''">
          <a-input v-if="['Data', 'Link'].includes(field.fieldtype)" v-model:value="doc[field.fieldname]"
            :placeholder="field.label" :disabled="!!field.read_only" />

          <a-textarea v-else-if="['Small Text', 'Long Text', 'Text'].includes(field.fieldtype)"
            v-model:value="doc[field.fieldname]" :rows="3" :placeholder="field.label" :disabled="!!field.read_only" />

          <a-input-number v-else-if="['Int', 'Float', 'Currency'].includes(field.fieldtype)"
            v-model:value="doc[field.fieldname]" class="tw-w-full" :min="0" :disabled="!!field.read_only" />

          <a-date-picker v-else-if="field.fieldtype === 'Date'"
            :value="doc[field.fieldname] ? dayjs(doc[field.fieldname]) : null"
            @update:value="val => (doc[field.fieldname] = val ? val.format('YYYY-MM-DD') : null)" format="DD/MM/YYYY"
            class="tw-w-full" :disabled="!!field.read_only" />

          <a-select v-else-if="field.options && field.options.split('\n').length > 1"
            v-model:value="doc[field.fieldname]" :options="field.options
              .split('\n')
              .filter(o => o.trim() !== '')
              .map(o => ({ label: o, value: o }))" :disabled="!!field.read_only" show-search
            option-filter-prop="label" />

          <a-checkbox v-else-if="field.fieldtype === 'Check'" v-model:checked="doc[field.fieldname]"
            :disabled="!!field.read_only">
            {{ field.label }}
          </a-checkbox>
        </a-form-item>
      </template>
    </a-form>

    <div class="tw-border-t tw-border-blue-200 tw-pt-4">
      <h3 class="tw-text-base tw-font-semibold tw-text-blue-700 tw-border-b tw-border-blue-200 tw-pb-2 tw-mb-3">
        Danh sách đơn hàng chi tiết
      </h3>

      <div class="tw-flex tw-flex-wrap tw-gap-2 tw-items-center tw-mb-2 tw-justify-end">
        <a-button type="link" size="small" class="tw-text-blue-600 tw-flex tw-items-center tw-gap-1"
          @click="handleAddRow">
          <PlusCircleOutlined /> <span>Thêm mới</span>
        </a-button>

        <a-button type="link" size="small" class="tw-text-blue-600 tw-flex tw-items-center tw-gap-1"
          @click="handleStockCheck">
          <BarsOutlined /> <span>Tồn kho sản xuất</span>
        </a-button>
      </div>

      <div class="tw-overflow-x-auto">
        <a-table :columns="columns" :data-source="rows" bordered size="small" row-key="id" :pagination="false"
          class="tw-min-w-[800px] tw-mb-4">
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
        </a-table>
      </div>
    </div>

    <div class="tw-flex tw-flex-col sm:tw-flex-row tw-justify-end tw-items-center tw-gap-2 tw-mt-4">
      <a-button type="default" class="tw-flex tw-items-center tw-gap-1 tw-w-full sm:tw-w-auto" @click="handleBack">
        <RollbackOutlined /> <span>Quay lại</span>
      </a-button>

      <a-button type="primary" class="tw-flex tw-items-center tw-gap-1 tw-w-full sm:tw-w-auto" @click="handleSave">
        <SaveOutlined /> <span>Lưu</span>
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import dayjs from "dayjs";
import {
  SaveOutlined,
  RollbackOutlined,
  PlusCircleOutlined,
  BarsOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";

const props = defineProps({
  frm: { type: Object, required: true },
  title: { type: String, default: "THÔNG TIN ĐƠN HÀNG" },
});

const doc = ref({ ...props.frm.doc });

const visibleFields = computed(() =>
  props.frm.meta.fields.filter(
    (f) =>
      f.label &&
      !["Section Break", "Column Break", "HTML", "Table"].includes(f.fieldtype) &&
      !["owner", "creation", "modified", "modified_by", "_assign", "_comments"].includes(f.fieldname)
  )
);

watch(
  doc,
  (val) => {
    Object.assign(props.frm.doc, val);
  },
  { deep: true }
);

const rows = ref([
  {
    id: 1,
    order_detail_code: "MANH_QUAN_251001",
    item_code: "EIAIW050_A_25",
    item_name: "Dây đồng điện tử 1EI/AIW - 0.50mm - Cu/PET",
    status: "Đã tạo lệnh sản xuất",
    qty_required: 500,
    stock_available: 20,
    stock_pending: 20,
    stock_pending_hold: 5,
    stock_hold_1: 10,
    internal_prod_qty: 15,
    internal_hold_qty: 3,
    total_hold: 13,
    uom: "Cuộn",
    created_date: "09/10/2025",
    delivery_date: "18/10/2025",
  },
]);

const columns = [
  { title: "STT", dataIndex: "id", key: "id", width: 60, align: "center" },
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
    title: "Số lượng khả dụng ở LSX nội bộ (chưa nhập kho)",
    dataIndex: "internal_prod_qty",
    key: "internal_prod_qty",
    align: "right",
  },
  {
    title: "Số lượng sẽ giữ ở LSX nội bộ (chưa nhập kho) (2)",
    dataIndex: "internal_hold_qty",
    key: "internal_hold_qty",
    align: "right",
  },
  { title: "Số lượng giữ (3) = (1) + (2)", dataIndex: "total_hold", key: "total_hold", align: "right" },
  { title: "Đơn vị tính", dataIndex: "uom", key: "uom", align: "center" },
  { title: "Ngày tạo", dataIndex: "created_date", key: "created_date", align: "center" },
  { title: "Ngày giao hàng", dataIndex: "delivery_date", key: "delivery_date", align: "center" },
  { title: "Thao tác", key: "actions", align: "center", width: 90 },
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
    uom: "",
    created_date: dayjs().format("DD/MM/YYYY"),
    delivery_date: "",
  });
}

function handleStockCheck() {
  frappe.msgprint("📦 Kiểm tra tồn kho sản xuất");
}

function handleBack() {
  frappe.set_route("List", props.frm.doctype);
}

function handleSave() {
  frappe.msgprint("💾 Dữ liệu đã được lưu");
}

function editRow(record) {
  frappe.msgprint(`Chỉnh sửa: ${record.item_code}`);
}

function deleteRow(record) {
  rows.value = rows.value.filter((r) => r.id !== record.id);
}
</script>


<style scoped>
.ant-form-item {
  margin-bottom: 12px;
}

.ant-table {
  font-size: 13px;
}

:deep(.ant-table-thead > tr > th) {
  background-color: #e6f4ff !important;
  color: #003a8c; 
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
}

:deep(.ant-table-cell) {
  border-color: #d9e8ff !important;
}

.ant-btn-link {
  padding: 0 !important;
  height: auto !important;
}

:deep(.ant-input),
:deep(.ant-input-number-input),
:deep(.ant-select-selector),
:deep(textarea.ant-input) {
  background-color: #f5f5f5 !important;
  border-color: #d9d9d9 !important;
  border-radius: 6px;
  color: #000;
}

:deep(.ant-input[disabled]),
:deep(.ant-input[readonly]) {
  background-color: #f0f0f0 !important;
  color: #555 !important;
}
</style>

