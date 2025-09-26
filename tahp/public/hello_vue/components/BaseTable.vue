<template>
  <div class="tw-rounded tw-border tw-border-gray-200 tw-p-4">
    <div class="tw-overflow-x-auto">
      <table class="tw-min-w-full tw-border tw-border-gray-200 tw-text-xs sm:tw-text-sm">
        <thead>
          <tr class="tw-bg-blue-100 tw-text-gray-700">
            <th class="tw-px-2 tw-py-2 tw-border">STT</th>
            <th
              v-for="col in columns"
              :key="col.key"
              class="tw-px-2 tw-py-2 tw-border tw-font-semibold"
            >
              <div class="tw-flex tw-items-center tw-justify-between">
                <span>{{ col.title }}</span>
                <img
                  src="/assets/tahp/hello_vue/assets/icons/filter.svg"
                  alt="filter"
                  class="tw-w-3 tw-h-3 tw-ml-1 tw-cursor-pointer"
                />
              </div>
            </th>
          </tr>

          <tr>
            <th class="tw-px-2 tw-py-1 tw-border"></th>
            <th
              v-for="col in columns"
              :key="col.key"
              class="tw-px-2 tw-py-1 tw-border"
            >
              <div class="tw-flex tw-items-center">
                <img
                  src="/assets/tahp/hello_vue/assets/icons/search.svg"
                  alt="search"
                  class="tw-w-3 tw-h-3 tw-mr-2"
                />
                <input
                  v-model="filters[col.key]"
                  type="text"
                  class="tw-w-full tw-border-none tw-px-2 tw-py-1 tw-text-xs"
                />
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, index) in paginatedRows"
            :key="index"
            class="hover:tw-bg-gray-50"
          >
            <td class="tw-px-2 tw-py-1 tw-border">
              {{ (currentPage - 1) * pageSize + index + 1 }}
            </td>
            <td v-for="col in columns" :key="col.key" class="tw-px-2 tw-py-1 tw-border">
              {{ row[col.key] }}
            </td>
          </tr>

          <tr v-if="paginatedRows.length === 0">
            <td
              :colspan="columns.length + 1"
              class="tw-text-center tw-py-6 tw-text-gray-500 tw-italic tw-border"
            >
              Không có dữ liệu
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-justify-between sm:tw-items-center tw-mt-4 tw-gap-4">
      <a-select
        v-model:value="pageSize"
        :options="pageSizeOptions"
        class="tw-hidden sm:tw-block tw-w-[105px]"
        @change="onPageSizeChange"
      />

      <div class="tw-flex tw-flex-col sm:tw-flex-row sm:tw-items-center sm:tw-gap-4 tw-text-center sm:tw-text-left">
        <span class="tw-text-sm tw-hidden sm:tw-inline">
          {{ `Trang số ${currentPage} của ${totalPages} (${filteredRows.length} bản ghi)` }}
        </span>

        <a-pagination
          v-model:current="currentPage"
          :total="filteredRows.length"
          :pageSize="pageSize"
          @change="onPageChange"
          :showSizeChanger="false"
        />
      </div>

      <div class="tw-hidden sm:tw-flex tw-items-center tw-gap-2 tw-justify-center sm:tw-justify-start">
        <span class="tw-text-sm">Đi đến trang</span>
        <a-input-number
          v-model:value="goToPage"
          :min="1"
          :max="totalPages"
          @pressEnter="jumpToPage"
          style="width: 70px"
        />
      </div>
    </div>

    <div class="tw-text-center tw-mt-4 tw-text-black tw-text-sm">
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

const totalPages = computed(() => {
  return Math.ceil(filteredRows.value.length / pageSize.value) || 1;
});
</script>
