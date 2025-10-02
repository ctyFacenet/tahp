<template>
  <div class="tw-p-4 tw-border tw-rounded tw-bg-gray-50">
    <h3 class="tw-font-bold">Custom Form Panel</h3>
    <a-button type="primary" @click="saveNote">Save Custom Note</a-button>
  </div>
</template>

<script setup>
function saveNote() {
  frappe.msgprint("Saved custom note with Vue 🚀");
}
</script>
