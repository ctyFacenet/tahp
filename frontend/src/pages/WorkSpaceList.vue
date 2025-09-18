<script setup>
import { ref, onMounted } from 'vue'
import { call } from 'frappe-ui'
import GroupedListView from '@/components/GroupedListView.vue'

const columns = [
  { label: 'ID', key: 'id' },
  { label: 'Loại thiết bị', key: 'type' },
  { label: 'Trạng thái', key: 'status' },
  { label: 'Là cụm thiết bị', key: 'is_dev_cluster' },
  { label: 'Thuộc về cụm thiết bị cha', key: 'is_dev_cluster_parent' },
]

const grouped_rows = ref([])

async function fetchData() {
  try {
    const res = await call('tahp.doc_events.workstation.workstation.get_workstation_details', {
      input: 'workspace-dashboard',
    })

    if (res) {
      const grouped = {}

      res.forEach((item) => {
        const groupName = item.cluster_name || 'Cụm khác'
        if (!grouped[groupName]) {
          grouped[groupName] = {
            group: groupName,
            collapsed: false,
            rows: [],
          }
        }
        grouped[groupName].rows.push({
          id: item.workstation_name || item.name,
          type: item.item_code || item.operation || 'Không rõ',
          status: item.status === 'off' ? 'Tắt' : 'Bật',
          is_dev_cluster: 'Có',
          is_dev_cluster_parent: 'Có',
        })
      })

      grouped_rows.value = Object.values(grouped)
    }
  } catch (err) {
    console.error('Lỗi khi gọi API:', err)
  }
}

onMounted(fetchData)
</script>

<template>
  <GroupedListView
    title="Thiết bị / Cụm thiết bị"
    :columns="columns"
    :rows="grouped_rows"
    row-key="id"
  />
</template>
