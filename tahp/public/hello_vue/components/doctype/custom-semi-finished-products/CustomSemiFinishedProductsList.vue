<template>
  <BaseLayout title="Danh sách tem bán thành phẩm" :showDateFilter="true">
    <template #actions>
      <div
        class="tw-flex tw-flex-wrap tw-items-center tw-justify-center sm:tw-justify-start tw-gap-2 tw-w-full sm:tw-w-auto">
        <a-button type="link" class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef]">
          <FileDoneOutlined /> Duyệt huỷ tem
        </a-button>

        <a-button type="link" class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef]">
          <FileExcelOutlined /> Xuất Excel
        </a-button>

        <a-button type="link" class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef]">
          <DeleteOutlined /> Xoá
        </a-button>

        <a-dropdown trigger="click" placement="bottomRight">
          <template #overlay>
            <div
              class="tw-max-h-[300px] tw-max-w-[250px] tw-overflow-y-auto tw-overflow-x-auto tw-bg-white tw-rounded-md tw-shadow-lg tw-border tw-border-gray-200">
              <a-menu>
                <a-menu-item v-for="col in allColumns" :key="col.key"
                  class="tw-text-[13px] tw-whitespace-nowrap tw-flex tw-items-center">
                  <a-checkbox v-model:checked="visibleColumns[col.key]" @change="updateVisibleColumns">
                    {{ col.title }}
                  </a-checkbox>
                </a-menu-item>
              </a-menu>
            </div>
          </template>
          <a-button type="text" class="tw-flex tw-items-center tw-justify-center tw-p-0" title="Chọn cột hiển thị">
            <CopyOutlined class="tw-text-[#2490ef]" />
          </a-button>
        </a-dropdown>

        <div class="tw-w-full sm:tw-w-[220px] md:tw-w-[300px]">
          <a-input v-model:value="searchKeyword" placeholder="Nhập thông tin để tìm kiếm"
            class="tw-h-[30px] tw-text-[13px] tw-rounded-sm tw-border-[#2490ef] tw-w-full" size="small" allowClear>
            <template #prefix>
              <SearchOutlined class="tw-text-gray-400" />
            </template>
          </a-input>
        </div>
      </div>
    </template>

    <BaseTable :columns="displayedColumns" :rows="filteredRows" group-by="lotNumber" :doctype="docType" :nameKey="'name'">
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
  </BaseLayout>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import {
  FileExcelOutlined,
  CopyOutlined,
  SearchOutlined,
  FileDoneOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";
import BaseLayout from "../../layouts/BaseLayout.vue";
import BaseTable from "../../BaseTable.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const searchKeyword = ref("");

const docType = computed(() => props.rows?.[0]?.docType || "");

const allColumns = [
  { title: "Mã lot", key: "lotNumber" },
  { title: "Mã tem QR", key: "qrLabelCode" },
  { title: "Trạng thái", key: "status" },
  { title: "Mã BTP đầu ra", key: "outputSfgCode" },
  { title: "Mã lệnh sản xuất", key: "workOrderCode" },
  { title: "Máy", key: "machineName" },
  { title: "Ca sản xuất", key: "productionShift" },
  { title: "Nhân viên thực hiện", key: "operatorName" },
  { title: "Số lượng đầu ra thực tế", key: "actualOutputQuantity" },
  { title: "Trọng lượng bì", key: "grossWeight" },
  { title: "Ngày tạo tem", key: "labelCreationDate", fieldtype: "Date" },
  { title: "Ngày huỷ tem", key: "labelCancellationDate", fieldtype: "Date" },
  { title: "Thao tác", key: "actions" },
];

const visibleColumns = reactive({});
allColumns.forEach((col) => (visibleColumns[col.key] = true));
const displayedColumns = ref([...allColumns]);
const updateVisibleColumns = () =>
  (displayedColumns.value = allColumns.filter((c) => visibleColumns[c.key]));

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
