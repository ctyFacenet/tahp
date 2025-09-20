<template>
  <div class="border border-gray-300 rounded-md p-4 bg-white grid grid-cols-2 gap-4 text-sm">
    <div v-for="(val, label) in fields" :key="label">
      <label class="block text-gray-600 text-xs mb-1">{{ label }}</label>
      <input
        class="w-full border border-gray-300 rounded-sm px-2 py-1 bg-gray-100 text-sm"
        :value="val"
        readonly
      />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  formData: { type: Object, required: true },
})

const fields = {
  "Mã QR": props.formData.maQr,
  "Mã BTP": props.formData.maBtp,
  "Mã lệnh": props.formData.maLenh,
  "Ca": props.formData.ca,
  "Máy": props.formData.may,
  "Nhóm line": props.formData.nhom,
  "Số lượng": props.formData.soLuong,
  "Đơn vị tính": props.formData.dvt,
  "Nhân viên": props.formData.nhanVien,
  "Ngày in": props.formData.ngayIn,
}
</script>
