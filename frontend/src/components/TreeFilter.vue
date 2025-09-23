<template>
  <div class="bg-white p-4 w-full">
    <div class="mb-4">
      <label class="block text-md font-medium mb-1">Ngày bắt đầu - kết thúc</label>
      <a-range-picker
        v-model:value="dateRange"
        format="DD/MM/YYYY"
        class="w-full"
        :placeholder="['Ngày bắt đầu', 'Ngày kết thúc']"
        :suffix-icon="null"
      />
    </div>

    <div class="border rounded-sm p-2 max-h-96 overflow-y-auto">
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

const years = [2025, 2024, 2023, 2022, 2021, 2020];
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
