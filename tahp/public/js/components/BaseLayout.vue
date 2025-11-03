<template>
  <div
    class="tw-flex tw-flex-col lg:tw-flex-row tw-gap-4 tw-w-full tw-h-[calc(100vh-200px)] tw-overflow-hidden"
  >
    <!-- Cột 1: Tree -->
    <Transition name="slide-left">
      <div
        v-if="!state.hide_tree"
        class="tw-w-full lg:tw-w-[220px] tw-flex-shrink-0 tw-rounded-lg tw-overflow-auto tw-bg-[#e8f3ff]"
      >
        <slot name="tree">
          <div class="tw-text-center">Tree Map Section</div>
        </slot>
      </div>
    </Transition>

    <!-- Cột 2: Flex + Records -->
    <div class="tw-flex tw-flex-col tw-flex-1 tw-gap-4 tw-overflow-hidden">
      <!-- Flex Section (tự nhiên, không cố định) -->
      <Transition name="slide-up">
        <div
          v-if="!state.hide_flex"
          class="tw-rounded-lg tw-min-h-[100px] tw-overflow-visible tw-bg-[#e8f3ff]"
        >
          <slot name="flex">
            <div class="tw-text-center">Flex Section</div>
          </slot>
        </div>
      </Transition>

      <!-- Record Section (cố định, scroll nội bộ) -->
      <div
        v-if="!state.hide_records"
        class="tw-flex-1 tw-min-h-0 tw-rounded-lg tw-overflow-auto tw-bg-[#e8f3ff]"
      >
        <slot name="records">
          <BaseTable :doctype="props.doctype" />
        </slot>
      </div>
    </div>
  </div>
</template>



<script setup>
import { reactive } from 'vue'
import BaseTable from "./BaseTable.vue"

const props = defineProps({
  hide_tree: Boolean,
  hide_flex: Boolean,
  hide_records: Boolean,
  doctype: String
})

const state = reactive({
  hide_tree: props.hide_tree,
  hide_flex: props.hide_flex,
  hide_records: props.hide_records ?? false,
})

function updateSetting(key, value) {
  if (key in state) {
    state[key] = value
  }
}

defineExpose({
  updateSetting
})
</script>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.4s ease;
}
.slide-left-enter-from {
  transform: translateX(-20px);
  opacity: 0;
}
.slide-left-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s ease;
}
.slide-up-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}
.slide-up-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>
