<template>
  <div>
    <div class="tw-flex tw-flex-wrap tw-gap-2 tw-items-center tw-mb-2 tw-justify-between">
      <h3 v-if="title" class="tw-text-sm tw-font-semibold tw-text-blue-700 tw-uppercase">
        {{ title }}
      </h3>
      <div>
        <slot name="actions"></slot>
      </div>
    </div>

    <div class="tw-overflow-x-auto">
      <a-table :columns="columns" :data-source="rows" bordered size="small" row-key="id"
        :pagination="false" :scroll="{ x: scrollX || 1600 }" class="zebra-table">
        <template #bodyCell="slotProps">
          <slot name="bodyCell" v-bind="slotProps" />
        </template>

        <template #summary>
          <slot name="summary" />
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  columns: Array,
  rows: Array,
  scrollX: Number,
});
</script>

<style scoped>
.ant-table {
  font-size: 13px;
}
:deep(.ant-table-thead > tr > th) {
  background-color: #e6f4ff !important;
  color: #003a8c;
  font-weight: 600;
  text-align: center;
  white-space: normal !important;
  line-height: 1.2;
  vertical-align: middle;
  padding: 6px 8px !important;
}
:deep(.zebra-table .ant-table-tbody > tr:nth-child(odd) > td) {
  background-color: #fafafa !important;
}
:deep(.zebra-table .ant-table-tbody > tr:nth-child(even) > td) {
  background-color: #ffffff !important;
}
:deep(.zebra-table .ant-table-tbody > tr:hover > td) {
  background-color: #e6f4ff !important;
}
</style>
