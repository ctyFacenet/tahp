<template>
  <div class="tw-font-sans tw-text-gray-700 tw-space-y-6 tw-p-4 sm:tw-p-6 tw-bg-gray-50 tw-rounded-lg tw-min-h-[420px]">

    <div class="tw-flex tw-items-center tw-justify-between tw-flex-wrap tw-gap-3">
      <h2 class="tw-text-xl tw-font-semibold tw-flex tw-items-center tw-gap-2 tw-text-gray-800">
        <Package class="tw-w-5 tw-h-5 tw-text-green-600" />
        <span>CRUD Demo - Quản lý Item</span>
      </h2>

      <button
        @click="fetchItems"
        class="tw-flex tw-items-center tw-gap-2 tw-bg-white tw-border tw-border-gray-300 tw-px-3 tw-py-1.5 tw-rounded-md tw-shadow-sm hover:tw-bg-gray-100 tw-transition tw-font-medium"
      >
        <RefreshCw class="tw-w-4 tw-h-4 tw-text-gray-500" />
        <span>Làm mới</span>
      </button>
    </div>

    <div class="tw-bg-white tw-border tw-border-gray-200 tw-rounded-xl tw-shadow-sm tw-p-5 tw-space-y-5">
      <div class="tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-semibold tw-text-gray-800">
        <PlusCircle class="tw-w-5 tw-h-5 tw-text-cyan-600" />
        <span>Thêm sản phẩm mới</span>
      </div>

      <div class="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
        <div>
          <label class="tw-block tw-text-xs tw-font-medium tw-text-gray-500 tw-mb-1">Mã sản phẩm</label>
          <input
            v-model="newItem.item_code"
            placeholder="VD: SP001"
            class="tw-w-full tw-border tw-border-gray-300 tw-rounded-md tw-px-3 tw-py-2 focus:tw-ring-2 focus:tw-ring-cyan-400 focus:tw-outline-none"
          />
        </div>
        <div>
          <label class="tw-block tw-text-xs tw-font-medium tw-text-gray-500 tw-mb-1">Tên sản phẩm</label>
          <input
            v-model="newItem.item_name"
            placeholder="VD: Dây đồng điện tử 0.15mm"
            class="tw-w-full tw-border tw-border-gray-300 tw-rounded-md tw-px-3 tw-py-2 focus:tw-ring-2 focus:tw-ring-cyan-400 focus:tw-outline-none"
          />
        </div>
      </div>

      <div class="tw-text-right">
        <button
          @click="createItem"
          :disabled="loading"
          class="tw-inline-flex tw-items-center tw-gap-2 tw-bg-cyan-600 tw-text-white tw-font-medium tw-px-5 tw-py-2 tw-rounded-md hover:tw-bg-cyan-700 disabled:tw-opacity-60 tw-transition"
        >
          <Plus class="tw-w-4 tw-h-4" />
          <span>{{ loading ? "Đang tạo..." : "Tạo mới" }}</span>
        </button>
      </div>
    </div>

    <div class="tw-bg-white tw-border tw-border-gray-200 tw-rounded-xl tw-shadow-sm tw-p-5">
      <div class="tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-semibold tw-text-gray-800 tw-mb-4">
        <Box class="tw-w-5 tw-h-5 tw-text-amber-600" />
        <span>Danh sách sản phẩm</span>
      </div>

      <div v-if="loading" class="tw-text-center tw-text-gray-500 tw-py-6">⏳ Đang tải dữ liệu...</div>
      <div v-else-if="error" class="tw-text-center tw-text-red-600 tw-py-6">{{ error }}</div>
      <div v-else>
        <div class="tw-overflow-x-auto">
          <table class="tw-min-w-full tw-text-sm tw-border-collapse">
            <thead class="tw-bg-cyan-100 tw-text-cyan-800">
              <tr>
                <th class="tw-text-left tw-font-medium tw-px-3 tw-py-2 tw-border-b tw-border-cyan-200">Mã sản phẩm</th>
                <th class="tw-text-left tw-font-medium tw-px-3 tw-py-2 tw-border-b tw-border-cyan-200">Tên sản phẩm</th>
                <th class="tw-text-center tw-font-medium tw-px-3 tw-py-2 tw-border-b tw-border-cyan-200">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in items"
                :key="item.name"
                class="hover:tw-bg-gray-50 tw-transition tw-border-b last:tw-border-0"
              >
                <td class="tw-px-3 tw-py-2 tw-font-medium tw-text-gray-800">{{ item.item_code }}</td>
                <td class="tw-px-3 tw-py-2">
                  <input
                    v-model="item.item_name"
                    class="tw-w-full tw-bg-transparent tw-border tw-border-transparent focus:tw-border-cyan-300 tw-rounded-md tw-px-2 tw-py-1 tw-outline-none tw-transition"
                  />
                </td>
                <td class="tw-px-3 tw-py-2 tw-text-center">
                  <div class="tw-flex tw-items-center tw-justify-center tw-gap-2">
                    <button
                      @click="updateItem(item)"
                      title="Lưu thay đổi"
                      class="tw-bg-emerald-500 tw-text-white tw-rounded-md tw-p-1.5 hover:tw-bg-emerald-600 tw-transition"
                    >
                      <Save class="tw-w-4 tw-h-4" />
                    </button>
                    <button
                      @click="deleteItem(item)"
                      title="Xoá sản phẩm"
                      class="tw-bg-red-500 tw-text-white tw-rounded-md tw-p-1.5 hover:tw-bg-red-600 tw-transition"
                    >
                      <Trash2 class="tw-w-4 tw-h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!items.length" class="tw-text-center tw-text-gray-500 tw-py-4">
          Không có sản phẩm nào.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { Plus, PlusCircle, RefreshCw, Save, Trash2, Box, Package } from "lucide-vue-next"

const items = ref([])
const loading = ref(false)
const error = ref("")
const newItem = ref({ item_code: "", item_name: "" })

async function fetchItems() {
  loading.value = true
  error.value = ""
  try {
    const res = await frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Item",
        fields: ["name", "item_code", "item_name"],
        limit_page_length: 10,
        order_by: "modified desc",
      },
    })
    items.value = res.message || []
  } catch {
    error.value = "Không thể tải danh sách sản phẩm!"
  } finally {
    loading.value = false
  }
}

async function createItem() {
  if (!newItem.value.item_code || !newItem.value.item_name) {
    frappe.msgprint("⚠️ Vui lòng nhập mã và tên sản phẩm!")
    return
  }
  loading.value = true
  try {
    await frappe.call({
      method: "frappe.client.insert",
      args: {
        doc: {
          doctype: "Item",
          item_code: newItem.value.item_code,
          item_name: newItem.value.item_name,
          item_group: "All Item Groups",
          stock_uom: "Nos",
        },
      },
    })
    frappe.show_alert({ message: "Tạo sản phẩm thành công!", indicator: "green" })
    newItem.value = { item_code: "", item_name: "" }
    fetchItems()
  } catch (e) {
    frappe.msgprint("❌ Lỗi khi tạo sản phẩm: " + e.message)
  } finally {
    loading.value = false
  }
}

async function updateItem(item) {
  try {
    await frappe.call({
      method: "frappe.client.set_value",
      args: {
        doctype: "Item",
        name: item.name,
        fieldname: "item_name",
        value: item.item_name,
      },
    })
    frappe.show_alert({ message: `Đã cập nhật: ${item.item_code}`, indicator: "green" })
  } catch (e) {
    frappe.msgprint("❌ Lỗi khi cập nhật: " + e.message)
  }
}

async function deleteItem(item) {
  try {
    customConfirmModal({
      title: "Xác nhận xoá",
      message: `Bạn có chắc muốn xoá <b>${item.item_code}</b>?`,
      note: "Hành động này sẽ xoá vĩnh viễn dữ liệu sản phẩm khỏi hệ thống.",
      type: "danger",
      buttons: [
        {
          text: "Hủy",
          class: "btn-secondary",
          onClick: () => {
            frappe.show_alert({ message: "Đã huỷ thao tác xoá", indicator: "warning" });
          },
        },
        {
          text: "Xoá",
          class: "btn-danger",
          onClick: async () => {
            try {
              await frappe.call({
                method: "frappe.client.delete",
                args: { doctype: "Item", name: item.name },
              });
              frappe.show_alert({
                message: `Đã xoá sản phẩm: ${item.item_code}`,
                indicator: "red",
              });
              await fetchItems();
            } catch (e) {
              frappe.msgprint("❌ Lỗi khi xoá sản phẩm: " + e.message);
            }
          },
        },
      ],
    });
  } catch (e) {
    frappe.msgprint("❌ Lỗi trong quá trình xác nhận: " + e.message);
  }
}


onMounted(fetchItems)
</script>

<style scoped>
@media (max-width: 640px) {
  table {
    font-size: 0.85rem;
  }
  th, td {
    padding: 0.4rem 0.5rem;
  }
}
</style>
