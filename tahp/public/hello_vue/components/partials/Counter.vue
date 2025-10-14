<template>
  <div class="tw-flex tw-items-center tw-justify-center tw-gap-3 tw-py-2 tw-w-full">
    <a-button
      shape="circle"
      class="tw-bg-red-500 hover:tw-bg-red-600 tw-text-white tw-font-bold"
      @click="decrease"
    >-</a-button>

    <span class="tw-text-lg tw-font-semibold tw-min-w-[60px] tw-text-center tw-select-none">
      {{ value }}
    </span>

    <a-button
      shape="circle"
      class="tw-bg-green-500 hover:tw-bg-green-600 tw-text-white tw-font-bold"
      @click="increase"
    >+</a-button>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { Button as AButton } from "ant-design-vue";

const props = defineProps({
  value: { type: Number, default: 0 },
  onUpdateValue: { type: Function, required: false },
});

const local = ref(props.value);

watch(
  () => props.value,
  (v) => (local.value = v)
);

function increase() {
  const newVal = local.value + 1;
  local.value = newVal;
  props.onUpdateValue?.(newVal);
}

function decrease() {
  const newVal = local.value - 1;
  local.value = newVal;
  props.onUpdateValue?.(newVal);
}
</script>
