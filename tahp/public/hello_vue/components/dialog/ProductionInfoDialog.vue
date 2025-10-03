<template>
  <div class="tw-p-4 tw-space-y-4 tw-overflow-y-auto tw-flex-1 tw-max-h-[calc(100vh-120px)]">
    <div class="tw-border tw-border-gray-300 tw-rounded-md tw-p-4 tw-bg-white tw-space-y-4">
      <div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-4 tw-text-sm">
        <div v-for="(val, label) in headerFields" :key="label">
          <label class="tw-block tw-text-gray-600 tw-text-xs tw-mb-1">{{ label }}</label>
          <input
            class="tw-w-full tw-border tw-border-gray-300 tw-rounded-sm tw-px-2 tw-py-1 tw-bg-gray-100 tw-text-sm"
            :value="val"
            readonly
          />
        </div>
      </div>

      <div>
        <label class="tw-block tw-text-gray-700 tw-text-sm tw-mb-1">Trạng thái</label>
        <button class="tw-w-full sm:tw-w-1/2 lg:tw-w-[calc(25%-11px)] 
                       tw-bg-cyan-500 tw-text-white tw-text-sm tw-font-medium tw-py-2 tw-rounded-sm">
          {{ status }}
        </button>
      </div>
    </div>

    <div class="tw-p-4 tw-space-y-4 tw-border tw-border-gray-300 tw-rounded-md">
      <div class="tw-flex tw-flex-wrap tw-rounded-sm tw-overflow-hidden tw-text-sm tw-font-medium">
        <button
          v-for="tab in tabs"
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'tw-flex-1 tw-text-center tw-py-2 tw-transition',
            activeTab === tab
              ? 'tw-bg-gray-50 tw-text-cyan-600 tw-border-b-2 tw-border-cyan-500'
              : 'tw-bg-white tw-text-gray-400 hover:tw-text-cyan-600'
          ]"
        >
          <span>{{ tab }}</span>
          <span v-if="activeTab === tab" class="tw-ml-1 tw-text-cyan-500 tw-text-2xl sm:tw-text-3xl inline-block">
            ※
          </span>
        </button>
      </div>

      <div v-if="activeTab === 'ĐẦU VÀO'">
        <DataTable :columns="colsInput" :modelValue="rowsInput" />
      </div>

      <div v-if="activeTab === 'SẢN XUẤT'">
        <div class="tw-flex tw-flex-wrap tw-space-x-4 tw-mb-2 tw-text-sm tw-font-medium">
          <button :class="subTab === 'result' ? 'tw-text-cyan-600 tw-underline' : 'tw-text-gray-500'" @click="subTab = 'result'">
            Kết quả sản xuất
          </button>
          <button :class="subTab === 'reason' ? 'tw-text-cyan-600 tw-underline' : 'tw-text-gray-500'" @click="subTab = 'reason'">
            Nguyên nhân dừng máy
          </button>
          <button :class="subTab === 'scrap' ? 'tw-text-cyan-600 tw-underline' : 'tw-text-gray-500'" @click="subTab = 'scrap'">
            Danh sách phế
          </button>
        </div>

        <DataTable v-if="subTab === 'result'" :columns="colsResult" :modelValue="rowsResult" :footer="footerResult" />
        <DataTable v-else-if="subTab === 'reason'" :columns="colsReason" :modelValue="rowsReason" />
        <DataTable v-else :columns="colsScrap" :modelValue="rowsScrap" />
      </div>

      <div v-if="activeTab === 'IN TEM'">
        <FormPrintLabel :modelValue="formLabel" @update:modelValue="$emit('update:formLabel', $event)" />
        <div class="tw-mt-4 tw-text-right">
          <button class="tw-bg-cyan-600 tw-text-white tw-px-4 tw-py-1 tw-rounded tw-transition hover:tw-bg-cyan-700">
            In tem
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'HỦY TEM'">
        <DataTable :columns="colsCancel" :modelValue="rowsCancel" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import DataTable from "../partials/DataTable.vue"
import FormPrintLabel from "../partials/FormPrintLabel.vue"

const props = defineProps({
  status: { type: String, default: "Chờ sản xuất" },
  headerFields: { type: Object, default: () => ({}) },

  colsInput: { type: Array, default: () => [] },
  rowsInput: { type: Array, default: () => [] },

  colsResult: { type: Array, default: () => [] },
  rowsResult: { type: Array, default: () => [] },
  footerResult: { type: Array, default: () => [] },

  colsReason: { type: Array, default: () => [] },
  rowsReason: { type: Array, default: () => [] },

  colsScrap: { type: Array, default: () => [] },
  rowsScrap: { type: Array, default: () => [] },

  colsCancel: { type: Array, default: () => [] },
  rowsCancel: { type: Array, default: () => [] },

  formLabel: { type: Object, default: () => ({}) },
})

defineEmits(["update:formLabel"])

const activeTab = ref("SẢN XUẤT")
const subTab = ref("result")
const tabs = ["ĐẦU VÀO", "SẢN XUẤT", "IN TEM", "HỦY TEM"]
</script>
