<script setup>
import { ref, onMounted } from "vue";
import GroupedListView from "@/components/GroupedListView.vue";
import ProductionInfoDialog from "@/components/ProductionInfoDialog.vue";
import { getWorkstations } from "@/services/workstationService.js";

const columns = ref([]);
const grouped_rows = ref([]);
const dialogRef = ref(null);

const labelMap = {
  name: "ID",
  status: "Trạng thái",
  workstation_name: "Tên thiết bị/cụm thiết bị",
  workstation_type: "Loại thiết bị",
  custom_is_parent: "Là cụm thiết bị",
  custom_parent: "Thuộc về cụm thiết bị cha",
};

const loadData = async () => {
  try {
     const res = await getWorkstations();

    if (res && res.length > 0) {
      const defaultCols = [
        { label: "ID", key: "name" },
        { label: "Trạng thái", key: "status" },
      ];

      const dynamicCols = Object.keys(res[0])
        .filter((k) => k !== "name" && k !== "status")
        .map((k) => ({
          label:
            labelMap[k] ||
            k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          key: k,
        }));

      columns.value = [...defaultCols, ...dynamicCols];

      const grouped = {};
      res.forEach((item) => {
        const groupName = item.workstation_type || "Cụm khác";
        if (!grouped[groupName]) {
          grouped[groupName] = {
            group: groupName,
            collapsed: false,
            rows: [],
          };
        }

        grouped[groupName].rows.push({
          ...item,
          id: item.name,
        });
      });

      grouped_rows.value = Object.values(grouped);
    }
  } catch (err) {
    console.error("❌ Lỗi khi load:", err);
  }
};


const handleRowClick = (row) => {
  dialogRef.value.open();
  return;
  if (!row?.workstation_name) return;
  const url = `/app/workstation/${encodeURIComponent(row.workstation_name)}`;
  window.top.location.href = url;
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <GroupedListView
    title="Thiết bị / Cụm thiết bị"
    :columns="columns"
    :rows="grouped_rows"
    row-key="id"
    @row-click="handleRowClick"
  >
    <template #cell="{ item, column }">
      <span v-if="column.key === 'status'">
        <span
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
          :class="
            item === 'Off'
              ? 'bg-red-100 text-red-800'
              : 'bg-green-100 text-green-800'
          "
        >
          ● {{ item }}
        </span>
      </span>

      <span v-else-if="column.key === 'custom_is_parent'">
        <input
          type="checkbox"
          class="w-4 h-4 text-gray-500 rounded-sm cursor-not-allowed accent-gray-600"
          :checked="item == 1"
          disabled
        />
      </span>

      <span v-else>{{ item }}</span>
    </template>
  </GroupedListView>
  <ProductionInfoDialog ref="dialogRef" />

</template>
