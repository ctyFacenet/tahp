<template>
  <BaseLayout
    title="Xuất - Nhập - Tồn kho công đoạn"
    :showDateFilter="true"
  >
    <template #actions>
     
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
        class="tw-w-full sm:tw-w-[220px] md:tw-w-[300px] tw-h-[30px] tw-text-[13px] tw-rounded-sm tw-border-[#2490ef] focus:tw-shadow-none"
        size="small"
        allowClear
      >
        <template #prefix>
          <SearchOutlined class="tw-text-gray-400" />
        </template>
      </a-input>
    </template>

    <BaseTable
      :columns="displayedColumns"
      :rows="filteredRows"
      group-by="materialGroup"
    >
      <template #actions="{ row }">
        <div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
          <a-tooltip title="Chi tiết">
            <FileSearchOutlined
              class="tw-text-blue-500 hover:tw-text-blue-600 tw-cursor-pointer"
            />
          </a-tooltip>
          <a-tooltip title="Xóa">
            <DeleteOutlined
              class="tw-text-red-500 hover:tw-text-red-600 tw-cursor-pointer"
            />
          </a-tooltip>
        </div>
      </template>
    </BaseTable>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, reactive } from "vue";
import {
  CopyOutlined,
  SearchOutlined,
  FileSearchOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";
import BaseLayout from "../../layouts/BaseLayout.vue";
import BaseTable from "../../BaseTable.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const searchKeyword = ref("");

const allColumns = [
  { title: "Tên kho", key: "warehouseName" },
  { title: "Nhóm vật tư", key: "materialGroup" },
  { title: "Loại vật tư", key: "materialType" },
  { title: "Mã vật tư", key: "materialCode" },
  { title: "Tên vật tư", key: "materialName" },
  { title: "Phân loại", key: "classification" },
  { title: "Số đầu kỳ (1)", key: "openingBalance" },
  { title: "Nhập (2)", key: "quantityIn" },
  { title: "Xuất (3)", key: "quantityOut" },
  { title: "Số cuối kỳ (4) = (1)+(2)-(3)", key: "closingBalance" },
  { title: "Số kiểm kê (5)", key: "stocktakingQuantity" },
  { title: "Số chênh lệch (6) = (5)-(4)", key: "quantityDifference" },
  { title: "Đơn vị tính", key: "unitOfMeasure" },
  { title: "Thao tác", key: "actions" },
];

const visibleColumns = reactive({});
allColumns.forEach((col) => (visibleColumns[col.key] = true));
const displayedColumns = ref([...allColumns]);

const updateVisibleColumns = () => {
  displayedColumns.value = allColumns.filter((c) => visibleColumns[c.key]);
};

const filteredRows = computed(() => {
  const key = searchKeyword.value.trim().toLowerCase();
  if (!key) return props.rows;
  return props.rows.filter((row) =>
    Object.values(row).some((val) =>
      val?.toString().toLowerCase().includes(key)
    )
  );
});
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
