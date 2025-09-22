<template>
  <div class="bg-white p-6">
    <div class="mb-4">
      <label class="block text-md">Ngày bắt đầu - kết thúc</label>
      <a-range-picker
        v-model:value="dateRange"
        format="DD/MM/YYYY"
        class="w-full"
        :placeholder="['16/09/2020', '17/09/2021']"
        :suffix-icon="null"
      />
    </div>

    <div class="border rounded-sm p-2 max-h-80 overflow-y-auto">
      <a-tree
        checkable
        :tree-data="treeData"
        v-model:checkedKeys="checkedKeys"
        defaultExpandAll
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
