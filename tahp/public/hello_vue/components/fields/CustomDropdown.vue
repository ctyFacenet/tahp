<template>
  <a-select v-model:value="value" class="tw-w-full">
    <a-select-option v-for="opt in options" :key="opt" :value="opt">
      {{ opt }}
    </a-select-option>
  </a-select>
</template>

<script setup>
import { ref } from "vue";
const props = defineProps({ df: Object });
const value = ref("");
const options = ["Option A", "Option B", "Option C"];
</script>
