<template>
  <div class="p-6 flex justify-center items-center flex-col mt-2">
    <h1 class="text-xl font-bold">Please check var!</h1>
    <button
      @click="openDialog"
      class="px-4 py-2 bg-green-500 text-white rounded-lg mt-4"
    >
      Start Check
    </button>

    <ProductionInfoDialog ref="dialogRef" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import ProductionInfoDialog from "@/components/ProductionInfoDialog.vue";

const dialogRef = ref(null);

function openDialog() {
  dialogRef.value.open();
}
</script>
