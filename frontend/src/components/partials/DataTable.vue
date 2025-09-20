<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <thead class="bg-blue-200">
        <tr>
          <th
            v-for="col in columns"
            :key="col"
            class="border border-gray-100 px-2 py-1 text-center font-medium"
          >
            {{ col }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(row, i) in rows" :key="i" class="hover:bg-gray-50">
          <td
            v-for="(cell, j) in row"
            :key="j"
            class="border border-gray-100 px-2 py-1 text-center"
          >
            {{ cell }}
          </td>
        </tr>
      </tbody>

      <tfoot v-if="footer && footer.length">
        <tr class="bg-gray-50 font-semibold">
          <td
            v-for="(cell, j) in footer"
            :key="'footer-' + j"
            class="border border-gray-300 px-2 py-1 text-center"
            :class="[isNumber(cell) ? 'text-red-600' : '']"
          >
            {{ cell }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup>
defineProps({
  columns: Array,
  rows: Array,
  footer: { type: Array, default: () => [] },
})

function isNumber(val) {
  return !isNaN(parseFloat(val)) && isFinite(val)
}
</script>
