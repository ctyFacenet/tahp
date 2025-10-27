<template>
  <div
    class="tw-relative tw-border tw-border-gray-100 tw-bg-white tw-rounded-lg tw-shadow-sm tw-p-4 sm:tw-p-6 tw-text-sm tw-flex tw-flex-col tw-h-full">
    <div class="fade-left" v-show="scrollLeft > 5"></div>
    <div class="fade-right" v-show="scrollRight > 5"></div>

    <div ref="scrollWrapper"
      class="tw-flex-1 tw-overflow-x-auto tw-overflow-y-auto tw-max-h-[70vh] tw-border tw-border-gray-100 tw-relative"
      @scroll="handleScroll">
      <table class="tw-min-w-max tw-border-collapse tw-w-full" ref="tableRef">
        <thead class="tw-sticky tw-top-0 tw-z-20">
          <tr class="tw-bg-blue-50 tw-border-b tw-border-gray-300 tw-text-gray-700 tw-text-[13px]">
            <th
              class="tw-sticky tw-left-0 tw-top-0 tw-z-40 tw-bg-[#f8faff] tw-w-[45px] tw-text-center tw-border tw-shadow-[3px_0_6px_rgba(0,0,0,0.12)]">
              <input type="checkbox" ref="selectAllRef" v-model="selectAll" @change="toggleSelectAll" />
            </th>
            <th
              class="tw-sticky tw-left-[45px] tw-top-0 tw-z-40 tw-bg-[#f8faff] tw-w-[50px] tw-text-center tw-border tw-shadow-[3px_0_6px_rgba(0,0,0,0.12)]">
              STT
            </th>

            <th v-for="col in columns || []" :key="col.key"
              class="tw-relative tw-border tw-border-gray-200 tw-font-semibold tw-text-center tw-px-3 tw-py-2 tw-group"
              :class="[
                {
                  'tw-sticky tw-right-0 tw-z-40 tw-bg-[#f8faff] tw-shadow-[-4px_0_6px_rgba(0,0,0,0.15)]':
                    col.key === 'actions',
                  'tw-bg-pink-100 tw-text-pink-800':
                    ['canCode', 'kdaiCode', 'ktrungCode', 'ktieuCode', 'mahzCode', 'malhCode', 'mavtCode'].includes(col.key)
                }
              ]" :style="{
                width: colWidths[col.key] + 'px',
                minWidth: col.key === 'actions' ? '130px' : '150px',
              }">

              <div class="tw-flex tw-items-center tw-justify-center tw-gap-1">
                <a-tooltip :title="col.title">
                  <span class="tw-truncate tw-font-semibold">{{ col.title }}</span>
                </a-tooltip>
                <img v-if="col.key !== 'actions'" src="/assets/tahp/hello_vue/assets/icons/filter.svg" alt="filter"
                  class="tw-w-3 tw-h-3 tw-opacity-70 tw-cursor-pointer hover:tw-opacity-100" />
              </div>

              <div
                class="tw-absolute tw-top-0 tw-right-0 tw-w-[6px] tw-h-full tw-cursor-col-resize tw-bg-transparent hover:tw-bg-blue-300 tw-opacity-0 group-hover:tw-opacity-100"
                @mousedown="startResize($event, col.key)"></div>
            </th>
          </tr>

          <tr class="tw-bg-white tw-border-b tw-border-gray-200">
            <th class="tw-sticky tw-left-0 tw-top-[33px] tw-z-30 tw-bg-[#f8faff] tw-border"></th>
            <th class="tw-sticky tw-left-[45px] tw-top-[33px] tw-z-30 tw-bg-[#f8faff] tw-border"></th>

            <th v-for="col in columns || []" :key="col.key" class="tw-px-2 tw-py-1 tw-border tw-bg-white" :class="{
              'tw-sticky tw-right-0 tw-z-30 tw-bg-[#f8faff] tw-shadow-[-4px_0_6px_rgba(0,0,0,0.15)]':
                col.key === 'actions',
            }" :style="{ width: colWidths[col.key] + 'px' }">
              <template v-if="col.fieldtype === 'Date'">
                <a-range-picker v-model:value="dateFilters[col.key]" format="DD/MM/YYYY" size="small"
                  :placeholder="['Từ ngày', 'Đến ngày']" class="tw-w-full tw-text-xs" />
              </template>

              <template v-else-if="col.key === 'status'">
                <a-select v-model:value="statusFilter" show-search allowClear placeholder="Chọn trạng thái" style="width: 200px"
                  :options="statusOptions" :filter-option="filterOption" />
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
          <template v-if="pagedGroups && pagedGroups.length">
            <template v-for="(group, gIndex) in pagedGroups" :key="group.key">
              <tr class="tw-bg-gray-100 tw-border-b tw-border-gray-300">
                <td class="tw-sticky tw-left-0 tw-bg-[#f8faff] tw-z-30 tw-text-center tw-border">
                  <input type="checkbox" :checked="selectedGroups.includes(group.key)"
                    @change="toggleGroup(group.key, $event)" />
                </td>
                <td class="tw-sticky tw-left-[45px] tw-bg-[#f8faff] tw-z-30 tw-text-center tw-border"></td>
                <td :colspan="columns?.length || 0"
                  class="tw-font-semibold tw-text-red-600 tw-uppercase tw-border tw-px-2">
                  {{ group.key }}
                </td>
              </tr>

              <tr v-for="(row, i) in group.rows || []" :key="group.key + '-' + i" :class="[
                'tw-text-[13px] tw-cursor-pointer',
                selectedRows.has(row)
                  ? 'tw-bg-blue-50 tw-border-l-[3px] tw-border-blue-400'
                  : 'hover:tw-bg-gray-50',
              ]" @click="handleRowClick($event, row)">
                <td
                  class="checkbox-cell tw-sticky tw-left-0 tw-top-0 tw-bg-[#f8faff] tw-z-20 tw-text-center tw-border tw-py-1">
                  <input type="checkbox" :checked="selectedRows.has(row)" @change="toggleRow(group.key, row, $event)" />
                </td>

                <td
                  class="index-cell tw-sticky tw-left-[45px] tw-top-0 tw-bg-[#f8faff] tw-z-20 tw-text-center tw-border tw-py-1">
                  {{ i + 1 + totalPreviousRows(gIndex) }}
                </td>

                <td v-for="col in columns || []" :key="col.key"
                  class="tw-border tw-px-2 tw-py-1 tw-text-center tw-relative" :class="{
                    'tw-sticky tw-right-0 tw-z-20 tw-bg-[#f8faff] tw-text-center tw-shadow-[-4px_0_6px_rgba(0,0,0,0.15)]':
                      col.key === 'actions',
                  }" :style="{ width: colWidths[col.key] + 'px' }">
                  <template v-if="col.key === 'status'">
                    <span :class="[
                      'tw-inline-block tw-rounded-md tw-px-2 tw-py-[2px] tw-text-[12px] tw-font-medium',
                      statusColors[row[col.key]] || 'tw-bg-gray-200 tw-text-gray-700',
                    ]">
                      {{ row[col.key] }}
                    </span>
                  </template>

                  <template v-else-if="isProductionCell(col.key)">
                    <div class="tw-relative tw-h-[22px] tw-rounded-sm tw-overflow-hidden tw-border tw-border-gray-300">
                      <div class="tw-absolute tw-top-0 tw-left-0 tw-h-full tw-w-full tw-opacity-85 tw-z-[0]"
                        :style="{ backgroundColor: getStatusColor(row.status || row.state || row[col.key]) }"></div>

                      <div class="tw-absolute tw-bottom-0 tw-left-0 tw-h-[3px] tw-bg-red-500 tw-z-[10]"
                        :style="{ width: getProgressWidth(row[col.key]) + '%' }"></div>

                      <span
                        class="tw-relative tw-flex tw-items-center tw-justify-center tw-h-full tw-text-[12px] tw-font-medium tw-text-white tw-z-[20]">
                        {{ row[col.key] }}
                      </span>
                    </div>
                  </template>

                  <template v-else-if="col.key === 'actions'">
                    <slot name="actions" :row="row">
                      <div class="actions-cell tw-flex tw-items-center tw-justify-center tw-gap-2">
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
                    {{ row[col.key] || '' }}
                  </template>
                </td>
              </tr>

            </template>
          </template>

          <tr v-else>
            <td :colspan="(columns?.length || 0) + 2"
              class="tw-text-center tw-py-6 tw-text-gray-500 tw-italic tw-border">
              Không có dữ liệu
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-justify-between sm:tw-items-center tw-py-2 tw-px-3 tw-border-gray-200 tw-bg-gray-50 tw-text-xs sm:tw-text-sm">
      <a-select v-model:value="pageSize" :options="pageSizeOptions" class="tw-w-[110px]" @change="onPageSizeChange" />
      <div class="tw-flex tw-items-center tw-gap-2">
        <span>Trang số {{ currentPage }} / {{ totalPages }} ({{ filteredRows?.length || 0 }} bản ghi)</span>
        <a-pagination v-model:current="currentPage" :total="filteredRows?.length || 0" :pageSize="pageSize"
          @change="onPageChange" :showSizeChanger="false" size="small" />
      </div>
      <div class="tw-flex tw-items-center tw-gap-2">
        <span>Đi đến</span>
        <a-input-number v-model:value="goToPage" :min="1" :max="totalPages" @pressEnter="jumpToPage" style="width: 70px"
          size="small" />
      </div>
    </div>

    <div
      class="tw-text-center tw-py-3 tw-border-t tw-border-gray-200 tw-bg-white tw-text-[13px] sm:tw-text-[14px] tw-font-[500] tw-tracking-wide tw-text-gray-600">
      © Copyright
      <a href="https://facenet.vn" target="_blank" rel="noopener noreferrer"
        class="tw-text-[#0066cc] tw-font-semibold tw-cursor-pointer hover:tw-underline">
        FaceNet
      </a>.
      All Rights Reserved,&nbsp;Designed by
      <a href="https://facenet.vn" target="_blank" rel="noopener noreferrer"
        class="tw-text-[#0066cc] tw-font-semibold tw-cursor-pointer hover:tw-underline">
        FaceNet
      </a>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import dayjs from "dayjs";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons-vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  groupBy: { type: String, default: null },
  doctype: { type: String, default: "" },
  nameKey: { type: String, default: "name" },
});



const emit = defineEmits(["rowClick", "view", "edit", "delete"]);

const openForm = (row) => {
  emit("rowClick", row);
  if (!props.doctype || !row) return;
  const docName = row[props.nameKey] || row.name || row.id || null;
  if (!docName) return;

  frappe.set_route("Form", props.doctype, docName);
};

const handleRowClick = (event, row) => {
  const inActionCell =
    event.target.closest(".actions-cell") ||
    event.target.closest(".checkbox-cell") ||
    event.target.closest(".index-cell");
  if (inActionCell) return;
  openForm(row);
};


const isProductionCell = (key) => {
  if (!key) return false;
  const normalized = key.toString().toLowerCase().trim();
  const result = [
    "cancode",
    "kdaicode",
    "ktrungcode",
    "ktieucode",
    "mahzcode",
    "malhcode",
    "mavtcode",
  ].includes(normalized);
  return result;
};

const getProgressWidth = (value) => {
  if (!value || typeof value !== "string" || !value.includes("/")) return 0;
  const [done, total] = value.split("/").map((n) => parseFloat(n) || 0);
  if (total === 0) return 0;
  const result = Math.min(100, (done / total) * 100);
  return result;
};

const getStatusColor = (value) => {
  if (!value) return "#9ca3af";
  const s = value.toString().toLowerCase();

  if (s.includes("chờ")) return "#a07855"; // nâu
  if (s.includes("đang")) return "#3b82f6"; // xanh dương
  if (s.includes("tạm")) return "#fbbf24"; // vàng
  if (s.includes("kết")) return "#22c55e"; // xanh lá
  if (s.includes("huỷ") || s.includes("hủy")) return "#ef4444"; // đỏ

  if (value.includes("/")) {
    const [done, total] = value.split("/").map(Number);
    const percent = total ? (done / total) * 100 : 0;
    if (percent === 0) return "#a07855";
    if (percent < 50) return "#3b82f6";
    if (percent < 99) return "#fbbf24";
    return "#22c55e";
  }

  return "#9ca3af";
};



const groupedRows = computed(() => {
  if (!props.groupBy) return [{ key: "Tất cả", rows: props.rows || [] }];
  const map = new Map();
  (props.rows || []).forEach((r) => {
    const key = r[props.groupBy] || "Không xác định";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  });
  return [...map].map(([key, rows]) => ({ key, rows }));
});

const totalPreviousRows = (idx) =>
  groupedRows.value.slice(0, idx).reduce((a, g) => a + (g.rows?.length || 0), 0);

const selectedGroups = ref([]);
const selectedRows = ref(new Set());
const selectAll = ref(false);
const selectAllRef = ref(null);

const toggleGroup = (key, e) => {
  const g = groupedRows.value.find((x) => x.key === key);
  if (!g) return;
  if (e.target.checked) {
    if (!selectedGroups.value.includes(key)) selectedGroups.value.push(key);
    g.rows.forEach((r) => selectedRows.value.add(r));
  } else {
    selectedGroups.value = selectedGroups.value.filter((x) => x !== key);
    g.rows.forEach((r) => selectedRows.value.delete(r));
  }
};

const toggleRow = (gk, row, e) => {
  if (e.target.checked) selectedRows.value.add(row);
  else selectedRows.value.delete(row);
  const g = groupedRows.value.find((x) => x.key === gk);
  const all = g.rows.every((r) => selectedRows.value.has(r));
  if (all && !selectedGroups.value.includes(gk)) selectedGroups.value.push(gk);
  if (!all) selectedGroups.value = selectedGroups.value.filter((x) => x !== gk);
};

const toggleSelectAll = () => {
  if (selectAll.value) {
    groupedRows.value.forEach((g) => {
      if (!selectedGroups.value.includes(g.key)) selectedGroups.value.push(g.key);
      g.rows.forEach((r) => selectedRows.value.add(r));
    });
  } else {
    selectedGroups.value = [];
    selectedRows.value.clear();
  }
};

watch(selectedRows, () => {
  const total = groupedRows.value.reduce((a, g) => a + (g.rows?.length || 0), 0);
  const count = selectedRows.value.size;
  selectAll.value = count > 0 && count === total;
  if (selectAllRef.value)
    selectAllRef.value.indeterminate = count > 0 && count < total;
});

const filters = ref({});
const dateFilters = ref({});
const statusFilter = ref("");
const statusColors = {
  "Chờ sản xuất": "tw-bg-purple-500 tw-text-white",
  "Đang sản xuất": "tw-bg-blue-500 tw-text-white",
  "Tạm dừng sản xuất": "tw-bg-yellow-400 tw-text-white",
  "Kết thúc sản xuất": "tw-bg-green-500 tw-text-white",
  "Đã huỷ": "tw-bg-red-500 tw-text-white",
  "Bản nháp": "tw-bg-gray-300 tw-text-gray-800",
  "Đã duyệt": "tw-bg-orange-400 tw-text-white",
  "Đã hoàn thành": "tw-bg-green-500 tw-text-white",
  "Đã tạo lệnh sản xuất": "tw-bg-purple-500 tw-text-white",
  "Đã tạo 1 phần lệnh sản xuất": "tw-bg-blue-500 tw-text-white",
  "Sử dụng hàng tồn kho": "tw-bg-blue-500 tw-text-white",
  "Chờ tạo lệnh sản xuất": "tw-bg-orange-400 tw-text-white",
};
const statusOptions = Object.keys(statusColors).map((x) => ({ label: x, value: x }));
const filterOption = (input, option) =>
  option.label.toLowerCase().includes(input.toLowerCase());

const filteredRows = computed(() =>
  (props.rows || []).filter((r) =>
    (props.columns || []).every((c) => {
      if (c.key === "actions") return true;
      if (c.key === "status" && statusFilter.value)
        return r[c.key] === statusFilter.value;
      if (c.fieldtype === "Date") {
        const range = dateFilters.value[c.key];
        if (!range || range?.length !== 2) return true;
        const d = dayjs(r[c.key], "DD-MM-YYYY");
        return (
          d.isAfter(dayjs(range[0]).startOf("day")) &&
          d.isBefore(dayjs(range[1]).endOf("day"))
        );
      }
      const val = (r[c.key] || "").toString().toLowerCase();
      const f = (filters.value[c.key] || "").toString().toLowerCase();
      return val.includes(f);
    })
  )
);

const currentPage = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [
  { label: "10 / Trang", value: 10 },
  { label: "20 / Trang", value: 20 },
  { label: "50 / Trang", value: 50 },
  { label: "100 / Trang", value: 100 },
];
const totalPages = computed(() =>
  Math.max(1, Math.ceil((filteredRows.value?.length || 0) / pageSize.value))
);
const goToPage = ref(null);
const onPageChange = (p) => (currentPage.value = p);
const onPageSizeChange = (s) => {
  pageSize.value = s;
  currentPage.value = 1;
};
const jumpToPage = () => {
  if (goToPage.value >= 1 && goToPage.value <= totalPages.value)
    currentPage.value = goToPage.value;
};

const pagedGroups = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  const flat = filteredRows.value.slice(start, end);
  if (!props.groupBy) return [{ key: "Tất cả", rows: flat }];
  const map = new Map();
  flat.forEach((r) => {
    const k = r[props.groupBy] || "Không xác định";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  });
  return [...map].map(([key, rows]) => ({ key, rows }));
});

const colWidths = ref({});
(props.columns || []).forEach((c) => (colWidths.value[c.key] = 160));
const resizing = ref({});
const startResize = (e, k) => {
  resizing.value = { active: true, k, x: e.pageX, w: colWidths.value[k] };
  document.addEventListener("mousemove", handleResize);
  document.addEventListener("mouseup", stopResize);
};
const handleResize = (e) => {
  if (!resizing.value.active) return;
  const d = e.pageX - resizing.value.x;
  colWidths.value[resizing.value.k] = Math.max(80, resizing.value.w + d);
};
const stopResize = () => {
  resizing.value.active = false;
  document.removeEventListener("mousemove", handleResize);
  document.removeEventListener("mouseup", stopResize);
};

const scrollWrapper = ref(null);
const scrollLeft = ref(0);
const scrollRight = ref(0);
const handleScroll = () => {
  const el = scrollWrapper.value;
  if (!el) return;
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
  background: linear-gradient(to right, white, transparent);
}

.fade-right {
  right: 0;
  background: linear-gradient(to left, white, transparent);
}

:deep(.ant-picker) {
  height: 26px !important;
  font-size: 12px !important;
}

:deep(.ant-pagination-item),
:deep(.ant-select-selector),
:deep(.ant-input-number-input) {
  font-size: 12px !important;
}

@media (max-width: 768px) {

  th.tw-sticky,
  td.tw-sticky {
    position: static !important;
    left: auto !important;
    right: auto !important;
    z-index: auto !important;
    box-shadow: none !important;
    background: white !important;
  }

  .fade-left,
  .fade-right {
    display: none !important;
  }
}
</style>
