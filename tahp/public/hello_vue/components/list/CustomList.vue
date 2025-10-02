<template>
  <div class="tw-p-2 tw-bg-white tw-rounded tw-shadow">
    <h3 class="tw-font-bold tw-mb-2">Custom Filters</h3>
    <a-input-search
      v-model:value="search"
      placeholder="Tìm kiếm nâng cao"
      enter-button
      @search="onSearch"
    />
    <a-select
      v-model:value="status"
      class="tw-w-full tw-mt-2"
      placeholder="Chọn trạng thái"
    >
      <a-select-option value="Open">Open</a-select-option>
      <a-select-option value="Closed">Closed</a-select-option>
    </a-select>
  </div>
</template>

<script setup>
import { ref } from "vue";
const search = ref("");
const status = ref("");

function onSearch(val) {
  frappe.msgprint(`Searching for ${val} with status ${status.value}`);
}
</script>
