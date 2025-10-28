<template>
  <BaseLayout title="Danh sách đơn sản xuất" :showDateFilter="true">
    <template #actions>
      <div
        class="tw-flex tw-flex-wrap tw-items-center tw-justify-center sm:tw-justify-start tw-gap-2 tw-w-full sm:tw-w-auto">
        <a-button
          type="link"
          class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0"
          @click="createNewDoc">
          <PlusOutlined />
          Tạo đơn sản xuất nội bộ
        </a-button>

        <a-button type="link" class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
          <FileDoneOutlined /> Duyệt
        </a-button>

        <a-button type="link" class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
          <UnlockOutlined /> Hủy duyệt
        </a-button>

        <a-button type="link" class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
          <PlusOutlined /> Tạo lệnh sản xuất
        </a-button>

        <a-button type="link" class="tw-flex tw-items-center tw-gap-1 tw-text-[#2490ef] hover:tw-text-[#1677c8] tw-font-medium tw-p-0">
          <DeleteOutlined /> Xóa
        </a-button>
      </div>

      <div class="tw-flex tw-items-center tw-gap-2 tw-w-full sm:tw-w-auto">
        <a-dropdown trigger="click" placement="bottomRight">
          <template #overlay>
            <div
              class="tw-max-h-[300px] tw-max-w-[250px] tw-overflow-y-auto tw-bg-white tw-rounded-md tw-shadow-lg tw-border tw-border-gray-200">
              <a-menu>
                <a-menu-item
                  v-for="col in selectableColumns"
                  :key="col.key"
                  class="tw-text-[13px] tw-whitespace-nowrap tw-flex tw-items-center">
                  <a-checkbox v-model:checked="visibleColumns[col.key]" @change="updateVisibleColumns">
                    {{ col.title }}
                  </a-checkbox>
                </a-menu-item>
              </a-menu>
            </div>
          </template>

          <a-button
            type="text"
            class="tw-flex tw-items-center tw-justify-center tw-p-0"
            title="Chọn cột hiển thị">
            <CopyOutlined class="tw-text-[13px] tw-text-green-500 hover:tw-text-green-600" />
          </a-button>
        </a-dropdown>

        <a-input
          v-model:value="searchKeyword"
          placeholder="Nhập thông tin để tìm kiếm"
          class="tw-w-full sm:tw-w-[220px] md:tw-w-[300px] tw-h-[30px] tw-text-[13px] tw-rounded-sm tw-border-[#2490ef] focus:tw-shadow-none"
          size="small"
          allowClear>
          <template #prefix>
            <SearchOutlined class="tw-text-gray-400" />
          </template>
        </a-input>
      </div>
    </template>

    <BaseTable
      :columns="displayedColumns"
      :rows="filteredRows"
      group-by="productcode"
      :doctype="docType"
      :nameKey="'name'">
      <template #actions="{ row }">
        <div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
          <a-tooltip title="Chỉnh sửa BOM">
            <EditOutlined class="tw-text-green-500 hover:tw-text-green-600 tw-cursor-pointer" />
          </a-tooltip>
          <a-tooltip title="Duyệt">
            <FileDoneOutlined class="tw-text-green-500 hover:tw-text-green-600 tw-cursor-pointer" />
          </a-tooltip>
          <a-tooltip title="Tạo lệnh sản xuất">
            <PlusOutlined class="tw-text-red-500 hover:tw-text-red-600 tw-cursor-pointer" />
          </a-tooltip>
          <a-tooltip title="Xoá đơn sản xuất">
            <DeleteOutlined class="tw-text-blue-500 hover:tw-text-blue-600 tw-cursor-pointer" />
          </a-tooltip>
        </div>
      </template>
    </BaseTable>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, reactive, watch } from "vue";
import {
  UnlockOutlined,
  CopyOutlined,
  SearchOutlined,
  PlusOutlined,
  FileDoneOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons-vue";
import BaseLayout from "../../layouts/BaseLayout.vue";
import BaseTable from "../../BaseTable.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
});

const searchKeyword = ref("");
const docType = computed(() => props.rows?.[0]?.docType || "Custom Production Order");

const selectableColumns = computed(() =>
  props.columns.filter((c) => !["actions"].includes(c.key))
);

const visibleColumns = reactive({});
watch(
  () => props.columns,
  (cols) => {
    cols?.forEach((c) => {
      if (visibleColumns[c.key] === undefined) visibleColumns[c.key] = true;
    });
  },
  { immediate: true, deep: true }
);

const displayedColumns = computed(() =>
  props.columns.filter((c) => c.key === "actions" || visibleColumns[c.key])
);

const filteredRows = computed(() => {
  const key = searchKeyword.value.trim().toLowerCase();
  if (!key) return props.rows;
  return props.rows.filter((row) =>
    Object.values(row).some((val) => val?.toString().toLowerCase().includes(key))
  );
});

const updateVisibleColumns = () => {};
const createNewDoc = () => frappe.new_doc(docType.value);
</script>

<style scoped>
:deep(.ant-input-affix-wrapper) {
  height: 32px !important;
  font-size: 13px !important;
}
</style>
