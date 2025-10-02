<template>
  <div class="tw-p-4 tw-space-y-4">
    <div class="tw-flex tw-gap-2 tw-mb-4">
      <button
        v-for="(s, idx) in steps"
        :key="idx"
        @click="currentStep = idx"
        class="tw-px-3 tw-py-1 tw-rounded tw-text-sm"
        :class="currentStep === idx ? 'tw-bg-blue-600 tw-text-white' : 'tw-bg-gray-100'"
      >
        {{ s.label }}
      </button>
    </div>

    <div v-if="currentStep === 0">
      <h3 class="tw-font-bold tw-mb-2">Bước 1: Nhập Filter</h3>
      <input
        v-model="filter"
        placeholder="Nhập từ khóa tìm kiếm..."
        class="tw-border tw-rounded tw-px-2 tw-py-1 tw-w-full"
      />
    </div>

    <div v-if="currentStep === 1">
      <h3 class="tw-font-bold tw-mb-2">Bước 2: Xem Bảng</h3>
      <table class="tw-w-full tw-text-sm tw-border-collapse">
        <thead>
          <tr class="tw-bg-gray-100">
            <th class="tw-p-2 tw-border">Mã SP</th>
            <th class="tw-p-2 tw-border">Tên SP</th>
            <th class="tw-p-2 tw-border tw-text-right">Số lượng</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in filteredRows"
            :key="idx"
            :class="row.qty > 10 ? 'tw-bg-green-100' : row.qty < 5 ? 'tw-bg-red-100' : ''"
          >
            <td class="tw-p-2 tw-border">{{ row.item_code }}</td>
            <td class="tw-p-2 tw-border">{{ row.item_name }}</td>
            <td class="tw-p-2 tw-border tw-text-right">{{ row.qty }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="currentStep === 2">
    <h3 class="tw-font-bold tw-mb-2">Bước 3: Thống kê</h3>
    <div class="tw-h-[300px] tw-bg-gray-50 tw-rounded tw-p-2">
      <BaseChart :type="'bar'" :data="chartData" :options="chartOptions" />
    </div>
    </div>

    <div class="tw-flex tw-justify-between tw-mt-4">
      <button
        @click="prevStep"
        :disabled="currentStep === 0"
        class="tw-bg-gray-100 tw-px-4 tw-py-1 tw-rounded disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
      >
        Quay lại
      </button>
      <button
        @click="nextStep"
        :disabled="currentStep === steps.length - 1"
        class="tw-bg-blue-600 tw-text-white tw-px-4 tw-py-1 tw-rounded disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
      >
        Tiếp tục
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import BaseChart from "../../components/BaseChart.vue";

const props = defineProps({
  rows: { type: Array, default: () => [] }
});

const steps = [
  { label: "Filter" },
  { label: "Bảng" },
  { label: "Chart" }
];
const currentStep = ref(0);
const filter = ref("");

const filteredRows = computed(() =>
  props.rows.filter(r =>
    Object.values(r).some(val =>
      String(val).toLowerCase().includes(filter.value.toLowerCase())
    )
  )
);

const chartData = computed(() => ({
  labels: props.rows.map(r => r.item_name),
  datasets: [
    {
      label: "Số lượng sản phẩm",
      data: props.rows.map(r => r.qty),
      backgroundColor: props.rows.map(r =>
        r.qty > 10 ? "#22c55e" : r.qty < 5 ? "#ef4444" : "#3b82f6"
      ),
      borderRadius: 4,
    }
  ]
}));

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}`
      }
    }
  },
  scales: {
    x: { title: { display: true, text: "Sản phẩm" } },
    y: { title: { display: true, text: "Số lượng" }, beginAtZero: true }
  }
};


const nextStep = () => {
  if (currentStep.value < steps.length - 1) currentStep.value++;
};
const prevStep = () => {
  if (currentStep.value > 0) currentStep.value--;
};
</script>
