<template>
  <div
    class="tw-ml-5 tw-flex tw-items-center tw-gap-3 tw-bg-gray-50 tw-px-3 tw-py-2 tw-rounded-xl tw-shadow-sm tw-border tw-border-gray-200 tw-w-fit hover:tw-shadow-md tw-transition"
  >
    <a-button
      type="primary"
      shape="circle"
      size="large"
      class="!tw-bg-red-500 hover:!tw-bg-red-600 !tw-border-none !tw-text-white tw-font-bold tw-transition-all tw-duration-150"
      @click="decrease"
    >
      -
    </a-button>

    <span
      class="tw-text-lg tw-font-semibold tw-text-gray-800 tw-min-w-[40px] tw-text-center"
    >
      {{ count }}
    </span>

    <a-button
      type="primary"
      shape="circle"
      size="large"
      class="!tw-bg-green-500 hover:!tw-bg-green-600 !tw-border-none !tw-text-white tw-font-bold tw-transition-all tw-duration-150"
      @click="increase"
    >
      +
    </a-button>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
const props = defineProps({ value: Number });
const emit = defineEmits(["update:value"]);

const count = ref(props.value || 0);

watch(
  () => props.value,
  (v) => (count.value = v)
);

function increase() {
  count.value++;
  emit("update:value", count.value);
}

function decrease() {
  if (count.value > 0) count.value--;
  emit("update:value", count.value);
}
</script>

<style scoped>
</style>
