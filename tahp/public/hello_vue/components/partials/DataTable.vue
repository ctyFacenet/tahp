<template>
  <div class="tw-overflow-x-auto tw-w-full">
    <table class="tw-min-w-full tw-border-collapse tw-text-xs sm:tw-text-sm">
      <thead class="tw-bg-blue-200">
        <tr>
          <th
            v-for="(col, index) in columns"
            :key="col"
            class="tw-border tw-border-gray-300 tw-px-2 tw-py-2 tw-text-center tw-font-medium tw-whitespace-nowrap tw-min-w-[120px]"
            :class="index === 0 ? 'tw-sticky tw-left-0 tw-z-10 tw-bg-blue-200' : ''"
          >
            {{ col }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(row, i) in modelValue"
          :key="i"
          class="hover:tw-bg-gray-50"
        >
          <td
            v-for="(cell, j) in row"
            :key="j"
            class="tw-border tw-border-gray-300 tw-px-2 tw-py-2 tw-text-center tw-whitespace-nowrap tw-min-w-[120px]"
            :class="j === 0 ? 'tw-sticky tw-left-0 tw-z-10 tw-bg-white' : ''"
          >
            <input
              v-if="editable"
              :value="cell"
              class="tw-w-full tw-bg-transparent tw-outline-none tw-text-center"
              @input="updateCell(i, j, $event.target.value)"
            />
            <span v-else>{{ cell }}</span>
          </td>
        </tr>
      </tbody>

      <tfoot v-if="footer && footer.length">
        <tr class="tw-bg-gray-50 tw-font-semibold">
          <td
            v-for="(cell, j) in footer"
            :key="'footer-' + j"
            class="tw-border tw-border-gray-300 tw-px-2 tw-py-2 tw-text-center tw-whitespace-nowrap tw-min-w-[120px]"
            :class="[j === 0 ? 'tw-sticky tw-left-0 tw-z-10 tw-bg-gray-50' : '', isNumber(cell) ? 'tw-text-red-600' : '']"
          >
            {{ cell }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup>
const props = defineProps({
  columns: Array,
  modelValue: { type: Array, default: () => [] },
  footer: { type: Array, default: () => [] },
  editable: { type: Boolean, default: false }
})

const emit = defineEmits(["update:modelValue"])

function updateCell(rowIndex, colIndex, value) {
  const updated = [...props.modelValue]
  updated[rowIndex] = [...updated[rowIndex]]
  updated[rowIndex][colIndex] = value
  emit("update:modelValue", updated)
}

function isNumber(val) {
  return !isNaN(parseFloat(val)) && isFinite(val)
}
</script>
