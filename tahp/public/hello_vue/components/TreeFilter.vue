<template>
  <div class="tw-p-4">
    <div class="tw-mb-4">
      <a-range-picker
        v-model:value="dateRange"
        format="DD/MM/YYYY"
        class="tw-w-full"
        :placeholder="['Từ ngày', 'Đến ngày']"
        :suffix-icon="null"
      />
    </div>

    <div class="tw-border tw-rounded-lg tw-p-2 tw-max-h-[70vh] tw-overflow-y-auto">
      <a-tree
        checkable
        :tree-data="treeData"
        v-model:checkedKeys="checkedKeys"
        :defaultExpandedKeys="[]"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  showDateFilter: { type: Boolean, default: false },
});

const dateRange = ref([]);
const checkedKeys = ref([]);

const years = [2025, 2024];
const months = Array.from({ length: 12 }, (_, i) => i + 1);

const getDaysInMonth = (year, month) => {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

const treeData = computed(() =>
  years.map((year) => ({
    title: `Năm ${year}`,
    key: `${year}`,
    children: months.map((m) => ({
      title: `Tháng ${m}`,
      key: `${year}-${m}`,
      children: props.showDateFilter
        ? Array.from({ length: getDaysInMonth(year, m) }, (_, d) => ({
            title: `Ngày ${d + 1}`,
            key: `${year}-${m}-${d + 1}`,
          }))
        : undefined,
    })),
  }))
);
</script>
