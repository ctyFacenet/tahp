<template>
  <div class="tw-flex tw-gap-4 tw-p-4 tw-bg-gray-50 tw-min-h-screen tw-overflow-hidden">
    <div class="tw-w-[260px] tw-bg-white tw-rounded-xl tw-shadow tw-p-3">
      <TreeFilter :showDateFilter="true" />
    </div>

    <div class="tw-flex-1 tw-flex tw-flex-col tw-bg-white tw-rounded-xl tw-shadow tw-p-4 tw-overflow-hidden">
      <div class="tw-flex tw-flex-col tw-mb-3 md:tw-items-center">
        <h2 class="tw-text-[15px] tw-font-semibold tw-text-gray-800 tw-uppercase tw-text-center tw-w-full">
          Xuất - Nhập - Tồn kho công đoạn
        </h2>

        <div
          class="tw-flex tw-items-center tw-gap-3 tw-flex-wrap tw-justify-end md:tw-justify-center tw-mt-2 tw-text-[13px]">
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
            class="tw-w-[260px] md:tw-w-[300px] tw-h-[28px] tw-text-[13px] tw-rounded-sm tw-border-[#2490ef] focus:tw-shadow-none"
            size="small" allowClear>
            <template #prefix>
              <SearchOutlined class="tw-text-gray-400" />
            </template>
          </a-input>
        </div>
      </div>

      <div class="tw-flex-1 tw-overflow-hidden">
        <BaseTable :columns="displayedColumns" :rows="filteredRows" group-by="materialGroup">
          <template #actions="{ row }">
            <div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
              <a-tooltip title="Chi tiết">
                <FileSearchOutlined class="tw-text-blue-500 hover:tw-text-blue-600 tw-cursor-pointer" />
              </a-tooltip>
              <a-tooltip title="Xoá">
                <DeleteOutlined class="tw-text-red-500 hover:tw-text-red-600 tw-cursor-pointer" />
              </a-tooltip>
            </div>
          </template>
        </BaseTable>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from "vue";
import {
  CopyOutlined,
  SearchOutlined,
  FileSearchOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";
import BaseTable from "../../BaseTable.vue";
import TreeFilter from "../../TreeFilter.vue";

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
    Object.values(row).some((val) => val?.toString().toLowerCase().includes(key))
  );
});
</script>
