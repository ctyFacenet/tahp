<template>
  <div class="tw-flex tw-gap-4 tw-p-4 tw-bg-gray-50 tw-min-h-screen">
    <div class="tw-w-[260px] tw-bg-white tw-rounded-xl tw-shadow tw-p-3">
      <TreeFilter :showDateFilter="false" />
    </div>

    <div class="tw-flex-1 tw-flex tw-flex-col tw-bg-white tw-rounded-xl tw-shadow tw-p-4 tw-overflow-hidden">
      <div class="tw-pb-2 tw-mb-3 tw-relative tw-shrink-0">
        <h2 class="tw-text-[14px] tw-font-semibold tw-text-gray-800 tw-uppercase tw-text-center">
          DANH SÁCH ĐƠN HÀNG TỔNG
        </h2>

        <div class="tw-absolute tw-top-0 tw-right-0 tw-flex tw-items-center tw-gap-2">
          <a-button type="link"
            class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
            <template #icon>
              <PlusOutlined />
            </template>
            Thêm mới
          </a-button>

          <a-dropdown trigger="click" placement="bottomRight">
            <template #overlay>
              <a-menu>
                <a-menu-item v-for="col in allColumns" :key="col.key" class="tw-text-[13px]">
                  <a-checkbox v-model:checked="visibleColumns[col.key]" @change="updateVisibleColumns">
                    {{ col.title }}
                  </a-checkbox>
                </a-menu-item>
              </a-menu>
            </template>

            <a-button type="text" class="tw-flex tw-items-center tw-justify-center tw-p-0" title="Chọn cột hiển thị">
              <CopyOutlined class="tw-text-[#2490ef] tw-text-[13px] hover:tw-text-[#1677c8]" />
            </a-button>
          </a-dropdown>

          <a-input v-model:value="searchKeyword" placeholder="Nhập thông tin để tìm kiếm"
            class="tw-w-[220px] tw-h-[28px] tw-text-[13px] tw-rounded-md tw-border-[#2490ef] focus:tw-shadow-none"
            size="small" allowClear>
            <template #prefix>
              <SearchOutlined class="tw-text-gray-400" />
            </template>
          </a-input>
        </div>
      </div>

      <div class="tw-flex-1 tw-w-full tw-h-full tw-overflow-hidden">
        <BaseTable :columns="displayedColumns" :rows="filteredRows" @view="onView" @edit="onEdit" @delete="onDelete" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from "vue";
import { PlusOutlined, CopyOutlined, SearchOutlined } from "@ant-design/icons-vue";
import BaseTable from "../../BaseTable.vue";
import TreeFilter from "../../TreeFilter.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const searchKeyword = ref("");

const allColumns = [
  { title: "Mã đơn hàng tổng", key: "masterordercode" },
  { title: "Ngày tạo đơn", key: "ordercreationdate", fieldtype: "Date" },
  { title: "Khách hàng", key: "customername" },
  { title: "Diễn giải", key: "orderdescription" },
  { title: "Số lượng yêu cầu", key: "requestedquantity" },
  { title: "Số lượng đã giao", key: "deliveredquantity" },
  { title: "Số lượng còn lại", key: "remainingquantity" },
  { title: "Ngày giao hàng", key: "deliverydate", fieldtype: "Date" },
  { title: "Nhân viên bán hàng", key: "salesperson" },
  { title: "Thao tác", key: "actions" },
];
const visibleColumns = reactive({});
allColumns.forEach((col) => (visibleColumns[col.key] = true));

const updateVisibleColumns = () => {
  displayedColumns.value = allColumns.filter((c) => visibleColumns[c.key]);
};
const displayedColumns = ref([...allColumns]);

const filteredRows = computed(() => {
  if (!searchKeyword.value.trim()) return props.rows;
  const key = searchKeyword.value.toLowerCase();
  return props.rows.filter((row) =>
    Object.values(row).some((val) => val?.toString().toLowerCase().includes(key))
  );
});

const onView = (row) => frappe.show_alert({ message: `Đã xem ${row.masterordercode}`, indicator: "green" });
const onEdit = (row) => frappe.show_alert({ message: `Đã chỉnh sửa ${row.masterordercode}`, indicator: "blue" });
const onDelete = (row) => {
  customConfirmModal({
    title: "Xác nhận xoá",
    message: `Bạn có chắc muốn xoá <b>${row.masterordercode}</b>?`,
    note: "Hành động này sẽ xoá vĩnh viễn dữ liệu khỏi hệ thống.",
    type: "danger",
    buttons: [
      {
        text: "Hủy",
        class: "btn-secondary",
        onClick: () => frappe.show_alert({ message: "Đã huỷ thao tác", indicator: "orange" }),
      },
      {
        text: "Xoá",
        class: "btn-danger",
        onClick: () => frappe.show_alert({ message: `Đã xoá ${row.masterordercode}`, indicator: "red" }),
      },
    ],
  });
};
</script>

<style scoped>
:deep(.ant-input-affix-wrapper) {
  height: 32px !important;
  font-size: 13px !important;
}
</style>
