<template>
  <a-modal v-model:open="open" title="Chọn khách hàng" width="90%" centered :footer="null" class="customer-modal">
    <div class="tw-flex tw-justify-end tw-mb-3">
      <a-input-search v-model:value="searchText" placeholder="Nhập thông tin để tìm kiếm..." allow-clear enter-button
        class="tw-w-full sm:tw-w-1/3 tw-transition-all tw-duration-200" />
    </div>

    <div class="tw-overflow-x-auto tw-w-full">
      <a-table :columns="columns" :data-source="paginatedData" bordered size="small" row-key="id" :pagination="false"
        class="tw-min-w-[700px] tw-cursor-pointer tw-mb-2" @rowClick="handleSelect">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" @click="handleSelect(record)">Chọn</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <div
      class="tw-flex tw-flex-col sm:tw-flex-row tw-items-center tw-justify-between tw-gap-2 tw-border-t tw-border-gray-200 tw-pt-3 tw-text-sm">
      <div class="tw-flex tw-items-center tw-gap-2">
        <a-select v-model:value="pageSize" :options="[10, 20, 50].map(i => ({ label: i + '/Trang', value: i }))"
          style="width: 100px" @change="handlePageSizeChange" />
      </div>

      <div class="tw-flex tw-items-center tw-gap-3 tw-flex-wrap tw-justify-center">
        <span class="tw-whitespace-nowrap">
          Trang {{ currentPage }} của {{ totalPages }} ({{ filteredData.length }} bản ghi)
        </span>

        <a-pagination v-model:current="currentPage" :total="filteredData.length" :page-size="pageSize"
          @change="handlePageChange" :show-less-items="true" :show-size-changer="false" size="small" class="tw-flex tw-items-center" />

        <div class="tw-flex tw-items-center tw-gap-1">
          <span>Đến trang</span>
          <a-input-number v-model:value="gotoPage" :min="1" :max="totalPages" style="width: 60px"
            @pressEnter="jumpToPage" size="small" />
        </div>
      </div>
    </div>

    <div
      class="tw-flex tw-flex-wrap tw-items-center tw-justify-center sm:tw-justify-start tw-gap-6 tw-border-t tw-border-blue-200 tw-pt-3 tw-mt-3 tw-text-[13px]">
      <a-button type="link" class="tw-text-blue-600 tw-px-0 tw-flex tw-items-center tw-font-medium"
        @click="handleAddNew">
        <PlusOutlined class="tw-text-[14px]" />
        <span>Thêm mới</span>
        <span class="tw-text-gray-500">(Alt + n)</span>
      </a-button>

      <a-button type="link" class="tw-text-blue-600 tw-flex tw-items-center tw-font-medium" @click="close">
        <CloseOutlined class="tw-text-[14px]" />
        <span>Đóng</span>
        <span class="tw-text-gray-500">(Esc)</span>
      </a-button>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { PlusOutlined, CloseOutlined } from "@ant-design/icons-vue";

const props = defineProps({
  open: { type: Boolean, required: true },
  data: { type: Array, required: true },
});


const emit = defineEmits(["update:open", "select", "addnew"]);

const open = computed({
  get: () => props.open,
  set: (val) => emit("update:open", val),
});
const searchText = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const gotoPage = ref(1);

const columns = [
  { title: "STT", dataIndex: "id", key: "id", width: 60, align: "center" },
  { title: "Mã khách hàng", dataIndex: "code", key: "code" },
  { title: "Tên khách hàng", dataIndex: "name", key: "name" },
  { title: "Số điện thoại", dataIndex: "phone", key: "phone" },
  { title: "Email", dataIndex: "email", key: "email" },
  { title: "Địa chỉ", dataIndex: "address", key: "address" },
  { title: "Thao tác", key: "action", align: "center" },
];

const filteredData = computed(() => {
  if (!searchText.value) return props.data;
  const t = searchText.value.toLowerCase();
  return props.data.filter(
    (c) => c.name.toLowerCase().includes(t) || c.code.toLowerCase().includes(t)
  );
});

const totalPages = computed(() =>
  Math.ceil(filteredData.value.length / pageSize.value)
);

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredData.value.slice(start, start + pageSize.value);
});

function handlePageChange(page) {
  currentPage.value = page;
}
function handlePageSizeChange() {
  currentPage.value = 1;
}
function jumpToPage() {
  if (gotoPage.value >= 1 && gotoPage.value <= totalPages.value) {
    currentPage.value = gotoPage.value;
  }
}

function handleSelect(record) {
  emit("select", record);
  emit("update:open", false);
}

function handleAddNew() {
  emit("addnew");
}

function close() {
  emit("update:open", false);
}

function handleShortcut(e) {
  if (e.altKey && e.key.toLowerCase() === "n") handleAddNew();
  if (e.key === "Escape") close();
}

onMounted(() => window.addEventListener("keydown", handleShortcut));
onBeforeUnmount(() => window.removeEventListener("keydown", handleShortcut));
</script>

<style scoped>
:deep(.ant-modal-header) {
  background-color: #e6f4ff !important;
  border-bottom: 1px solid #cce1ff;
}

:deep(.ant-modal-title) {
  color: #003a8c;
  font-weight: 600;
}

.customer-modal {
  max-height: 90vh;
  overflow-y: auto;
}

:deep(.ant-pagination) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 0;
}

:deep(.ant-pagination-item) {
  border-radius: 6px !important;
  border: 1px solid #e5e7eb !important;
  transition: all 0.2s ease;
  min-width: 28px !important;
  height: 28px !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.ant-pagination-item a) {
  color: #374151 !important;
  font-size: 13px;
  line-height: 1;
}

:deep(.ant-pagination-item-active) {
  border-color: #2490ef !important;
  background-color: #2490ef !important;
}

:deep(.ant-pagination-item-active a) {
  color: #fff !important;
}

:deep(.ant-pagination-item:hover) {
  border-color: #2490ef !important;
  color: #2490ef !important;
}

:deep(.ant-pagination-prev),
:deep(.ant-pagination-next) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px !important;
  height: 28px !important;
  border-radius: 6px;
  transition: all 0.2s ease;
}

:deep(.ant-pagination-prev:hover),
:deep(.ant-pagination-next:hover) {
  background-color: #f3f4f6 !important;
}

:deep(.ant-pagination-prev .ant-pagination-item-link),
:deep(.ant-pagination-next .ant-pagination-item-link) {
  color: #374151 !important;
  font-size: 13px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb !important;
  border-radius: 6px !important;
  height: 28px !important;
  width: 28px !important;
}

:deep(.ant-pagination-prev:hover .ant-pagination-item-link),
:deep(.ant-pagination-next:hover .ant-pagination-item-link) {
  color: #2490ef !important;
  border-color: #2490ef !important;
}

:deep(.ant-pagination-item-ellipsis) {
  color: #9ca3af !important;
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

:deep(.ant-pagination) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 0;
}
</style>
