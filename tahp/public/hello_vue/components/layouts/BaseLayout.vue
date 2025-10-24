<template>
  <div
    class="tw-flex tw-flex-col lg:tw-flex-row tw-gap-4 tw-p-4 tw-bg-gray-50 tw-min-h-screen tw-overflow-auto"
  >
    <transition name="slide-left">
      <div
        v-if="showFilter"
        class="tw-w-full lg:tw-w-[260px] tw-bg-white tw-rounded-xl tw-shadow tw-p-3 tw-flex-shrink-0"
      >
        <TreeFilter :showDateFilter="showDateFilter" @change="onFilterChange" />
      </div>
    </transition>

    <div
      class="tw-flex-1 tw-flex tw-flex-col tw-bg-white tw-rounded-xl tw-shadow tw-p-4 tw-overflow-hidden"
    >
      <div
        class="tw-pb-2 tw-mb-3 tw-relative tw-shrink-0 tw-flex-col sm:tw-flex-row tw-items-center tw-justify-between tw-gap-2"
      >
        <h2
          class="tw-text-[14px] tw-font-semibold tw-text-gray-800 tw-uppercase tw-text-center"
        >
          {{ title }}
        </h2>

        <div class="tw-flex tw-items-center tw-gap-2 tw-justify-end">
          <a-button
            v-if="showFilterButton"
            class="tw-flex tw-items-center tw-justify-center tw-gap-1 tw-border tw-border-[#2490ef] tw-text-[#2490ef] hover:tw-bg-[#2490ef] hover:tw-text-white tw-text-[13px] tw-rounded-md tw-h-[28px] tw-px-2 tw-font-medium"
            size="small"
            @click="toggleFilter"
          >
            <SearchOutlined class="tw-text-[14px]" />
            <span>Bộ lọc</span>
          </a-button>

          <slot name="actions" />
        </div>
      </div>

      <div class="tw-flex-1 tw-w-full tw-h-full tw-overflow-x-auto tw-rounded-md">
        <slot />
      </div>

      <div
        class="tw-absolute tw-bottom-0 tw-left-0 tw-right-0 tw-bg-white/80 tw-text-[11px] tw-text-gray-500 tw-text-center tw-py-1 sm:tw-hidden"
      >
        👉 Kéo ngang để xem thêm cột
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { SearchOutlined } from "@ant-design/icons-vue";
import TreeFilter from "../TreeFilter.vue";

const props = defineProps({
  title: { type: String, required: true },
  showDateFilter: { type: Boolean, default: false },
  showFilterButton: { type: Boolean, default: true },
});

const showFilter = ref(true);
const toggleFilter = () => (showFilter.value = !showFilter.value);

const onFilterChange = () => {
  if (window.innerWidth < 1024) showFilter.value = false;
};
</script>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.25s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-15px);
}
</style>
