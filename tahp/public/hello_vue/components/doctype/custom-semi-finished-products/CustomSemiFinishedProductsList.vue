<template>
  <div class="tw-flex tw-gap-4 tw-p-4 tw-bg-gray-50 tw-min-h-screen tw-overflow-hidden">
    <div class="tw-w-[260px] tw-bg-white tw-rounded-xl tw-shadow tw-p-3">
      <TreeFilter :showDateFilter="true" />
    </div>

    <div class="tw-flex-1 tw-flex tw-flex-col tw-bg-white tw-rounded-xl tw-shadow tw-p-4 tw-overflow-hidden">
      <div class="tw-flex tw-flex-col tw-mb-3 md:tw-items-start">
        <h2 class="tw-text-[15px] tw-font-semibold tw-text-gray-800 tw-uppercase tw-text-center md:tw-text-left">
          DANH SÁCH TEM BÁN THÀNH PHẨM
        </h2>

        <div
          class="tw-flex tw-items-center tw-gap-3 tw-flex-wrap tw-justify-end md:tw-justify-start tw-mt-2 tw-text-[13px]">
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

            <a-button type="text" class="tw-flex tw-items-center tw-justify-center tw-p-0"
              title="Chọn cột hiển thị / Choose columns">
              <CopyOutlined class="tw-text-[#2490ef] tw-text-[13px] hover:tw-text-[#1677c8]" />
            </a-button>
          </a-dropdown>

          <a-input v-model:value="searchKeyword" placeholder="Nhập thông tin để tìm kiếm"
            class="tw-w-[300px] tw-h-[28px] tw-text-[13px] tw-rounded-sm tw-border-[#2490ef] focus:tw-shadow-none"
            size="small" allowClear>
            <template #prefix>
              <SearchOutlined class="tw-text-gray-400" />
            </template>
          </a-input>
        </div>
      </div>


      <div class="tw-flex-1 tw-overflow-hidden">
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
  DeleteOutlined
} from "@ant-design/icons-vue";
import BaseTable from "../../BaseTable.vue";
import TreeFilter from "../../TreeFilter.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const searchKeyword = ref("");

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
  {
    title: "Số lượng đầu ra thực tế",
    key: "actualOutputQuantity",
  },
  {
    title: "Số lượng đầu ra ước tính",
    key: "estimatedOutputQuantity",
  },
  { title: "Trọng lượng bì", key: "grossWeight" },
  { title: "Đơn vị tính", key: "unitOfMeasure" },
  { title: "Lot NVL", key: "materialLotCode" },
  { title: "Ngày tạo tem", key: "labelCreationDate", fieldtype: "Date" },
  {
    title: "Ngày hủy tem",
    key: "labelCancellationDate",
    fieldtype: "Date"
  },
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
