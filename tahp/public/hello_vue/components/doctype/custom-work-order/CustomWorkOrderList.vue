<template>
  <BaseLayout title="DANH SÁCH LỆNH SẢN XUẤT" :showDateFilter="false">
    <template #actions>
      <a-dropdown trigger="click" placement="bottomRight">
        <template #overlay>
          <div
            class="tw-max-h-[300px] tw-max-w-[250px] tw-overflow-y-auto tw-overflow-x-auto tw-bg-white tw-rounded-md tw-shadow-lg tw-border tw-border-gray-200">
            <a-menu>
              <a-menu-item v-for="col in allColumns" :key="col.key"
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
    </template>

    <BaseTable :columns="displayedColumns" :rows="filteredRows" @view="onView" @edit="onApproved" @delete="onDelete">
      <template #actions="{ row }">
        <div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
          <a-tooltip title="Xem chi tiết">
            <EyeOutlined class="tw-text-blue-600 hover:tw-text-blue-800 tw-cursor-pointer" @click="onView(row)" />
          </a-tooltip>

          <a-tooltip title="Phê duyệt">
            <FileDoneOutlined class="tw-text-green-600 hover:tw-text-green-800 tw-cursor-pointer"
              @click="onApproved(row)" />
          </a-tooltip>

          <a-tooltip title="Lập kế hoạch sản xuất">
            <CalendarOutlined class="tw-text-teal-600 hover:tw-text-teal-800 tw-cursor-pointer" @click="onPlan(row)" />
          </a-tooltip>

          <a-tooltip title="Xóa">
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
import { ref, computed, reactive } from "vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const searchKeyword = ref("");

const allColumns = [
  { title: "Mã lệnh sản xuất", key: "workOrderCode" },
  { title: "Trạng thái", key: "status" },
  { title: "Mã hàng", key: "itemCode" },
  { title: "Tên hàng", key: "itemName" },
  { title: "Ngày tạo lệnh", key: "workOrderCreationDate" },
  { title: "Ngày bắt đầu dự kiến", key: "plannedStartDate" },
  { title: "Ngày kết thúc dự kiến", key: "plannedEndDate" },
  { title: "Số lượng sản xuất", key: "productionQuantity" },
  { title: "Số lượng hoàn thành", key: "completedQuantity" },
  { title: "Đơn vị tính", key: "unitOfMeasure" },
  { title: "Người tạo lệnh", key: "createdBy" },
  { title: "Thao tác", key: "actions" },
];

const visibleColumns = reactive({});
allColumns.forEach((col) => (visibleColumns[col.key] = true));
const displayedColumns = ref([...allColumns]);
const updateVisibleColumns = () =>
  (displayedColumns.value = allColumns.filter((c) => visibleColumns[c.key]));

const filteredRows = computed(() => {
  if (!searchKeyword.value.trim()) return props.rows;
  const key = searchKeyword.value.toLowerCase();
  return props.rows.filter((row) =>
    Object.values(row).some((val) =>
      val?.toString().toLowerCase().includes(key)
    )
  );
});

const onPlan = (row) =>
  frappe.show_alert({
    message: `Xem kế hoạch sản xuất của ${row.workOrderCode}`,
    indicator: "green",
  });

const onView = (row) =>
  frappe.show_alert({
    message: `Đã xem ${row.workOrderCode}`,
    indicator: "green",
  });

const onApproved = (row) =>
  frappe.show_alert({
    message: `Đã chỉnh sửa ${row.workOrderCode}`,
    indicator: "blue",
  });

const onDelete = (row) =>
  customConfirmModal({
    title: "Xác nhận xoá",
    message: `Bạn có chắc muốn xoá <b>${row.workOrderCode}</b>?`,
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
            message: `Đã xoá ${row.workOrderCode}`,
            indicator: "red",
          }),
      },
    ],
  });
</script>
