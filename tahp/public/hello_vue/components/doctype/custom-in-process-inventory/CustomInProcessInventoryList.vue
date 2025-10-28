<template>
  <BaseLayout title="Xuất - Nhập - Tồn kho công đoạn" :showDateFilter="true">
    <template #actions>

      <div
        class="tw-flex tw-flex-wrap tw-items-center tw-justify-center sm:tw-justify-end tw-gap-2 tw-w-full sm:tw-w-auto">

        <a-button type="link"
          class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
          <FileTextOutlined /> Thống kê NVL thừa
        </a-button>
        <a-button type="link"
          class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
          <SearchOutlined /> Kiểm kê tồn kho
        </a-button>
        <a-button type="link"
          class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
          <CalendarOutlined /> Chôt số cuối ký
        </a-button>

        <a-dropdown trigger="click" placement="bottomRight">
          <template #overlay>
            <div
              class="tw-max-h-[300px] tw-max-w-[250px] tw-overflow-y-auto tw-bg-white tw-rounded-md tw-shadow-lg tw-border tw-border-gray-200">
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
            <CopyOutlined class="tw-text-[#2490ef] tw-text-[15px] hover:tw-text-[#1677c8]" />
          </a-button>
        </a-dropdown>

        <a-input v-model:value="searchKeyword" placeholder="Nhập thông tin để tìm kiếm"
          class="tw-w-full sm:tw-w-[220px] md:tw-w-[300px] tw-h-[30px] tw-text-[13px] tw-rounded-sm tw-border-[#2490ef] focus:tw-shadow-none"
          size="small" allowClear>
          <template #prefix>
            <SearchOutlined class="tw-text-gray-400" />
          </template>
        </a-input>
      </div>
    </template>

    <BaseTable :columns="displayedColumns" :rows="filteredRows" group-by="materialgroup" :doctype="docType"
      :nameKey="'name'" />
  </BaseLayout>
</template>

<script setup>
import { ref, computed, reactive } from "vue";
import {
  CopyOutlined,
  SearchOutlined,
  FileTextOutlined,
  CalendarOutlined
} from "@ant-design/icons-vue";
import BaseLayout from "../../layouts/BaseLayout.vue";
import BaseTable from "../../BaseTable.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
});

const searchKeyword = ref("");
const docType = computed(() => props.rows?.[0]?.docType || "Custom In Process Inventory");

const selectableColumns = computed(() =>
  props.columns.filter((c) => !["actions"].includes(c.key))
);

const visibleColumns = reactive({});
props.columns.forEach((col) => (visibleColumns[col.key] = true));

const displayedColumns = computed(() =>
  props.columns.filter(
    (c) => c.key === "actions" || visibleColumns[c.key]
  )
);

const filteredRows = computed(() => {
  const key = searchKeyword.value.trim().toLowerCase();
  if (!key) return props.rows;
  return props.rows.filter((row) =>
    Object.values(row).some((val) =>
      val?.toString().toLowerCase().includes(key)
    )
  );
});

const updateVisibleColumns = () => { };
</script>

<style scoped>
:deep(table) {
  min-width: 850px;
  table-layout: auto !important;
}

:deep(th),
:deep(td) {
  white-space: nowrap;
}

:deep(.ant-input-affix-wrapper) {
  height: 32px !important;
  font-size: 13px !important;
}

@media (max-width: 640px) {
  :deep(.ant-menu-item) {
    font-size: 12px !important;
  }
}
</style>
