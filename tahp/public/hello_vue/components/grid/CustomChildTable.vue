<template>
  <div class="tw-border tw-rounded tw-p-2 tw-overflow-x-auto">
    <table class="tw-w-full tw-text-sm tw-border-collapse">
      <thead>
        <tr class="tw-bg-blue-100">
          <th class="tw-p-2 tw-border">Mã SP</th>
          <th class="tw-p-2 tw-border">Tên SP</th>
          <th class="tw-p-2 tw-border tw-text-right">Số lượng</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, idx) in rows"
          :key="idx"
          :class="rowClass(row.qty)"
        >
          <td class="tw-p-2 tw-border ">{{ row.item_code }}</td>
          <td class="tw-p-2 tw-border">{{ row.item_name }}</td>
          <td class="tw-p-2 tw-border tw-text-right">{{ row.qty }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="tw-bg-gray-50 tw-font-bold">
          <td colspan="2" class="tw-p-2 tw-border tw-text-right">Tổng</td>
          <td class="tw-p-2 tw-border tw-text-right">{{ totalQty }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  rows: { type: Array, default: () => [] }
});

const totalQty = computed(() =>
  props.rows.reduce((sum, r) => sum + (r.qty || 0), 0)
);

const rowClass = (qty) => {
  
  if (qty > 10) return "tw-bg-blue-100"; 
  if (qty <= 5) return "tw-bg-red-100";
  return ""; 
};
</script>
