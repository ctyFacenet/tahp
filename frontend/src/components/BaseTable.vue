<template>
  <div class="rounded-sm shadow p-4">
    <div class="overflow-x-auto">
      <table class="min-w-full border border-gray-200 text-xs sm:text-sm">
        <thead>
          <tr class="bg-blue-100 text-gray-700">
            <th class="px-2 py-2 border">STT</th>
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-2 py-2 border font-semibold"
            >
              <div class="flex items-center justify-between">
                <span>{{ col.title }}</span>
                <img
                  src="@/assets/icons/filter.svg"
                  alt="filter"
                  class="w-3 h-3 ml-1 cursor-pointer"
                />
              </div>
            </th>
          </tr>

          <tr>
            <th class="px-2 py-1 border"></th>
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-2 py-1 border"
            >
              <div class="flex items-center">
                <img
                  src="@/assets/icons/search.svg"
                  alt="search"
                  class="w-3 h-3 mr-2"
                />
                <input
                  v-model="filters[col.key]"
                  type="text"
                  class="w-full border-none px-2 py-1 text-xs"
                />
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, index) in paginatedRows"
            :key="index"
            class="hover:bg-gray-50"
          >
            <td class="px-2 py-1 border">
              {{ (currentPage - 1) * pageSize + index + 1 }}
            </td>
            <td v-for="col in columns" :key="col.key" class="px-2 py-1 border">
              {{ row[col.key] }}
            </td>
          </tr>

          <tr v-if="paginatedRows.length === 0">
            <td
              :colspan="columns.length + 1"
              class="text-center py-6 text-gray-500 italic border"
            >
              Không có dữ liệu
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-between items-center mt-4 flex-wrap gap-2">
      <a-select
        v-model:value="pageSize"
        :options="pageSizeOptions"
        class="hidden sm:block w-[105px]"
        @change="onPageSizeChange"
      />

      <div class="w-full flex justify-center sm:w-auto">
        <a-pagination
          v-model:current="currentPage"
          :total="filteredRows.length"
          :pageSize="pageSize"
          @change="onPageChange"
          :showSizeChanger="false"
        />
      </div>

      <div class="hidden sm:flex items-center gap-2">
        <span class="text-sm">Đi đến trang</span>
        <a-input-number
          v-model:value="goToPage"
          :min="1"
          :max="Math.ceil(filteredRows.length / pageSize)"
          @pressEnter="jumpToPage"
          style="width: 70px"
        />
      </div>
    </div>

    <div class="text-center mt-4 text-gray-500 text-sm">
      ©Copyright FaceNet. All Rights Reserved. Designed by FaceNet
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
});

const filters = ref({});
props.columns.forEach((col) => (filters.value[col.key] = ""));

const filteredRows = computed(() =>
  props.rows.filter((row) =>
    props.columns.every((col) =>
      row[col.key]
        ?.toString()
        .toLowerCase()
        .includes(filters.value[col.key].toLowerCase())
    )
  )
);

const currentPage = ref(1);
const pageSize = ref(10);
const goToPage = ref(null);

const pageSizeOptions = [
  { label: "10/Trang", value: 10 },
  { label: "20/Trang", value: 20 },
  { label: "50/Trang", value: 50 },
  { label: "100/Trang", value: 100 },
];

const onPageChange = (page) => (currentPage.value = page);

const onPageSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1;
};

const jumpToPage = () => {
  if (
    goToPage.value >= 1 &&
    goToPage.value <= Math.ceil(filteredRows.value.length / pageSize.value)
  ) {
    currentPage.value = goToPage.value;
  }
};

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});
</script>
