<template>
  <div class="hello-world">
    <h3>Hello from Vue🚀</h3>
    <p>{{ message }}</p>
    <button class="btn btn-primary" @click="sayHello">Click Me</button>
  </div>
</template>

<script setup>
const props = defineProps({
  message: { type: String, default: "This is a Vue component inside tahp app" }
});

function sayHello() {
  frappe.msgprint("Hello from Vue inside BOM form!");
}
</script>

<style scoped>
.hello-world {
  padding: 10px;
  border: 1px dashed var(--dark-border-color);
  border-radius: 5px;
  margin-top: 10px;
}
</style>
