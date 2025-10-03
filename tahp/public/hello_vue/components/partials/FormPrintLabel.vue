<template>
  <div class="tw-border tw-border-gray-300 tw-rounded-md tw-p-4 tw-bg-white tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-4 tw-text-sm">
    <div>
      <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">Mã tem QR</label>
      <input v-model="localModel.qrCode" class="tw-w-full tw-border tw-border-gray-300 tw-rounded-sm tw-px-2 tw-py-1 tw-text-sm tw-bg-gray-100" readonly />
    </div>

    <div>
      <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">Mã BTP đầu ra</label>
      <input v-model="localModel.btpCode" class="tw-w-full tw-border tw-border-gray-300 tw-rounded-sm tw-px-2 tw-py-1 tw-text-sm tw-bg-gray-100" readonly />
    </div>

    <div>
      <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">Mã lệnh sản xuất</label>
      <input v-model="localModel.orderCode" class="tw-w-full tw-border tw-border-red-400 tw-bg-red-100 tw-rounded-sm tw-px-2 tw-py-1 tw-text-sm" />
    </div>

    <div>
      <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">Mã công đoạn</label>
      <input v-model="localModel.operationCode" class="tw-w-full tw-border tw-border-red-400 tw-bg-red-100 tw-rounded-sm tw-px-2 tw-py-1 tw-text-sm" />
    </div>

    <div>
      <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">Lot</label>
      <input v-model="localModel.lot" class="tw-w-full tw-border tw-border-gray-300 tw-rounded-sm tw-px-2 tw-py-1 tw-text-sm tw-bg-gray-100" readonly />
    </div>

    <div>
      <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">Lot NVL</label>
      <input v-model="localModel.materialLot" class="tw-w-full tw-border tw-border-gray-300 tw-rounded-sm tw-px-2 tw-py-1 tw-text-sm tw-bg-gray-100" readonly />
    </div>

    <div>
      <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">Số lượng thực tế</label>
      <input v-model="localModel.quantity" type="number" class="tw-w-full tw-border tw-border-red-400 tw-bg-red-100 tw-rounded-sm tw-px-2 tw-py-1 tw-text-sm" />
    </div>

    <div>
      <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">Đơn vị tính</label>
      <input v-model="localModel.unit" class="tw-w-full tw-border tw-border-gray-300 tw-rounded-sm tw-px-2 tw-py-1 tw-text-sm tw-bg-gray-100" readonly />
    </div>

    <div>
      <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">Nhân viên thực hiện</label>
      <input v-model="localModel.operator" class="tw-w-full tw-border tw-border-red-400 tw-bg-red-100 tw-rounded-sm tw-px-2 tw-py-1 tw-text-sm" />
    </div>

    <div>
      <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">Trọng lượng bi</label>
      <input v-model="localModel.ballWeight" type="number" class="tw-w-full tw-border tw-border-gray-300 tw-rounded-sm tw-px-2 tw-py-1 tw-text-sm" />
    </div>

    <div>
      <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">Phân loại hàng</label>
      <div class="tw-flex tw-items-center tw-space-x-8">
        <label><input type="radio" value="OK" v-model="localModel.classification" /> OK</label>
        <label><input type="radio" value="NG" v-model="localModel.classification" /> NG</label>
      </div>
    </div>

    <div>
      <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">Tên lỗi</label>
      <select v-model="localModel.errorName" class="tw-w-full tw-border tw-border-red-400 tw-bg-red-100 tw-rounded-sm tw-px-2 tw-py-1 tw-text-sm">
        <option disabled value="">Chọn lỗi</option>
        <option value="DIR001">Đường kính nhỏ</option>
        <option value="DIR002">Đường kính to</option>
        <option value="NQ_XMAU">Ngoại quan (xỉn màu)</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from "vue"

const props = defineProps({
  modelValue: { type: Object, required: true }
})
const emit = defineEmits(["update:modelValue"])

const localModel = reactive({ ...props.modelValue })

watch(localModel, (val) => {
  emit("update:modelValue", val)
}, { deep: true })

watch(() => props.modelValue, (val) => {
  Object.assign(localModel, val)
}, { deep: true })
</script>
