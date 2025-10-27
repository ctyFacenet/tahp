<template>
  <div class="tw-w-full tw-h-full tw-p-4 tw-overflow-auto tw-bg-gray-50 tw-px-2 sm:tw-px-4 tw-pb-6">
    <div class="tw-flex tw-flex-col lg:tw-flex-row tw-gap-4 tw-min-h-screen tw-w-full">
      <transition name="slide-left">
        <div v-if="showFilter"
          class="tw-w-full lg:tw-w-[260px] tw-bg-white tw-rounded-xl tw-shadow tw-p-3 tw-flex-shrink-0">
          <TreeFilter :showDateFilter="false" @change="onFilterChange" />
        </div>
      </transition>

      <div
        class="tw-flex-1 tw-flex tw-flex-col tw-bg-white tw-rounded-xl tw-shadow tw-p-3 sm:tw-p-4 tw-overflow-hidden">
        <div
          class="tw-relative tw-mb-3 tw-border-gray-100 tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-gap-2">
          <h2
            class="tw-text-[14px] sm:tw-text-[15px] tw-font-semibold tw-text-gray-800 tw-uppercase tw-text-center sm:tw-text-center tw-leading-snug">
            DANH SÁCH LỆNH SẢN XUẤT ĐÃ DUYỆT
          </h2>

          <div
            class="tw-flex tw-items-center tw-justify-center sm:tw-justify-end tw-gap-1 tw-text-[11px] sm:tw-text-xs tw-text-gray-500">
            <span class="tw-font-semibold">Cập nhật: {{ currentTime }}</span>
            <a-tooltip title="Làm mới">
              <ReloadOutlined class="tw-text-[#2490ef] tw-cursor-pointer hover:tw-text-[#1677c8]"
                @click="refreshData" />
            </a-tooltip>
          </div>
        </div>

        <div
          class="tw-flex tw-flex-col sm:tw-flex-row tw-items-start sm:tw-items-center tw-justify-end tw-gap-3 tw-mb-3">
          <div
            class="tw-flex tw-flex-wrap tw-items-center tw-justify-center sm:tw-justify-start tw-gap-x-3 tw-gap-y-2 tw-w-full sm:tw-w-auto">
            <div v-for="s in statusList" :key="s.text" class="tw-flex tw-items-center tw-gap-1">
              <span class="tw-inline-block tw-w-3 tw-h-3 tw-rounded-sm tw-border tw-border-gray-200"
                :style="{ backgroundColor: s.color }"></span>
              <span class="tw-text-[12px] sm:tw-text-[13px] tw-text-gray-700">
                {{ s.text }}
              </span>
            </div>
          </div>

          <div
            class="tw-flex tw-flex-wrap tw-items-center tw-justify-center sm:tw-justify-end tw-gap-2 tw-w-full sm:tw-w-auto">

            <a-button
              class="tw-ml-2 tw-flex tw-items-center tw-justify-center tw-gap-1 tw-border tw-border-[#2490ef] tw-text-[#2490ef] hover:tw-bg-[#2490ef] hover:tw-text-white tw-text-[13px] tw-rounded-md tw-h-[28px] tw-px-2 tw-font-medium"
              size="small" @click="showFilter = !showFilter">
              <SearchOutlined class="tw-text-[14px]" />
              <span>Bộ lọc</span>
            </a-button>
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
                <CopyOutlined class="tw-text-[#2490ef] tw-text-[15px] hover:tw-text-[#1677c8]" />
              </a-button>
            </a-dropdown>

            <a-input v-model:value="searchKeyword" placeholder="Nhập thông tin để tìm kiếm"
              class="tw-w-full sm:tw-w-[240px] md:tw-w-[300px] tw-h-[28px] tw-text-[13px] tw-rounded-sm tw-border-[#2490ef] focus:tw-shadow-none"
              size="small" allowClear>
              <template #prefix>
                <SearchOutlined class="tw-text-gray-400" />
              </template>
            </a-input>
          </div>
        </div>

        <div
          class="tw-relative tw-w-full tw-h-full tw-overflow-x-auto tw-overflow-y-hidden tw-rounded-md tw-border tw-border-gray-100 tw-bg-white">
          <BaseTable :columns="displayedColumns" :rows="filteredRows" @view="onView" @edit="onEdit" @delete="onDelete"
            :doctype="'Custom Work Order Approved'" :nameKey="'name'" />

          <div
            class="tw-absolute tw-bottom-0 tw-left-0 tw-right-0 tw-text-[11px] tw-text-gray-400 tw-bg-white/70 tw-text-center tw-py-1 sm:tw-hidden">
            👉 Kéo ngang để xem thêm cột
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from "vue";
import dayjs from "dayjs";
import {
  ReloadOutlined,
  SearchOutlined,
  CopyOutlined,
} from "@ant-design/icons-vue";
import BaseTable from "../../BaseTable.vue";
import TreeFilter from "../../TreeFilter.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const showFilter = ref(true);
const onFilterChange = () => {
  if (window.innerWidth < 1024) showFilter.value = false;
};

const currentTime = ref("");
const refreshData = () => {
  if (frappe?.listview?.refresh) frappe.listview.refresh();
  currentTime.value = dayjs().format("HH:mm:ss DD/MM/YYYY");
};
onMounted(() => refreshData());

const searchKeyword = ref("");

const allColumns = [
  { title: "Mã lệnh sản xuất", key: "workOrderCode" },
  { title: "Trạng thái", key: "status" },
  { title: "Mã hàng", key: "itemCode" },
  { title: "Tên hàng", key: "itemName" },
  { title: "CAN", key: "canCode" },
  { title: "KDAI", key: "kdaiCode" },
  { title: "KTRUNG", key: "ktrungCode" },
  { title: "KTIEU", key: "ktieuCode" },
  { title: "MAHZ", key: "mahzCode" },
  { title: "MALH", key: "malhCode" },
  { title: "MAVT", key: "mavtCode" },
  { title: "Thời gian bắt đầu sản xuất thực tế", key: "actualStartTime", fieldtype: "Date" },
  { title: "Thời gian kết thúc sản xuất thực tế", key: "actualEndTime", fieldtype: "Date" },
  { title: "Số lượng sản xuất", key: "productionQuantity" },
  { title: "Số lượng đầu ra ước tính", key: "estimatedOutputQuantity" },
  { title: "Số lượng OK ước tính", key: "estimatedOkQuantity" },
  { title: "Số lượng NG ước tính", key: "estimatedNgQuantity" },
  { title: "Số lượng đầu ra thực tế", key: "actualOutputQuantity" },
  { title: "Số lượng OK thực tế", key: "actualOkQuantity" },
  { title: "Số lượng NG thực tế", key: "actualNgQuantity" },
  { title: "Đơn vị tính", key: "unitOfMeasure" },
  { title: "Người tạo lệnh", key: "createdBy" },
  { title: "Thao tác", key: "actions" },
];

const visibleColumns = reactive({});
allColumns.forEach((col) => (visibleColumns[col.key] = true));

const displayedColumns = ref([...allColumns]);
const updateVisibleColumns = () => {
  displayedColumns.value = allColumns.filter((c) => visibleColumns[c.key]);
};

const filteredRows = computed(() => {
  if (!searchKeyword.value.trim()) return props.rows;
  const key = searchKeyword.value.toLowerCase();
  return props.rows.filter((row) =>
    Object.values(row).some((val) => val?.toString().toLowerCase().includes(key))
  );
});

const statusList = [
  { text: "Chờ sản xuất", color: "#a855f7" },
  { text: "Đang sản xuất", color: "#2563eb" },
  { text: "Tạm dừng sản xuất", color: "#facc15" },
  { text: "Kết thúc sản xuất", color: "#22c55e" },
  { text: "Đã huỷ", color: "#ef4444" },
];

const onView = (row) =>
  frappe.show_alert({ message: `Đã xem ${row.workOrderCode}`, indicator: "green" });
const onEdit = (row) =>
  frappe.show_alert({ message: `Đã chỉnh sửa ${row.workOrderCode}`, indicator: "blue" });
const onDelete = (row) =>
  customConfirmModal({
    title: "Xác nhận xoá",
    message: `Bạn có chắc muốn xoá <b>${row.workOrderCode}</b>?`,
    note: "Hành động này sẽ xoá vĩnh viễn dữ liệu khỏi hệ thống.",
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
          frappe.show_alert({ message: `Đã xoá ${row.workOrderCode}`, indicator: "red" }),
      },
    ],
  });
</script>

<style scoped>
:deep(.ant-input-affix-wrapper) {
  height: 32px !important;
  font-size: 13px !important;
}

:deep(table) {
  min-width: 850px;
  table-layout: auto !important;
}

:deep(th),
:deep(td) {
  white-space: nowrap;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.25s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-15px);
}
</style>
