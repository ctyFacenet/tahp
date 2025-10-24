<template>
  <div
    class="tw-flex tw-flex-col lg:tw-flex-row tw-gap-4 tw-p-3 sm:tw-p-4 tw-bg-gray-50 tw-min-h-screen tw-overflow-auto"
  >
    <transition name="slide-left">
      <div
        v-if="showFilter"
        class="tw-w-full lg:tw-w-[260px] tw-bg-white tw-rounded-xl tw-shadow tw-p-3 tw-flex-shrink-0"
      >
        <TreeFilter :showDateFilter="true" />
      </div>
    </transition>

    <div
      class="tw-flex-1 tw-flex tw-flex-col tw-bg-white tw-rounded-xl tw-shadow tw-p-3 sm:tw-p-4 tw-overflow-hidden"
    >
      <div
        class="tw-flex-col md:tw-flex-row tw-items-start md:tw-items-center tw-justify-between tw-mb-3 tw-gap-3"
      >
        <div
          class="tw-flex tw-items-center tw-justify-between tw-w-full md:tw-w-auto"
        >
          <h2
            class="tw-text-[15px] tw-font-semibold tw-text-gray-800 tw-uppercase tw-text-center md:tw-text-center tw-w-full"
          >
            Xuất - Nhập - Tồn kho công đoạn
          </h2>

        
        </div>

        <div
          class="tw-flex tw-flex-wrap tw-items-center tw-justify-center md:tw-justify-end tw-gap-2 tw-w-full md:tw-w-auto"
        >

           <a-button
            class="lg:tw-hidden tw-ml-2 tw-flex tw-items-center tw-justify-center tw-gap-1 tw-border tw-border-[#2490ef] tw-text-[#2490ef] hover:tw-bg-[#2490ef] hover:tw-text-white tw-text-[13px] tw-rounded-md tw-h-[28px] tw-px-2 tw-font-medium"
            size="small"
            @click="showFilter = !showFilter"
          >
            <SearchOutlined class="tw-text-[14px]" />
            <span>Bộ lọc</span>
          </a-button>
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
        </div>
      </div>

      <div
        class="tw-relative tw-flex-1 tw-overflow-x-auto tw-overflow-y-hidden tw-border tw-border-gray-100 tw-rounded-lg"
      >
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

        <div
          class="tw-absolute tw-bottom-0 tw-left-0 tw-right-0 tw-bg-white/80 tw-text-[11px] tw-text-gray-500 tw-text-center tw-py-1 sm:tw-hidden"
        >
          👉 Kéo ngang để xem thêm cột
        </div>
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

const showFilter = ref(true);
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
    Object.values(row).some((val) => val?.toString().toLowerCase().includes(key))
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

:deep(.ant-btn) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
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

@media (max-width: 640px) {
  :deep(.ant-menu-item) {
    font-size: 12px !important;
  }
}
</style>
