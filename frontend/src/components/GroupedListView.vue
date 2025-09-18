<script setup>
import { ListView } from 'frappe-ui'

const props = defineProps({
  title: {
    type: String,
    default: 'Danh sách',
  },
  columns: {
    type: Array,
    required: true,
  },
  rows: {
    type: Array,
    required: true,
  },
  rowKey: {
    type: String,
    default: 'id',
  },
})
</script>

<template>
  <div class="p-6">
    <h1 class="text-xl font-bold mb-4">{{ title }}</h1>

    <ListView :columns="columns" :rows="rows" :row-key="rowKey">
      <template #group-header="{ group }">
        <div
          class="flex items-center justify-between cursor-pointer bg-gray-100 px-2 py-1 font-semibold"
          @click="group.collapsed = !group.collapsed"
        >
          <span>{{ group.group }} ({{ group.rows.length }})</span>
        </div>
      </template>

      <template #cell="{ item, column }">
        <span v-if="column.key === 'status'">
          <span
            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
            :class="item === 'Tắt' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'"
          >
            ● {{ item }}
          </span>
        </span>
        <span v-else>{{ item }}</span>
      </template>
    </ListView>
  </div>
</template>
