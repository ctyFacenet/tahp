<template>
  <a-tabs v-model:activeKey="activeKey" type="card" class="tw-mt-2 tw-bg-white tw-rounded-md tw-shadow-sm">
    <slot />
  </a-tabs>
</template>

<script setup>
import { ref } from "vue";
const activeKey = ref("1");
</script>

<style scoped>
:deep(.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab) {
  border-radius: 8px 8px 0 0;
  background: #f0f6ff;
  font-weight: 500;
  color: #003a8c;
}
:deep(.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active) {
  background: #e6f4ff;
  border-color: #91caff;
  font-weight: 600;
}
</style>
