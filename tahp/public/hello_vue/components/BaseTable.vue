<template>
  <div
    class="tw-relative tw-border tw-border-gray-100 tw-bg-white tw-rounded-lg tw-shadow-sm tw-p-4 sm:tw-p-6 tw-text-sm tw-flex tw-flex-col tw-h-full">
    <div class="fade-left" v-show="scrollLeft > 5"></div>
    <div class="fade-right" v-show="scrollRight > 5"></div>

    <div ref="scrollWrapper"
      class="tw-flex-1 tw-overflow-x-auto tw-overflow-y-auto tw-max-h-[70vh] tw-border tw-border-gray-100 tw-relative"
      @scroll="handleScroll">
      <table class="tw-min-w-max tw-border-collapse tw-w-full" ref="tableRef">
        <thead class="tw-sticky tw-top-0 tw-z-10">
          <tr class="tw-bg-blue-50 tw-border-b tw-border-gray-300 tw-text-gray-700 tw-text-[13px]">
            <th
              class="tw-sticky tw-left-0 tw-z-40 tw-bg-[#f8faff] tw-w-[45px] tw-border tw-border-gray-200 tw-text-center tw-py-2 tw-shadow-[3px_0_8px_rgba(0,0,0,0.12)]">
              <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
            </th>

            <th
              class="tw-sticky tw-left-[45px] tw-z-40 tw-bg-[#f8faff] tw-w-[50px] tw-border tw-border-gray-200 tw-text-center tw-py-2 tw-shadow-[3px_0_8px_rgba(0,0,0,0.12)]">
              STT
            </th>

            <th v-for="col in columns" :key="col.key"
              class="tw-relative tw-px-2 tw-py-2 tw-border tw-border-gray-200 tw-font-semibold tw-group" :class="{
                'tw-sticky tw-right-0 tw-z-40 tw-bg-[#f8faff] tw-shadow-[-4px_0_8px_rgba(0,0,0,0.15)]':
                  col.key === 'actions',
              }" :style="{
                width: colWidths[col.key] + 'px',
                minWidth: col.key === 'actions' ? '130px' : '150px',
              }">
              <div class="tw-relative tw-text-center tw-font-semibold tw-px-4">
                <a-tooltip :title="col.title">
                  <span
                    class="tw-inline-block tw-max-w-[calc(100%-16px)] tw-truncate tw-align-middle tw-cursor-default">
                    {{ col.title }}
                  </span>
                </a-tooltip>

                <img v-if="col.key !== 'actions'" src="/assets/tahp/hello_vue/assets/icons/filter.svg" alt="filter"
                  class="tw-w-3 tw-h-3 tw-opacity-70 tw-cursor-pointer hover:tw-opacity-100 tw-absolute tw-right-1 tw-top-1/2 -tw-translate-y-1/2" />
              </div>

              <div
                class="tw-absolute tw-top-0 tw-right-0 tw-w-[6px] tw-h-full tw-cursor-col-resize tw-bg-transparent hover:tw-bg-blue-300 tw-opacity-0 group-hover:tw-opacity-100"
                @mousedown="startResize($event, col.key)"></div>
            </th>

          </tr>

          <tr class="tw-bg-white tw-border-b tw-border-gray-200">
            <th
              class="tw-sticky tw-left-0 tw-z-30 tw-bg-[#f8faff] tw-px-2 tw-py-1 tw-border tw-shadow-[3px_0_8px_rgba(0,0,0,0.12)]">
            </th>
            <th
              class="tw-sticky tw-left-[45px] tw-z-30 tw-bg-[#f8faff] tw-px-2 tw-py-1 tw-border tw-shadow-[3px_0_8px_rgba(0,0,0,0.12)]">
            </th>
            <th v-for="col in columns" :key="col.key" class="tw-px-2 tw-py-1 tw-border tw-bg-white" :class="{
              'tw-sticky tw-right-0 tw-z-30 tw-bg-[#f8faff] tw-shadow-[-4px_0_8px_rgba(0,0,0,0.15)]':
                col.key === 'actions',
            }" :style="{ width: colWidths[col.key] + 'px' }">
              <template v-if="col.fieldtype === 'Date'">
                <a-range-picker v-model:value="dateFilters[col.key]" format="DD/MM/YYYY" size="small"
                  class="tw-w-full tw-text-xs" :placeholder="['Từ ngày', 'Đến ngày']" />
              </template>

              <template v-else-if="col.key !== 'actions'">
                <div class="tw-flex tw-items-center">
                  <img src="/assets/tahp/hello_vue/assets/icons/search.svg" alt="search"
                    class="tw-w-3 tw-h-3 tw-mr-1 tw-opacity-70" />
                  <input v-model="filters[col.key]" type="text"
                    class="tw-w-full tw-border-none focus:tw-outline-none tw-text-[12px] tw-bg-transparent" />
                </div>
              </template>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(row, index) in paginatedRows" :key="index" :class="[
            'tw-text-[13px] tw-transition-colors',
            selectedRows.includes(row)
              ? 'tw-bg-blue-50 tw-border-l-[3px] tw-border-blue-400'
              : 'hover:tw-bg-gray-50',
          ]">
            <td
              class="tw-sticky tw-left-0 tw-bg-[#f8faff] tw-z-20 tw-text-center tw-border tw-border-gray-200 tw-py-1 tw-shadow-[3px_0_8px_rgba(0,0,0,0.12)]">
              <input type="checkbox" v-model="selectedRows" :value="row" />
            </td>

            <td
              class="tw-sticky tw-left-[45px] tw-bg-[#f8faff] tw-z-20 tw-text-center tw-border tw-border-gray-200 tw-py-1 tw-shadow-[3px_0_8px_rgba(0,0,0,0.12)]">
              {{ (currentPage - 1) * pageSize + index + 1 }}
            </td>

            <td v-for="col in columns" :key="col.key"
              class="tw-border tw-border-gray-200 tw-px-2 tw-py-1 tw-align-middle" :class="{
                'tw-sticky tw-right-0 tw-z-20 tw-bg-[#f8faff] tw-text-center tw-shadow-[-4px_0_8px_rgba(0,0,0,0.15)]':
                  col.key === 'actions',
              }" :style="{ width: colWidths[col.key] + 'px' }">
              <template v-if="col.key === 'actions'">
                <slot name="actions" :row="row">
                  <div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
                    <a-tooltip title="Xem chi tiết">
                      <EyeOutlined class="hover:tw-text-gray-600 tw-text-blue-600 tw-cursor-pointer"
                        @click="$emit('view', row)" />
                    </a-tooltip>
                    <a-tooltip title="Chỉnh sửa">
                      <EditOutlined class="hover:tw-text-gray-600 tw-text-green-600 tw-cursor-pointer"
                        @click="$emit('edit', row)" />
                    </a-tooltip>
                    <a-tooltip title="Xóa">
                      <DeleteOutlined class="hover:tw-text-gray-600 tw-text-red-600 tw-cursor-pointer"
                        @click="$emit('delete', row)" />
                    </a-tooltip>
                  </div>
                </slot>
              </template>

              <template v-else>
                {{ row[col.key] || "" }}
              </template>
            </td>
          </tr>

          <tr v-if="paginatedRows.length === 0">
            <td :colspan="columns.length + 2" class="tw-text-center tw-py-6 tw-text-gray-500 tw-italic tw-border">
              Không có dữ liệu
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-justify-between sm:tw-items-center tw-py-2 tw-px-3 tw-border-gray-200 tw-bg-gray-50 tw-text-xs sm:tw-text-sm">
      <a-select v-model:value="pageSize" :options="pageSizeOptions" class="tw-w-[110px]" @change="onPageSizeChange" />
      <div
        class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-gap-3 tw-text-center sm:tw-text-left tw-mt-2 sm:tw-mt-0">
        <span class="tw-hidden sm:tw-inline">
          Trang số {{ currentPage }} của {{ totalPages }}
          ({{ filteredRows.length }} bản ghi)
        </span>
        <a-pagination v-model:current="currentPage" :total="filteredRows.length" :pageSize="pageSize"
          @change="onPageChange" :showSizeChanger="false" size="small" />
      </div>
      <div class="tw-flex tw-items-center tw-gap-2 tw-mt-2 sm:tw-mt-0">
        <span>Đi đến trang</span>
        <a-input-number v-model:value="goToPage" :min="1" :max="totalPages" @pressEnter="jumpToPage" style="width: 70px"
          size="small" />
      </div>
    </div>

    <div class="tw-text-center tw-py-2 tw-text-gray-600 tw-text-[12px] tw-border-t tw-border-gray-200">
      © Copyright FaceNet. All Rights Reserved, Designed by FaceNet
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons-vue";
import dayjs from "dayjs";

const props = defineProps({
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
});

const filters = ref({});
const dateFilters = ref({});
const colWidths = ref({});
const resizing = ref({ active: false, colKey: null, startX: 0, startWidth: 0 });

props.columns.forEach((col) => {
  filters.value[col.key] = "";
  dateFilters.value[col.key] = [];
  colWidths.value[col.key] = 160;
});

const startResize = (e, key) => {
  resizing.value = {
    active: true,
    colKey: key,
    startX: e.pageX,
    startWidth: colWidths.value[key],
  };
  document.addEventListener("mousemove", handleResize);
  document.addEventListener("mouseup", stopResize);
};
const handleResize = (e) => {
  if (!resizing.value.active) return;
  const delta = e.pageX - resizing.value.startX;
  const newWidth = Math.max(80, resizing.value.startWidth + delta);
  colWidths.value[resizing.value.colKey] = newWidth;
};
const stopResize = () => {
  resizing.value.active = false;
  document.removeEventListener("mousemove", handleResize);
  document.removeEventListener("mouseup", stopResize);
};

const filteredRows = computed(() =>
  props.rows.filter((row) =>
    props.columns.every((col) => {
      if (col.key === "actions") return true;
      if (col.fieldtype === "Date") {
        const range = dateFilters.value[col.key];
        if (!range || range.length !== 2) return true;
        const cellDate = dayjs(row[col.key], "DD/MM/YYYY");
        return (
          cellDate.isAfter(dayjs(range[0]).startOf("day")) &&
          cellDate.isBefore(dayjs(range[1]).endOf("day"))
        );
      }
      const cell = row[col.key]?.toString().toLowerCase() || "";
      const filter = filters.value[col.key].toLowerCase();
      return cell.includes(filter);
    })
  )
);

const currentPage = ref(1);
const pageSize = ref(10);
const goToPage = ref(null);
const pageSizeOptions = [
  { label: "10/Trang", value: 10 },
  { label: "20/Trang", value: 20 },
  { label: "50/Trang", value: 50 },
  { label: "100/Trang", value: 100 },
];
const onPageChange = (page) => (currentPage.value = page);
const onPageSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1;
};
const totalPages = computed(() =>
  Math.ceil(filteredRows.value.length / pageSize.value)
);
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});
const jumpToPage = () => {
  if (goToPage.value >= 1 && goToPage.value <= totalPages.value)
    currentPage.value = goToPage.value;
};

const selectedRows = ref([]);
const selectAll = ref(false);
const toggleSelectAll = () => {
  selectAll.value
    ? (selectedRows.value = [...paginatedRows.value])
    : (selectedRows.value = []);
};
watch(currentPage, () => (selectAll.value = false));

const scrollWrapper = ref(null);
const scrollLeft = ref(0);
const scrollRight = ref(0);
const handleScroll = () => {
  const el = scrollWrapper.value;
  scrollLeft.value = el.scrollLeft;
  scrollRight.value = el.scrollWidth - el.clientWidth - el.scrollLeft;
};
</script>

<style scoped>
table {
  font-family: "Inter", system-ui, sans-serif;
  border-spacing: 0;
}

thead th,
tbody td {
  white-space: nowrap;
  background-clip: padding-box;
}

.fade-left,
.fade-right {
  position: absolute;
  top: 0;
  bottom: 50px;
  width: 30px;
  z-index: 50;
  pointer-events: none;
}

.fade-left {
  left: 0;
  background: linear-gradient(to right, rgba(255, 255, 255, 1), transparent);
}

.fade-right {
  right: 0;
  background: linear-gradient(to left, rgba(255, 255, 255, 1), transparent);
}

:deep(.ant-picker) {
  height: 26px !important;
  font-size: 12px !important;
}

:deep(.ant-picker-input > input),
:deep(.ant-pagination-item),
:deep(.ant-select-selector),
:deep(.ant-input-number-input) {
  font-size: 12px !important;
}
</style>
