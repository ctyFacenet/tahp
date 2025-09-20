<template>
  <div class="overflow-x-auto w-full">
    <table class="min-w-full border-collapse text-xs sm:text-sm">
      <thead class="bg-blue-200">
        <tr>
          <th
            v-for="(col, index) in columns"
            :key="col"
            class="border border-gray-300 px-2 py-2 text-center font-medium whitespace-nowrap min-w-[120px]"
            :class="index === 0 ? 'sticky left-0 z-10 bg-blue-200' : ''"
          >
            {{ col }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(row, i) in rows"
          :key="i"
          class="hover:bg-gray-50"
        >
          <td
            v-for="(cell, j) in row"
            :key="j"
            class="border border-gray-300 px-2 py-2 text-center whitespace-nowrap min-w-[120px]"
            :class="j === 0 ? 'sticky left-0 z-10 bg-white' : ''"
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
            class="border border-gray-300 px-2 py-2 text-center whitespace-nowrap min-w-[120px]"
            :class="[j === 0 ? 'sticky left-0 z-10 bg-gray-50' : '', isNumber(cell) ? 'text-red-600' : '']"
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
