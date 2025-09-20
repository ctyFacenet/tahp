<template>
  <div
    v-if="visible"
    class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50"
  >
    <div
      class="bg-white w-[1500px] rounded-lg shadow-xl overflow-hidden max-h-[100vh] flex flex-col"
    >
      <div
        class="flex items-center justify-between border-b px-4 py-2 bg-gray-50"
      >
        <h2 class="text-lg font-semibold flex items-center space-x-2">
          <span>ℹ️</span>
          <span>Thông tin công đoạn</span>
        </h2>
        <button @click="close" class="text-gray-500 hover:text-black">✕</button>
      </div>

      <div class="p-4 space-y-4 overflow-y-auto flex-1">
        <div class="border border-gray-300 rounded-md p-4 bg-white space-y-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div v-for="(val, label) in headerFields" :key="label">
              <label class="block text-gray-600 text-xs mb-1">{{ label }}</label>
              <input
                class="w-full border border-gray-300 rounded-sm px-2 py-1 bg-gray-100 text-sm"
                :value="val"
                readonly
              />
            </div>
          </div>

          <div>
            <label class="block text-gray-700 text-sm mb-1">Trạng thái</label>
            <button
              class="w-1/2 bg-cyan-500 text-white text-sm font-medium py-2 rounded-sm"
            >
              {{ status }}
            </button>
          </div>
        </div>

       <div class="p-4 space-y-4 border border-gray-300 rounded-md ">
         <div class="flex rounded-sm overflow-hidden text-sm font-medium">
          <button
            v-for="tab in tabs"
            :key="tab"
            @click="activeTab = tab"
            :class="[
              'flex-1 text-center py-2',
              activeTab === tab
                ? 'bg-gray-50 text-cyan-600 border-b-2 border-cyan-500'
                : 'bg-white text-gray-400 hover:text-cyan-600'
            ]"
          >
            <span>{{ tab }}</span>
            <span
              v-if="activeTab === tab"
              class="ml-1 text-cyan-500 text-3xl inline-block"
            >
              ⟳
            </span>
          </button>
        </div>

        <div v-if="activeTab === 'ĐẦU VÀO'">
          <DataTable :columns="colsInput" :rows="rowsInput" />
        </div>

        <div v-if="activeTab === 'SẢN XUẤT'">
          <div class="flex space-x-6 mb-2 text-sm font-medium">
            <button
              :class="subTab === 'result' ? 'text-cyan-600 underline' : 'text-gray-500'"
              @click="subTab = 'result'"
            >
              Kết quả sản xuất
            </button>
            <button
              :class="subTab === 'reason' ? 'text-cyan-600 underline' : 'text-gray-500'"
              @click="subTab = 'reason'"
            >
              Nguyên nhân dừng máy
            </button>
            <button
              :class="subTab === 'scrap' ? 'text-cyan-600 underline' : 'text-gray-500'"
              @click="subTab = 'scrap'"
            >
              Danh sách phế
            </button>
          </div>

          <DataTable
            v-if="subTab === 'result'"
            :columns="colsResult"
            :rows="rowsResult"
            :footer="footerResult"
          />

          <DataTable
            v-else-if="subTab === 'reason'"
            :columns="colsReason"
            :rows="rowsReason"
          />

          <DataTable v-else :columns="colsScrap" :rows="rowsScrap" />
        </div>

        <div v-if="activeTab === 'IN TEM'">
          <FormPrintLabel :formData="formLabel" />
          <div class="mt-4 text-right">
            <button class="bg-cyan-600 text-white px-4 py-1 rounded">
              In tem
            </button>
          </div>
        </div>

        <div v-if="activeTab === 'HỦY TEM'">
          <DataTable :columns="colsCancel" :rows="rowsCancel" />
        </div>
      </div>

       </div>
      <div class="border-t px-4 py-2 text-right bg-gray-50">
        <button
          @click="close"
          class="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>

import { ref, defineExpose } from "vue"
import DataTable from "./partials/DataTable.vue"
import FormPrintLabel from "./partials/FormPrintLabel.vue"

const visible = ref(false)
const status = ref("Chờ sản xuất")
const activeTab = ref("SẢN XUẤT")
const subTab = ref("result")

const tabs = ["ĐẦU VÀO", "SẢN XUẤT", "IN TEM", "HỦY TEM"]

const headerFields = {
  "Mã lệnh sản xuất": "WO_EIAW015_A_25_2506.43",
  "Mã công đoạn": "CAN",
  "Mã BTP đầu ra": "BTP.DAYDONG5.6A",
  "Số lượng sản xuất": "200",
  "Đơn vị tính": "Kg",
  "Tên BTP đầu ra": "Dây đồng điện tử 5.6mm PT25",
  "Thời gian bắt đầu dự kiến": "08:00 25/06/2025",
  "Thời gian kết thúc dự kiến": "17:00 25/06/2025",
}

const colsInput = ["STT","Mã QR code","Mã vật tư","Tên vật tư","Lot NVL","Định mức đầu vào","Số lượng yêu cầu","Số lượng nhận","Đơn vị tính"]
const rowsInput = [
  ["1","2000000992638","DAYDONG2.6A","Dây đồng thiếc 2.6","20250607","1.02051","204.0102","205","Kg"],
  ["2","1000000938844","M.TEREBEC","Men El Elantas","30929.49","1.71","342","342","Kg"],
  ["3","1000000938846","M.POSMIC.A10","Men Ai Kopos","30929.49","1.73","346","346","Kg"]
]

const colsResult = ["STT","Nhân viên chạy máy","Máy","Nhóm line","Ca","Thời gian bắt đầu","Thời gian kết thúc","SL đầu ra ước tính","OK ước tính","NG ước tính","SL đầu ra thực tế","OK thực tế","NG thực tế","ĐVT"]
const rowsResult = [
  ["1","Nguyễn Văn Tú","CAN1.1","CAN1.1","Ca 1","08:05 26/06/2025","20:31 26/06/2025","105","100","5","100","100","0","Kg"],
  ["2","Nguyễn Văn Hiệp","CAN1.1","CAN1.1","Ca 1","08:01 27/06/2025","20:00 27/06/2025","61","60","1","55","55","0","Kg"],
  ["3","Nguyễn Văn Tú","CAN1.1","CAN1.1","Ca 1","08:04 28/06/2025","16:55 28/06/2025","50","50","0","45","45","0","Kg"]
]
const footerResult = ["","","","","","","","220","211","9","205","200","200","Kg"]

const colsReason = ["STT","Nhân viên","Máy","Nhóm line","Ca","Nguyên nhân","Phân loại","Thời gian bắt đầu","Thời gian kết thúc","Thời gian dừng (phút)"]
const rowsReason = [
  ["1","Nguyễn Văn Tú","CAN1.1","CAN1.1","Ca 1","Lỗi đứt dây trong khi sấy","Hỏng","10:05 26/06/2025","10:35 26/06/2025","30.5"],
  ["2","Nguyễn Văn Hiệp","CAN1.1","CAN1.1","Ca 1","Thay men cho máy","Khác","16:10 26/06/2025","16:50 26/06/2025","40"]
]

const colsScrap = ["STT","Mã BTP đầu ra","Tên BTP đầu ra","Mã lỗi","Tên lỗi","Nguyên nhân lỗi","Số lượng","ĐVT","Nhân viên","Ca","Ngày khai báo","Ghi chú","Thao tác"]
const rowsScrap = [
  ["1","EIAW015_A_25","Dây đồng điện tử 0.15mm PT25","DIR001","Đường kính nhỏ","Không kiểm tra dies","48","Kg","Trần Tiến Đạt","Ca 1","19/08/2025","","🗑️"],
  ["2","EIAW015_A_25","Dây đồng điện tử 0.15mm PT25","DIR002","Đường kính to","Không kiểm tra dies","55","Kg","Trần Tiến Đạt","Ca 1","19/08/2025","","🗑️"],
  ["3","EIAW015_A_25","Dây đồng điện tử 0.15mm PT25","NQ_XMAU","Ngoại quan (xỉn màu)","Không kiểm tra","155","Kg","Trần Tiến Đạt","Ca 1","19/08/2025","","🗑️"]
]

const colsCancel = ["STT","Mã tem QR","Trạng thái","Mã BTP đầu ra","Lot","Số lượng thực tế","ĐVT","Nhân viên","Thao tác"]
const rowsCancel = [
  ["1","200000000000369368","Chờ hủy","BTP.DAYDONG5.6A","20250627","57","Kg","Nguyễn Thị Uyên","🚫"],
  ["2","200000000000369375","Bình thường","BTP.DAYDONG5.6A","20250628","51","Kg","Nguyễn Thị Uyên","🚫"]
]

const formLabel = {
  maQr: "200000000000369371",
  maBtp: "BTP.DAYDONG5.6A",
  maLenh: "WO_EIAW015_A_25_2506.43",
  ca: "Ca 1",
  may: "CAN1",
  nhom: "CAN1.1",
  soLuong: 52,
  dvt: "Kg",
  nhanVien: "Nguyễn Thị Uyên",
  ngayIn: "28/06/2025"
}

function open() { visible.value = true }
function close() { visible.value = false }

defineExpose({ open, close })
</script>
