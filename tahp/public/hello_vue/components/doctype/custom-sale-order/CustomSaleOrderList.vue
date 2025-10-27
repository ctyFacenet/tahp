<template>
  <BaseLayout title="Danh sách đơn hàng tổng" :showDateFilter="false">
    <template #actions>
      <div
        class="tw-flex tw-flex-wrap tw-items-center tw-justify-center sm:tw-justify-start tw-gap-2 tw-w-full sm:tw-w-auto">
        <a-button type="link"
          class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0"
          @click="createNewDoc">
          <PlusOutlined />
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
            <CopyOutlined class="tw-text-[#2490ef] tw-text-[15px] hover:tw-text-[#1677c8]" />
          </a-button>
        </a-dropdown>
      </div>

      <div class="tw-w-full sm:tw-w-[240px] md:tw-w-[300px]">
        <a-input v-model:value="searchKeyword" placeholder="Nhập thông tin để tìm kiếm"
          class="tw-h-[30px] tw-text-[13px] tw-rounded-sm tw-border-[#2490ef] focus:tw-shadow-none tw-w-full"
          size="small" allowClear>
          <template #prefix>
            <SearchOutlined class="tw-text-gray-400" />
          </template>
        </a-input>
      </div>
    </template>

    <BaseTable :columns="displayedColumns" :rows="filteredRows" @view="onView" @edit="onEdit" @delete="onDelete"
      :doctype="docType" :nameKey="'name'" />
  </BaseLayout>
</template>

<script setup>
import { ref, computed, reactive } from "vue";
import {
  PlusOutlined,
  CopyOutlined,
  SearchOutlined,
} from "@ant-design/icons-vue";
import BaseLayout from "../../layouts/BaseLayout.vue";
import BaseTable from "../../BaseTable.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const searchKeyword = ref("");
const docType = computed(() => props.rows?.[0]?.docType || "");

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
const displayedColumns = ref([...allColumns]);
const updateVisibleColumns = () =>
  (displayedColumns.value = allColumns.filter((c) => visibleColumns[c.key]));

const filteredRows = computed(() => {
  const key = searchKeyword.value.trim().toLowerCase();
  if (!key) return props.rows;
  return props.rows.filter((row) =>
    Object.values(row).some((val) =>
      val?.toString().toLowerCase().includes(key)
    )
  );
});

const createNewDoc = () => {  
  frappe.new_doc(docType);
};

const onView = (row) =>
  frappe.show_alert({
    message: `Đã xem ${row.masterordercode}`,
    indicator: "green",
  });

const onEdit = (row) =>
  frappe.show_alert({
    message: `Đã chỉnh sửa ${row.masterordercode}`,
    indicator: "blue",
  });

const onDelete = (row) =>
  customConfirmModal({
    title: "Xác nhận xoá",
    message: `Bạn có chắc muốn xoá <b>${row.masterordercode}</b>?`,
    note: "Hành động này sẽ xoá vĩnh viễn dữ liệu khỏi hệ thống.",
    type: "danger",
    buttons: [
      {
        text: "Hủy",
        class: "btn-secondary",
        onClick: () =>
          frappe.show_alert({ message: "Đã huỷ thao tác", indicator: "orange" }),
      },
      {
        text: "Xoá",
        class: "btn-danger",
        onClick: () =>
          frappe.show_alert({
            message: `Đã xoá ${row.masterordercode}`,
            indicator: "red",
          }),
      },
    ],
  });
</script>

<style scoped>
:deep(.ant-input-affix-wrapper) {
  height: 32px !important;
  font-size: 13px !important;
}
</style>
