<template>
  <BaseLayout title="Danh sách đơn hàng chi tiết" :showDateFilter="false">
    <template #actions>
      <div
        class="tw-flex tw-flex-wrap tw-items-center tw-justify-center sm:tw-justify-start tw-gap-2 tw-w-full sm:tw-w-auto">
        <a-button type="link"
          class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
          <LockOutlined />
          Duyệt
        </a-button>

        <a-button type="link"
          class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
          <UnlockOutlined />
          Hủy duyệt
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
            <CopyOutlined class="tw-text-[#2490ef] tw-text-[15px] hover:tw-text-[#1677c8]" />
          </a-button>
        </a-dropdown>
      </div>

      <div class="tw-w-full sm:tw-w-[240px] md:tw-w-[300px]">
        <a-input v-model:value="searchKeyword" placeholder="Nhập thông tin để tìm kiếm"
          class="tw-h-[30px] tw-text-[13px] tw-rounded-sm tw-border-[#2490ef] focus:tw-shadow-none tw-w-full"
          size="small" allowClear>
          <template #prefix>
            <SearchOutlined class="tw-text-gray-400" />
          </template>
        </a-input>
      </div>
    </template>

    <BaseTable :columns="displayedColumns" :rows="filteredRows" group-by="detailOrderCode" :doctype="docType" :nameKey="'name'">
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
  </BaseLayout>
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
import BaseLayout from "../../layouts/BaseLayout.vue";
import BaseTable from "../../BaseTable.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const searchKeyword = ref("");

const docType = computed(() => props.rows?.[0]?.docType || "");

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

<style scoped>
:deep(.ant-input-affix-wrapper) {
  height: 32px !important;
  font-size: 13px !important;
}
</style>
