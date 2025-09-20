<template>
  <div class="border border-gray-300 rounded-md p-4 bg-white grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
    <div>
      <label class="block text-gray-600 text-xs mb-1">Mã tem QR</label>
      <input v-model="model.qrCode" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-sm bg-gray-100" readonly />
    </div>

    <div>
      <label class="block text-gray-600 text-xs mb-1">Mã BTP đầu ra</label>
      <input v-model="model.btpCode" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-sm bg-gray-100" readonly />
    </div>

    <div>
      <label class="block text-gray-600 text-xs mb-1">Mã lệnh sản xuất</label>
      <input v-model="model.orderCode" class="w-full border border-red-400 bg-red-100 rounded-sm px-2 py-1 text-sm" />
    </div>

    <div>
      <label class="block text-gray-600 text-xs mb-1">Mã công đoạn</label>
      <input v-model="model.operationCode" class="w-full border border-red-400 bg-red-100 rounded-sm px-2 py-1 text-sm" />
    </div>

    <div>
      <label class="block text-gray-600 text-xs mb-1">Lot</label>
      <input v-model="model.lot" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-sm bg-gray-100" readonly />
    </div>

    <div>
      <label class="block text-gray-600 text-xs mb-1">Lot NVL</label>
      <input v-model="model.materialLot" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-sm bg-gray-100" readonly />
    </div>

    <div>
      <label class="block text-gray-600 text-xs mb-1">Số lượng thực tế</label>
      <input v-model="model.quantity" type="number" class="w-full border border-red-400 bg-red-100 rounded-sm px-2 py-1 text-sm" />
    </div>

    <div>
      <label class="block text-gray-600 text-xs mb-1">Đơn vị tính</label>
      <input v-model="model.unit" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-sm bg-gray-100" readonly />
    </div>

    <div>
      <label class="block text-gray-600 text-xs mb-1">Nhân viên thực hiện</label>
      <input v-model="model.operator" class="w-full border border-red-400 bg-red-100 rounded-sm px-2 py-1 text-sm" />
    </div>

    <div>
      <label class="block text-gray-600 text-xs mb-1">Trọng lượng bi</label>
      <input v-model="model.ballWeight" type="number" class="w-full border border-gray-300 rounded-sm px-2 py-1 text-sm" />
    </div>

    <div>
      <label class="block text-gray-600 text-xs mb-1">Phân loại hàng</label>
      <div class="flex items-center space-x-8">
        <label><input type="radio" value="OK" v-model="model.classification" /> OK</label>
        <label><input type="radio" value="NG" v-model="model.classification" /> NG</label>
      </div>
    </div>

    <div>
      <label class="block text-gray-600 text-xs mb-1">Tên lỗi</label>
      <select v-model="model.errorName" class="w-full border border-red-400 bg-red-100 rounded-sm px-2 py-1 text-sm">
        <option disabled value="">Chọn lỗi</option>
        <option value="DIR001">Đường kính nhỏ</option>
        <option value="DIR002">Đường kính to</option>
        <option value="NQ_XMAU">Ngoại quan (xỉn màu)</option>
      </select>
    </div>
  </div>
</template>

<script setup>
const model = defineModel()
</script>
