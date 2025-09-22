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
import { ref } from "vue";

const dateRange = ref([]);
const checkedKeys = ref(["2025-6"]);

const years = [2025, 2024, 2023, 2022, 2021, 2020];
const months = [1, 2, 3, 4, 5, 6];

const treeData = years.map((year) => ({
  title: `Năm ${year}`,
  key: `${year}`,
  children: months.map((m) => ({
    title: `Tháng ${m}`,
    key: `${year}-${m}`,
  })),
}));
</script>
