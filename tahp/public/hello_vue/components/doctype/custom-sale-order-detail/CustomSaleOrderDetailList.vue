<template>
  <div class="tw-flex tw-gap-4 tw-p-4 tw-bg-gray-50 tw-min-h-screen tw-overflow-hidden">
    <div class="tw-w-[260px] tw-bg-white tw-rounded-xl tw-shadow tw-p-3">
      <TreeFilter :showDateFilter="false" />
    </div>

    <div class="tw-flex-1 tw-flex tw-flex-col tw-bg-white tw-rounded-xl tw-shadow tw-p-4 tw-overflow-hidden">
      <div
        class="tw-flex tw-justify-between tw-items-center tw-mb-3 tw-relative tw-px-2"
      >
        <h2
          class="tw-text-[15px] tw-font-semibold tw-text-gray-800 tw-uppercase tw-text-center tw-w-full"
        >
          DANH SÁCH ĐƠN HÀNG CHI TIẾT
        </h2>

        <div
          class="tw-absolute tw-top-0 tw-right-0 tw-flex tw-items-center tw-gap-2"
        >
          <a-button type="primary" class="tw-bg-[#2490ef] tw-h-[30px] tw-text-xs">Duyệt</a-button>
          <a-button type="default" class="tw-h-[30px] tw-text-xs tw-border-gray-300">Hủy duyệt</a-button>
          <a-input
            v-model:value="searchKeyword"
            placeholder="Nhập thông tin để tìm kiếm"
            class="tw-w-[220px] tw-h-[30px] tw-text-[13px]"
            size="small"
            allowClear
          >
            <template #prefix>
              <SearchOutlined class="tw-text-gray-400" />
            </template>
          </a-input>
        </div>
      </div>

      <div class="tw-flex-1 tw-overflow-hidden">
        <BaseTable :columns="columns" :rows="filteredRows" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { SearchOutlined } from "@ant-design/icons-vue";
import BaseTable from "../../BaseTable.vue";
import TreeFilter from "../../TreeFilter.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
});

const searchKeyword = ref("");

const columns = [
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
  { title: "Số lượng còn phải giao", key: "remainingDeliveryQuantity" },
  { title: "Số lượng hoàn thành", key: "completedQuantity" },
  { title: "Đơn vị tính", key: "unitOfMeasure" },
  { title: "Ngày giao hàng", key: "deliveryDate", fieldtype: "Date" },
  { title: "Thao tác", key: "actions" },
];

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
