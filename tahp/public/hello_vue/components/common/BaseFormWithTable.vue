<template>
  <div class="tw-border tw-border-blue-300 tw-rounded-md tw-bg-white tw-shadow-sm tw-p-4 tw-space-y-6">

    <h3 v-if="title"
      class="tw-text-base tw-font-semibold tw-text-blue-700 tw-border-b tw-border-blue-200 tw-pb-2 tw-uppercase">
      {{ title }}
    </h3>

    <a-form layout="vertical" class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-4">
      <template v-for="field in visibleFields" :key="field.fieldname">
        <a-form-item :label="field.label" :required="!!field.reqd"
          :class="field.fullWidth ? 'sm:tw-col-span-2 lg:tw-col-span-4' : ''">

          <a-input v-if="['Data', 'Link'].includes(field.fieldtype) && field.fieldname !== 'customername'"
            v-model:value="doc[field.fieldname]" :placeholder="field.label" :disabled="!!field.read_only" />

          <a-input v-else-if="field.fieldname === 'customername'"
            v-model:value="doc.customername" placeholder="Chọn khách hàng"
            @click="showCustomerModal = true" :disabled="!!field.read_only" />

          <a-textarea v-else-if="['Small Text', 'Long Text', 'Text'].includes(field.fieldtype)"
            v-model:value="doc[field.fieldname]" :rows="3" :placeholder="field.label"
            :disabled="!!field.read_only" />

          <a-input-number v-else-if="['Int', 'Float', 'Currency'].includes(field.fieldtype)"
            v-model:value="doc[field.fieldname]" class="tw-w-full" :min="0" :disabled="!!field.read_only" />

          <a-date-picker v-else-if="field.fieldtype === 'Date'"
            :value="doc[field.fieldname] ? dayjs(doc[field.fieldname]) : null"
            @update:value="val => (doc[field.fieldname] = val ? val.format('YYYY-MM-DD') : null)"
            format="DD/MM/YYYY" class="tw-w-full" :disabled="!!field.read_only" placeholder="Chọn ngày" />

          <a-select v-else-if="field.options && field.options.split('\n').length > 1"
            v-model:value="doc[field.fieldname]"
            :options="field.options.split('\n').filter(o => o.trim() !== '').map(o => ({ label: o, value: o }))"
            :disabled="!!field.read_only" show-search option-filter-prop="label" />

          <a-checkbox v-else-if="field.fieldtype === 'Check'"
            v-model:checked="doc[field.fieldname]" :disabled="!!field.read_only">
            {{ field.label }}
          </a-checkbox>
        </a-form-item>
      </template>
    </a-form>

    <div>
      <slot name="table"></slot>
      <slot name="tabs"></slot>
    </div>

    <div class="tw-flex tw-flex-col sm:tw-flex-row tw-justify-end tw-items-center tw-gap-2 tw-mt-4">
      <a-button type="default" class="tw-flex tw-items-center tw-gap-1 tw-w-full sm:tw-w-auto" @click="handleBack">
        <RollbackOutlined /> <span>Quay lại</span>
      </a-button>
      <a-button type="primary" class="tw-flex tw-items-center tw-gap-1 tw-w-full sm:tw-w-auto" @click="handleSave">
        <SaveOutlined /> <span>Lưu</span>
      </a-button>
    </div>

    <CustomerSelectModal v-model:open="showCustomerModal" :data="customers" @select="selectCustomer"
      @addnew="handleAddNewCustomer" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import dayjs from "dayjs";
import {
  SaveOutlined,
  RollbackOutlined,
} from "@ant-design/icons-vue";
import CustomerSelectModal from "../form/CustomerSelectModal.vue";
import { customers } from "../../mock/customers";

const props = defineProps({
  frm: { type: Object, required: true },
  title: { type: String, default: "THÔNG TIN CHUNG" },
});

const doc = ref({ ...props.frm.doc });

const visibleFields = computed(() =>
  props.frm.meta.fields.filter(
    (f) =>
      f.label &&
      !["Section Break", "Column Break", "HTML", "Table"].includes(f.fieldtype) &&
      !["owner", "creation", "modified", "modified_by", "_assign", "_comments"].includes(
        f.fieldname
      )
  )
);

watch(
  doc,
  (val) => {
    Object.assign(props.frm.doc, val);
  },
  { deep: true }
);

const showCustomerModal = ref(false);

function selectCustomer(record) {
  doc.value.customername = record.name;
  showCustomerModal.value = false;
  frappe.msgprint(`Đã chọn khách hàng: ${record.name}`);
}

function handleAddNewCustomer() {
  frappe.msgprint("Thêm mới khách hàng (Alt + N)");
}

function handleBack() {
  frappe.set_route("List", props.frm.doctype);
}

function handleSave() {
  frappe.msgprint("Dữ liệu đã được lưu");
}
</script>

<style scoped>
.ant-form-item {
  margin-bottom: 10px;
}
</style>
