<template>
  <div class="tw-flex tw-gap-4 tw-p-4 tw-bg-gray-50 tw-min-h-screen tw-overflow-hidden">
    <div class="tw-w-[260px] tw-bg-white tw-rounded-xl tw-shadow tw-p-3">
      <TreeFilter :showDateFilter="false" />
    </div>

    <div class="tw-flex-1 tw-flex tw-flex-col tw-bg-white tw-rounded-xl tw-shadow tw-p-4 tw-overflow-hidden">
      <div class="tw-flex tw-justify-between tw-items-center tw-mb-3 tw-relative tw-px-2">
        <h2 class="tw-text-[15px] tw-font-semibold tw-text-gray-800 tw-uppercase tw-text-center tw-w-full">
          DANH SÁCH ĐƠN HÀNG CHI TIẾT
        </h2>

        <div class="tw-absolute tw-top-0 tw-right-0 tw-flex tw-items-center tw-gap-3 tw-text-[13px]">
          <a-button type="link"
            class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
            <template #icon>
              <LockOutlined class="tw-text-[#2490ef]" />
            </template>
            Duyệt
          </a-button>

          <a-button type="link"
            class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
            <template #icon>
              <UnlockOutlined class="tw-text-[#2490ef]" />
            </template>
            Hủy duyệt
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
              <CopyOutlined class="tw-text-[#2490ef] tw-text-[13px] hover:tw-text-[#1677c8]" />
            </a-button>
          </a-dropdown>

          <a-input v-model:value="searchKeyword" placeholder="Nhập thông tin để tìm kiếm"
            class="tw-w-[220px] tw-h-[28px] tw-text-[13px] tw-rounded-md tw-border-[#2490ef] focus:tw-shadow-none"
            size="small" allowClear>
            <template #prefix>
              <SearchOutlined class="tw-text-gray-400" />
            </template>
          </a-input>
        </div>
      </div>

      <div class="tw-flex-1 tw-overflow-hidden">
        <BaseTable
          :columns="displayedColumns"
          :rows="filteredRows"
          group-by="detailOrderCode"
        >
          <template #actions="{ row }">
            <div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
              <a-tooltip title="Phê duyệt">
                <LockOutlined class="tw-text-green-500 hover:tw-text-green-600 tw-cursor-pointer" />
              </a-tooltip>
              <a-tooltip title="Hủy phê duyệt">
                <UnlockOutlined class="tw-text-red-500 hover:tw-text-red-600 tw-cursor-pointer" />
              </a-tooltip>
              <a-tooltip title="Xem lịch sử thay đổi">
                <HistoryOutlined class="tw-text-blue-500 hover:tw-text-blue-600 tw-cursor-pointer" />
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
  LockOutlined,
  UnlockOutlined,
  CopyOutlined,
  SearchOutlined,
  HistoryOutlined,
} from "@ant-design/icons-vue";
import BaseTable from "../../BaseTable.vue";
import TreeFilter from "../../TreeFilter.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const searchKeyword = ref("");

const allColumns = [
  { title: "Mã đơn hàng chi tiết", key: "detailOrderCode" },
  { title: "Trạng thái", key: "status" },
  { title: "Ngày tạo đơn chi tiết", key: "detailOrderCreationDate", fieldtype: "Date" },
  { title: "Mã đơn hàng tổng", key: "masterOrderCode" },
  { title: "Ngày tạo đơn hàng tổng", key: "masterOrderCreationDate", fieldtype: "Date" },
  { title: "Mã khách hàng", key: "customerCode" },
  { title: "Khách hàng", key: "customerName" },
  { title: "Mã hàng", key: "productCode" },
  { title: "Tên hàng", key: "productName" },
  { title: "Số lượng yêu cầu", key: "requestedQuantity" },
  { title: "Số lượng giữ", key: "reservedQuantity" },
  { title: "Số lượng cần sản xuất", key: "requiredProductionQty" },
  { title: "Số lượng đã giao", key: "deliveredQuantity" },
  { title: "Số lượng còn phải giao", key: "remainingQuantity" },
  { title: "Số lượng hoàn thành", key: "completedQuantity" },
  { title: "Đơn vị tính", key: "unitOfMeasure" },
  { title: "Ngày giao hàng", key: "deliveryDate", fieldtype: "Date" },
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
