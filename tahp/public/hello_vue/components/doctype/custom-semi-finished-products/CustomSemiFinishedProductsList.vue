<template>
  <div
    class="tw-flex tw-flex-col lg:tw-flex-row tw-gap-4 tw-p-3 sm:tw-p-4 tw-bg-gray-50 tw-min-h-screen tw-overflow-auto">
    <transition name="fade">
      <div v-if="showFilter"
        class="tw-w-full lg:tw-w-[260px] tw-bg-white tw-rounded-xl tw-shadow tw-p-3 tw-flex-shrink-0">
        <TreeFilter :showDateFilter="true" />
      </div>
    </transition>

    <div class="tw-flex-1 tw-flex tw-flex-col tw-bg-white tw-rounded-xl tw-shadow tw-p-3 sm:tw-p-4 tw-overflow-hidden">
      <div
        class="tw-flex-col md:tw-flex-row tw-items-start md:tw-items-center tw-justify-between tw-mb-3 tw-gap-3">
        <div class="tw-flex tw-items-center tw-justify-between tw-w-full md:tw-w-auto">
          <h2
            class="tw-text-[15px] tw-font-semibold tw-text-gray-800 tw-uppercase tw-text-center md:tw-text-center tw-w-full">
            DANH SÁCH TEM BÁN THÀNH PHẨM
          </h2>
        
        </div>
        <div
          class="tw-flex tw-flex-col sm:tw-flex-row tw-items-start sm:tw-items-center tw-justify-end tw-gap-2 tw-w-full">
          <div
            class="tw-flex tw-flex-wrap tw-items-center tw-justify-center sm:tw-justify-start tw-gap-2 tw-w-full sm:tw-w-auto">
              <a-button
            class="tw-ml-2 tw-flex tw-items-center tw-justify-center tw-gap-1 tw-border tw-border-[#2490ef] tw-text-[#2490ef] hover:tw-bg-[#2490ef] hover:tw-text-white tw-text-[13px] tw-rounded-md tw-h-[28px] tw-px-2 tw-font-medium"
            size="small" @click="showFilter = !showFilter">
            <SearchOutlined class="tw-text-[14px] tw-relative tw-top-[0.5px]" />
            <span>Bộ lọc</span>
          </a-button>

            <a-button type="link"
              class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
              <template #icon>
                <FileDoneOutlined class="tw-text-[#2490ef]" />
              </template>
              Duyệt huỷ tem
            </a-button>

            <a-button type="link"
              class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
              <template #icon>
                <FileExcelOutlined class="tw-text-[#2490ef]" />
              </template>
              Xuất Excel
            </a-button>

            <a-button type="link"
              class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
              <template #icon>
                <DeleteOutlined class="tw-text-[#2490ef]" />
              </template>
              Xoá
            </a-button>

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
                <CopyOutlined class="tw-text-[#2490ef] tw-text-[15px] hover:tw-text-[#1677c8]" />
              </a-button>
            </a-dropdown>
          </div>

          <div class="tw-w-full sm:tw-w-[220px] md:tw-w-[300px]">
            <a-input v-model:value="searchKeyword" placeholder="Nhập thông tin để tìm kiếm"
              class="tw-h-[30px] tw-text-[13px] tw-rounded-sm tw-border-[#2490ef] focus:tw-shadow-none tw-w-full"
              size="small" allowClear>
              <template #prefix>
                <SearchOutlined class="tw-text-gray-400" />
              </template>
            </a-input>
          </div>
        </div>
      </div>

      <div
        class="tw-relative tw-flex-1 tw-overflow-x-auto tw-overflow-y-hidden tw-border tw-border-gray-100 tw-rounded-lg">
        <BaseTable :columns="displayedColumns" :rows="filteredRows" group-by="lotNumber">
          <template #actions="{ row }">
            <div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
              <a-tooltip title="Duyệt huỷ tem">
                <FileDoneOutlined class="tw-text-green-500 hover:tw-text-green-600 tw-cursor-pointer" />
              </a-tooltip>
              <a-tooltip title="Xoá">
                <DeleteOutlined class="tw-text-red-500 hover:tw-text-red-600 tw-cursor-pointer" />
              </a-tooltip>
            </div>
          </template>
        </BaseTable>

        <div
          class="tw-absolute tw-bottom-0 tw-left-0 tw-right-0 tw-bg-white/80 tw-text-[11px] tw-text-gray-500 tw-text-center tw-py-1 sm:tw-hidden">
          👉 Kéo ngang để xem thêm cột
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from "vue";
import {
  FileExcelOutlined,
  CopyOutlined,
  SearchOutlined,
  FileDoneOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";
import BaseTable from "../../BaseTable.vue";
import TreeFilter from "../../TreeFilter.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const searchKeyword = ref("");
const showFilter = ref(true);

const allColumns = [
  { title: "Mã lot", key: "lotNumber" },
  { title: "Mã tem QR", key: "qrLabelCode" },
  { title: "Trạng thái", key: "status" },
  { title: "Mã BTP đầu ra", key: "outputSfgCode" },
  { title: "Mã lệnh sản xuất", key: "workOrderCode" },
  { title: "Mã công đoạn", key: "processCode" },
  { title: "Máy", key: "machineName" },
  { title: "Nhóm line", key: "lineGroup" },
  { title: "Ca sản xuất", key: "productionShift" },
  { title: "Nhân viên thực hiện", key: "operatorName" },
  { title: "Phân loại", key: "classification" },
  { title: "Số lượng đầu ra thực tế", key: "actualOutputQuantity" },
  { title: "Số lượng đầu ra ước tính", key: "estimatedOutputQuantity" },
  { title: "Trọng lượng bì", key: "grossWeight" },
  { title: "Đơn vị tính", key: "unitOfMeasure" },
  { title: "Lot NVL", key: "materialLotCode" },
  { title: "Ngày tạo tem", key: "labelCreationDate", fieldtype: "Date" },
  { title: "Ngày huỷ tem", key: "labelCancellationDate", fieldtype: "Date" },
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
  min-width: 900px;
  table-layout: auto !important;
}

:deep(th),
:deep(td) {
  white-space: nowrap;
}

@media (max-width: 640px) {
  :deep(.ant-btn-link) {
    font-size: 12px !important;
  }

  :deep(.ant-menu-item) {
    font-size: 12px !important;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
