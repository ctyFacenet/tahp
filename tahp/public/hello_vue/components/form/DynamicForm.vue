<template>
  <div class="tw-p-4 tw-bg-gray-50 tw-min-h-screen">
    <div class="tw-flex tw-items-center tw-justify-between tw-mb-4">
      <h2 class="tw-text-lg tw-font-semibold tw-text-blue-700">
        {{ title || 'THÔNG TIN CHUNG' }}
      </h2>
      <span
        class="tw-text-xs tw-text-gray-500 tw-bg-gray-100 tw-px-2 tw-py-1 tw-rounded-md tw-font-mono"
      >
        {{ doctype }}
      </span>
    </div>

    <component
      :is="currentFormComponent"
      v-if="currentFormComponent"
      :frm="frm"
    />

    <div v-else class="tw-text-gray-600 tw-italic">
      Không tìm thấy form phù hợp cho doctype: {{ doctype }}
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

import SaleOrderForm from "../../pages/SaleOrderForm.vue";
import WorkOrderForm from "../../pages/WorkOrderForm.vue";

const props = defineProps({
  frm: { type: Object, required: true },
  title: { type: String, default: "THÔNG TIN CHUNG" },
});

const doctype = computed(() => props.frm.doctype || "");

const currentFormComponent = computed(() => {
  switch (doctype.value) {
    case "Custom Sale Order":
      return SaleOrderForm;
    case "Custom Work Order":
      return WorkOrderForm;
    default:
      return null;
  }
});
</script>

<style scoped>
:deep(.ant-table) {
  font-size: 13px !important;
}
</style>
