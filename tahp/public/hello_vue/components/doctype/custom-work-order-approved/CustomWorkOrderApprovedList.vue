<template>
  <div class="tw-flex tw-gap-4 tw-p-4 tw-bg-gray-50 tw-min-h-screen">
    <div class="tw-w-[260px] tw-bg-white tw-rounded-xl tw-shadow tw-p-3">
      <TreeFilter :showDateFilter="false" />
    </div>

    <div class="tw-flex-1 tw-flex tw-flex-col tw-bg-white tw-rounded-xl tw-shadow tw-p-4 tw-overflow-hidden">
      <div class="tw-relative tw-mb-3 tw-pb-2 tw-border-b tw-border-gray-100">
        <h2 class="tw-text-[15px] tw-font-semibold tw-text-gray-800 tw-uppercase tw-text-center">
          DANH SÁCH LỆNH SẢN XUẤT ĐÃ DUYỆT
        </h2>

        <div class="tw-absolute tw-top-0 tw-right-0 tw-flex tw-items-center tw-gap-1 tw-text-xs tw-text-gray-500">
          <span class="tw-font-semibold">Cập nhật: {{ currentTime }}</span>
          <a-tooltip title="Làm mới">
            <ReloadOutlined
              class="tw-text-[#2490ef] tw-cursor-pointer hover:tw-text-[#1677c8] tw-text-[13px]"
              @click="refreshData"
            />
          </a-tooltip>
        </div>
      </div>

      <div class="tw-flex tw-items-center tw-justify-between tw-mb-3">
        <div
          class="tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-space-x-8 tw-gap-y-2 tw-pb-1 tw-pl-2"
        >
          <div
            v-for="s in statusList"
            :key="s.text"
            class="tw-flex tw-items-center tw-gap-2"
          >
            <span
              class="tw-inline-block tw-w-3 tw-h-3 tw-rounded-sm tw-border tw-border-gray-200"
              :style="{ backgroundColor: s.color }"
            ></span>
            <span class="tw-text-[13px] tw-text-gray-700">{{ s.text }}</span>
          </div>
        </div>

        <div class="tw-flex tw-items-center tw-gap-2">
          <a-dropdown trigger="click" placement="bottomRight">
            <template #overlay>
              <a-menu>
                <a-menu-item
                  v-for="col in allColumns"
                  :key="col.key"
                  class="tw-text-[13px]"
                >
                  <a-checkbox
                    v-model:checked="visibleColumns[col.key]"
                    @change="updateVisibleColumns"
                  >
                    {{ col.title }}
                  </a-checkbox>
                </a-menu-item>
              </a-menu>
            </template>
            <a-button
              type="text"
              class="tw-flex tw-items-center tw-justify-center tw-p-0"
              title="Chọn cột hiển thị"
            >
              <CopyOutlined
                class="tw-text-[#2490ef] tw-text-[15px] hover:tw-text-[#1677c8]"
              />
            </a-button>
          </a-dropdown>

          <a-input
            v-model:value="searchKeyword"
            placeholder="Nhập thông tin để tìm kiếm"
            class="tw-w-[260px] tw-h-[28px] tw-text-[13px] tw-rounded-sm tw-border-[#2490ef]"
            size="small"
            allowClear
          >
            <template #prefix>
              <SearchOutlined class="tw-text-gray-400" />
            </template>
          </a-input>
        </div>
      </div>

      <div class="tw-flex-1 tw-w-full tw-h-full tw-overflow-hidden">
        <BaseTable
          :columns="displayedColumns"
          :rows="filteredRows"
          @view="onView"
          @edit="onEdit"
          @delete="onDelete"
        />
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
  CopyOutlined
} from "@ant-design/icons-vue";
import BaseTable from "../../BaseTable.vue";
import TreeFilter from "../../TreeFilter.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

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

const statusList = [
  { text: "Chờ sản xuất", color: "#a855f7" },
  { text: "Đang sản xuất", color: "#2563eb" },
  { text: "Tạm dừng sản xuất", color: "#facc15" },
  { text: "Kết thúc sản xuất", color: "#22c55e" },
  { text: "Đã huỷ", color: "#ef4444" },
];

const onView = (row) => frappe.show_alert({ message: `Đã xem ${row.workOrderCode}`, indicator: "green" });
const onEdit = (row) => frappe.show_alert({ message: `Đã chỉnh sửa ${row.workOrderCode}`, indicator: "blue" });
const onDelete = (row) => {
  customConfirmModal({
    title: "Xác nhận xoá",
    message: `Bạn có chắc muốn xoá <b>${row.workOrderCode}</b>?`,
    note: "Hành động này sẽ xoá vĩnh viễn dữ liệu khỏi hệ thống.",
    type: "danger",
    buttons: [
      {
        text: "Huỷ",
        class: "btn-secondary",
        onClick: () => frappe.show_alert({ message: "Đã huỷ thao tác", indicator: "orange" }),
      },
      {
        text: "Xoá",
        class: "btn-danger",
        onClick: () => frappe.show_alert({ message: `Đã xoá ${row.workOrderCode}`, indicator: "red" }),
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
