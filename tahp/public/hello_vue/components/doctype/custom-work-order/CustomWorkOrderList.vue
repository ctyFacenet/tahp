<template>
  <BaseLayout title="DANH SÁCH LỆNH SẢN XUẤT" :showDateFilter="false">
    <template #actions>
      <div class="tw-flex tw-items-center tw-gap-2 tw-flex-wrap">
        <a-dropdown trigger="click" placement="bottomRight">
          <template #overlay>
            <div
              class="tw-max-h-[300px] tw-max-w-[250px] tw-overflow-y-auto tw-overflow-x-auto tw-bg-white tw-rounded-md tw-shadow-lg tw-border tw-border-gray-200">
              <a-menu>
                <a-menu-item v-for="col in selectableColumns" :key="col.key"
                  class="tw-text-[13px] tw-whitespace-nowrap tw-flex tw-items-center">
                  <a-checkbox v-model:checked="visibleColumns[col.key]" @change="updateVisibleColumns">
                    {{ col.title }}
                  </a-checkbox>
                </a-menu-item>
              </a-menu>
            </div>
          </template>

          <a-button type="text" class="tw-flex tw-items-center tw-justify-center tw-p-0" title="Chọn cột hiển thị">
            <CopyOutlined class="tw-text-[#2490ef] tw-text-[13px] hover:tw-text-[#1677c8]" />
          </a-button>
        </a-dropdown>

        <a-input v-model:value="searchKeyword" placeholder="Nhập thông tin để tìm kiếm"
          class="tw-w-[200px] sm:tw-w-[300px] tw-h-[28px] tw-text-[13px] tw-rounded-sm tw-border-[#2490ef] focus:tw-shadow-none"
          size="small" allowClear>
          <template #prefix>
            <SearchOutlined class="tw-text-gray-400" />
          </template>
        </a-input>
      </div>
    </template>

    <BaseTable :columns="displayedColumns" :rows="filteredRows" :doctype="docType" :nameKey="'name'">
      <template #actions="{ row }">
        <div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
          <a-tooltip title="Xem chi tiết">
            <EyeOutlined class="tw-text-blue-600 hover:tw-text-blue-800 tw-cursor-pointer" @click="onView(row)" />
          </a-tooltip>

          <a-tooltip title="Phê duyệt">
            <FileDoneOutlined class="tw-text-green-600 hover:tw-text-green-800 tw-cursor-pointer" @click="onApproved(row)" />
          </a-tooltip>

          <a-tooltip title="Lập kế hoạch sản xuất">
            <CalendarOutlined class="tw-text-teal-600 hover:tw-text-teal-800 tw-cursor-pointer" @click="onPlan(row)" />
          </a-tooltip>

          <a-tooltip title="Xoá">
            <DeleteOutlined class="tw-text-red-600 hover:tw-text-red-800 tw-cursor-pointer" @click="onDelete(row)" />
          </a-tooltip>
        </div>
      </template>
    </BaseTable>
  </BaseLayout>
</template>

<script setup>
import BaseLayout from "../../layouts/BaseLayout.vue";
import BaseTable from "../../BaseTable.vue";
import {
  CopyOutlined,
  SearchOutlined,
  EyeOutlined,
  FileDoneOutlined,
  DeleteOutlined,
  CalendarOutlined,
} from "@ant-design/icons-vue";
import { ref, reactive, computed, watch } from "vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
});

const searchKeyword = ref("");
const docType = computed(() => props.rows?.[0]?.docType || "Custom Work Order");

const visibleColumns = reactive({});
watch(
  () => props.columns,
  (cols) => {
    cols?.forEach((c) => {
      if (visibleColumns[c.key] === undefined) visibleColumns[c.key] = true;
    });
  },
  { immediate: true, deep: true }
);

const selectableColumns = computed(() =>
  props.columns.filter((c) => !["actions"].includes(c.key))
);

const displayedColumns = computed(() =>
  props.columns.filter((c) => c.key === "actions" || visibleColumns[c.key])
);

const updateVisibleColumns = () => {};

const filteredRows = computed(() => {
  const key = searchKeyword.value.trim().toLowerCase();
  if (!key) return props.rows;
  return props.rows.filter((row) =>
    Object.values(row).some((val) =>
      val?.toString().toLowerCase().includes(key)
    )
  );
});

const onView = (row) =>
  frappe.show_alert({ message: `Xem ${row.name || row.workordercode}`, indicator: "blue" });

const onApproved = (row) =>
  frappe.show_alert({ message: `Phê duyệt ${row.name || row.workordercode}`, indicator: "green" });

const onPlan = (row) =>
  frappe.show_alert({ message: `Lập kế hoạch ${row.name || row.workordercode}`, indicator: "teal" });

const onDelete = (row) =>
  customConfirmModal({
    title: "Xác nhận xoá",
    message: `Bạn có chắc muốn xoá <b>${row.workordercode || row.name}</b>?`,
    note: "Hành động này không thể hoàn tác.",
    type: "danger",
    buttons: [
      {
        text: "Huỷ",
        class: "btn-secondary",
        onClick: () =>
          frappe.show_alert({ message: "Đã huỷ thao tác", indicator: "orange" }),
      },
      {
        text: "Xoá",
        class: "btn-danger",
        onClick: () =>
          frappe.show_alert({ message: `Đã xoá ${row.workordercode || row.name}`, indicator: "red" }),
      },
    ],
  });
</script>

<style scoped>
:deep(.ant-input-affix-wrapper) {
  height: 28px !important;
  font-size: 13px !important;
}
</style>
