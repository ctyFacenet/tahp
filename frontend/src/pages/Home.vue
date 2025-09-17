<template>
  <div class=" w-4/5 py-12 mx-auto h-[1920px]">
    <h1 class="text-3xl font-bold mb-6">WWO Plans</h1>
  <ListView 
    class="h-[1920px]"
    :columns = "[
        {
      label: 'MÃ hàng',
      key: 'item',
      width: 3,
    },
    {
      label: 'BOM',
      key: 'bom',
      width: 3,
    },
    {
      label: 'Số lượng',
      key: 'qty',
      width: 3,
    },
    {
      label: 'Đơn vị',
      key: 'uom',
      width: 3,
    },
    { label: 'Hành động',
      key: 'note',
      width: 2,
      type: 'icon',
      icon: 'Edit',
     }
    ]"
    :rows = "convertedData"
    row-key="name"
    >
    <template #group-header = "{ group }">
      <div class="flex justify-between text-base font-medium leading-6 text-ink-gray-9">
        {{ group.group }} ({{ group.rows.length }}) 
        <div class = "flex">
        <div class="p-1">
          <Button
            :variant="'subtle'"
            :ref_for="true"
            theme="gray"
            size="sm"
            label="Button"
            :loading="false"
            :loadingText="null"
            :disabled="false"
            :link="null"
            :value = "group.group"
            @click="openRejectDialog('KHSX', group.group)"
          >
            Từ chối KHSX
          </Button>
          <Dialog 
  v-model="dialog2"
>
  <template #body-title>
    <h3 class="text-2xl font-semibold text-blue-600">
       Từ chối lệnh {{ group.group }}về bộ phận {{ currentActionName }}
    </h3>
  </template>
  <template #body-content>
    <div  class="space-y-4">
        <div class="bg-blue-50 p-4 rounded-lg">
          <div class="p-1" label = "Lý do">
            <textarea v-model="text" rows="5" cols="30"></textarea>
          </div>
      </div>
    </div>
  </template>
  <template #actions="{ close }">
    <div class="flex justify-start flex-row-reverse gap-2">
      <Button
        variant="solid"
        @click="handleSave(close, group.group)"
      >
        Xác nhận
      </Button>
      <Button
        variant="outline"
        @click="closeDialog(close, group.group)"
      >
        Cancel
      </Button>
    </div>
  </template>
</Dialog>
        </div>
        <div class="p-1">
          <Button 
            :variant="'subtle'"
            :ref_for="true"
            theme="gray"
            size="sm"
            label="Button"
            :loading="false"
            :loadingText="null"
            :disabled="false"
            :link="null"
            :value = "group.group"
            @click="openRejectDialog('PTCN', group.group)"
          >
            Từ chối PTCN
          </Button>
        </div>
        <div class="p-1">  
        <Button
          :variant="'solid'"
          :ref_for="true"
          theme="gray"
          size="sm"
          label="Button"
          :loading="false"
          :loadingText="null"
          :disabled="false"
          :link="null"
          :value = "group.group"
        >
          Duyệt
        </Button>
        </div> 
      </div>
      </div>
    </template>
  </ListView>


  </div>
  
</template>

<script setup>
import {createListResource, createResource, call} from "frappe-ui"
import { ref , computed} from "vue"
import { ListView } from "frappe-ui"
import { useRoute } from 'vue-router'
import { session } from "../data/session"

const route = useRoute()
const dialog2 = ref(false)
const comment = ref('')
const error = ref('')
const modelValue = ref('')
const currentActionName = ref('')
const text = ref('')
let wwo = createListResource({
  doctype: "WWO Plan",
  fields: ['*'],
  filters: [
   
  ],
  order_by: "modified desc",
  limit: 20,
})
wwo.fetch()
let todos = createResource({
url: 'tahp.api.wwo_plan',
  params: {
    plan: route.query.khsx
  },
})
todos.fetch()

function convertNumbersToStrings(data) {
  if (Array.isArray(data)) {
    return data.map(item => convertNumbersToStrings(item))
  } else if (data && typeof data === 'object') {
    const result = {}
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'number') {
        result[key] = String(value)
      } else if (typeof value === 'object') {
        result[key] = convertNumbersToStrings(value)
      } else {
        result[key] = value
      }
    }
    return result
  }
  return data
}
const convertedData = computed(() => {
  if (!todos.data) return null
  let newData = todos.data.map(item => (
    {group: item.name,
    collapsed: false,
    rows: item.items || []}
  ))
 return convertNumbersToStrings(newData)
})

async function handleSave(close, wwo) {
  console.log("Save button clicked");
  console.log(wwo)
  const role = currentActionName.value === 'KHSX' ? 'Kế hoạch sản xuất' : 'Phòng kỹ thuật công nghệ';
  const notification = currentActionName.value === 'KHSX' ? 'WWO Kế hoạch sản xuất bị từ chối' : 'WWO Phòng phát triển công nghệ bị từ chối'; 
        // Ghi comment
        // await call({
        //     method: "frappe.desk.form.utils.add_comment",
        //     params: {
        //         reference_doctype: "Week Work Order",
        //         reference_name: wwo,
        //         content: text.value,
        //         comment_type: "Comment",
        //         comment_email: session.user,
        //         comment_by: session.user_fullname,
        //     }
        // });
        // // Gửi notify không cần callback
        // await call({ method: "tahp.api.wwo_notify", params: { role: role, subject: notification, document_type: "Week Work Order", document_name: wwo}});
        // await wwo_flow(frm, wwo, state);
        // frm.reload_doc();
        frappe.show_alert(alert_message);
    
  // Perform save operations here
  close();
}

function openRejectDialog(actionName) {
  currentActionName.value = actionName
  text.value = ''
  error.value = ''
  dialog2.value = true
}
function closeDialog(close) {
    close()
    resetForm()
  }


function resetForm() {
  text.value = ''
  error.value = ''
  currentActionName.value = ''
}
</script>

<style scoped>

</style>