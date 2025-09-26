<template>
  <div class=" w-4/5 py-12 mx-auto">
    <h1 class="text-3xl font-bold mb-6">WWO Plans</h1>
    <div class="p-3 justify-self-end">
    <Button
      :variant="'solid'"
      :ref_for="true"
      theme="gray"
      size="sm"
      label="Create New"
      :loading="false"
      :loadingText="null"
      :disabled="false"
      tooltip="Create New"
      @click="openCreateDialog()"
    >
      Tạo mới LSX Tuần
    </Button>
  </div>
  <ListView 
    class="h-[400px]"
    :columns = "[
        {
      label: 'Mã hàng',
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
        <div>
        {{ group.group }}  <span class = {{group.status}}>({{ group.status }})</span></div>
        
        <div v-if="group.status !== 'Đợi GĐ duyệt'" class = "flex">
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
            @click="('KHSX', group.group)"
          >
            Từ chối KHSX
          </Button>
          <Dialog v-model="dialog2">
            <template #body-title>
              <h3 class="text-2xl font-semibold text-blue-600">
                Từ chối lệnh {{ group.group }} về bộ phận {{ currentActionName }}
              </h3>
            </template>
            <template #body-content>
              <div  class="space-y-4">
                <p class="text-gray-700 text-base">
                  Nhập lý do từ chối:
                </p>
                  <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="p-1" label = "Lý do">
                      <textarea label= "Nhập lý do" v-model="text" rows="5" cols="45"></textarea>
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
          <Dialog
          :options="{
            title: 'Phát hiện trùng lịch',
            message: 'Lệnh sản xuất trùng lịch với lệnh sản xuất đã được duyệt',
            size: 'sm',
            actions: [
              {
                label: 'OK',
                variant: 'solid',
              },
            ],
          }"
          v-model="dialog3"
        ></Dialog>
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
          @click = "openApproveDialog(group.group)"
        >
          Duyệt
        </Button> 
          <Dialog
            :options="{
              title: 'Xác nhận hành động',
              message: 'Bạn chắc chắn muốn duyệt lệnh sản xuất này?',
              size: 'lg',
              icon: {
                name: 'alert-triangle',
                appearance: 'warning',
              },
              actions: [
                {
                  label: 'Xác nhận',
                  variant: 'solid',
                  onClick: () => handleApprove(group.group),
                },
              ],
            }"
            v-model="dialog1"
          ></Dialog>
          
        </div> 
          <Dialog v-model="createDialog"
          :options="{
            title: 'Tạo mới LSX Tuần',
            size: '7xl',
          }">
                  <template #body-title>
                    <h3 class="text-2xl font-semibold text-blue-600">
                      Tạo mới LSX
                    </h3>
                  </template>
                  <template #body-content>
                    <div>
                      <h2>Dynamic Form with Rows</h2>
                      <form @submit.prevent="submitForm">
                        <table>
                          <thead>
                            <tr>
                              <th>Mặt hàng</th>
                              <th>Số lượng</th>
                              <th>Ngày bắt đầu sản xuất</th>
                              <th>Ngày kết thúc sản xuất</th>
                              <th>Hành động</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="(row, index) in rows" :key="index">
                              <td>
                                <input
                                  type="text"
                                  v-model="row.itemName"
                                  placeholder="Enter name"
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="email"
                                  v-model="row.qty"
                                  placeholder="Enter email"
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="email"
                                  v-model="row.dateStart"
                                  placeholder="Enter email"
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="email"
                                  v-model="row.dateEnd"
                                  placeholder="Enter email"
                                  required
                                />
                              </td>
                              <td>
                                <button type="button" @click="removeRow(index)">Remove</button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <button type="button" @click="addRow">Add Row</button>
                        <button type="submit">Submit</button>
                      </form>
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
      
      </div>
    </template>

  
  </ListView>
  </div>
  
</template>

<script setup>
import {createListResource, createResource, call} from "frappe-ui"
import { ref , computed, reactive} from "vue"
import { ListView, Dialog, FormControl } from "frappe-ui"
import { useRoute } from 'vue-router'
import { session } from "../data/session"

const route = useRoute()
const dialog2 = ref(false)
const error = ref('')
const currentActionName = ref('')
const text = ref('')
const dialog1 = ref(false)
const dialog3 = ref(false)
const createDialog = ref(false)
const newLSX = reactive({
  item: '',
  BOM: '',
  qty: '',
  uom: '',
})
const rows = reactive([
    { name: "", email: "" },
  ]);
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
    {
    group: item.name,
    collapsed: false,
    rows: item.items || [],
    status: item.workflow_state
  }
  ))
 return convertNumbersToStrings(newData)
})

async function handleSave(close, wwo) {
  console.log("Save button clicked");
  console.log(wwo)
  const role = currentActionName.value === 'KHSX' ? 'Kế hoạch sản xuất' : 'Phòng kỹ thuật công nghệ';
  const notification = currentActionName.value === 'KHSX' ? 'WWO Kế hoạch sản xuất bị từ chối' : 'WWO Phòng phát triển công nghệ bị từ chối'; 
  const state = currentActionName.value === 'KHSX' ? 'Nháp' : 'Đợi PTCN duyệt';
        //Ghi comment
        let addComment = createResource({
            url: "frappe.desk.form.utils.add_comment",
            params: {
                reference_doctype: "Week Work Order",
                reference_name: wwo,
                content: text.value,
                comment_type: "Comment",
                comment_email: session.user,
                comment_by: session.user,
            },
            onSuccess(data) {
                console.log("Comment added successfully:");
            
            },
            onError(error) {
                throw new Error("Error adding comment: " + error.message);
            },
    
        });
       addComment.fetch();
       
        // Gửi notify không cần callback
       let noti =  createResource(
        { url: "tahp.api.wwo_notify", params: { role: role, subject: notification, document_type: "Week Work Order", document_name: wwo},
        onSuccess(data) {
          console.log("Notification sent successfully:")
        },
        onError(error) {
          console.log("Error sending notification: " + error.message);
      }}
      );
      noti.fetch();
        // Cập nhật trạng thái
        let update = createResource({
          url: "frappe.client.set_value",
          params: {
              doctype: "Week Work Order",
              name: wwo,
              fieldname: "workflow_state",
              value: state,
          },
          onSuccess(response) {
              if (response.alert === true) {
                if(confirm("Không thể duyệt LSX Tuần này vì NV đã hủy trình. Nhấn Ok để tải lại trang"))
                   { todos.reload(); }
                return;
                } 
              if(response.error_html) {
                dialog3.value = true
                return;
              }
              let notify = createResource({
                url: "tahp.api.wwo_notify",
                params: { role: 'Kế hoạch sản xuất', subject: `LSX Tuần ${wwo} đã được duyệt`, document_type: "Week Work Order", document_name: wwo},
                onSuccess(data) {
                  console.log("Notification sent to director successfully:")
                  todos.reload(); // Refresh the data to reflect changes
                },
                onError(error) {
                  console.log("Error sending notification to director: " + error.message);
              }
              });
              notify.fetch();
          },
          onError(error) {
              throw new Error("Error updating status: " + error.message);
          },
        });
        update.fetch();
    
  // Perform save operations here
  close();
}

function openRejectDialog(actionName) {
  currentActionName.value = actionName
  text.value = ''
  error.value = ''
  dialog2.value = true
}
function openCreateDialog() {
  createDialog.value = true
  text.value = ''
  error.value = ''
  currentActionName.value = 'Tạo mới'
}
function closeDialog(close) {
    close()
    resetForm()
}

function openApproveDialog(wwo) {
  dialog1.value = true
  currentActionName.value = 'Duyệt'
  console.log(wwo)
}

function resetForm() {
  text.value = ''
  error.value = ''
  currentActionName.value = ''
}

function handleApprove(wwo) {
  console.log("Approve action for WWO:", wwo);
  const state = 'Đợi GĐ duyệt';
  let update = createResource({
    url: "tahp.api.wwo_flow",
    params: {
      name: wwo,
      workflow: 'Duyệt xong',
    },
    onSuccess(response) {
      console.log("Status updated successfully:");
      todos.reload(); // Refresh the data to reflect changes
    },
    onError(error) {
      throw new Error("Error updating status: " + error.message);
    },
  });
  update.fetch();
  dialog1.value = false; // Close the dialog after approval
}

function addRow() {
    rows.push({ name: "", email: "" }); // Add a new empty row
  }
function removeRow(index) {
    rows.splice(index, 1); // Remove the row at the given index
  }
function submitForm() {
    console.log("Form Data:", this.rows); // Handle form submission
    alert("Form submitted! Check the console for data.");
  }
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}
th, td {
  border: 1px solid #ddd;
  padding: 5px;
  text-align: left;
}
button {
  margin: 5px;
}
input {
  width: 100%;
  padding: 5px;
  box-sizing: border-box;
  border:none;
}
</style>