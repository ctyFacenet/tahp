<template>
  <div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6 tw-p-4">
    <!-- Widget KPI nhỏ -->
    <div class="tw-bg-white tw-rounded-lg tw-shadow tw-p-4">
      <h3 class="tw-font-semibold tw-mb-2">🌟 KPI Hôm nay</h3>
      <div class="tw-grid tw-grid-cols-2 md:tw-grid-cols-4 tw-gap-4">
        <div
          v-for="(k, idx) in kpis"
          :key="idx"
          class="tw-bg-green-100 tw-rounded tw-p-3 tw-text-center"
        >
          <p class="tw-text-gray-500 tw-text-sm">{{ k.label }}</p>
          <p class="tw-text-xl tw-font-bold">{{ k.value }}</p>
        </div>
      </div>
    </div>

    <!-- Widget Biểu đồ Line -->
    <div class="tw-bg-white tw-rounded-lg tw-shadow tw-p-4">
      <h3 class="tw-font-semibold tw-mb-2">📈 Doanh thu theo tháng</h3>
      <canvas ref="lineChart"></canvas>
    </div>

    <!-- Widget Biểu đồ Bar -->
    <div class="tw-bg-white tw-rounded-lg tw-shadow tw-p-4">
      <h3 class="tw-font-semibold tw-mb-2">📊 Số lượng đơn hàng</h3>
      <canvas ref="barChart"></canvas>
    </div>

    <!-- Widget Bảng -->
    <div class="tw-bg-white tw-rounded-lg tw-shadow tw-p-4">
      <h3 class="tw-font-semibold tw-mb-2">🔥 Top sản phẩm</h3>
      <table class="tw-w-full tw-text-sm tw-border-collapse">
        <thead>
          <tr class="tw-bg-gray-100">
            <th class="tw-p-2 tw-border">Mã SP</th>
            <th class="tw-p-2 tw-border">Tên SP</th>
            <th class="tw-p-2 tw-border tw-text-right">Số lượng</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, idx) in products" :key="idx">
            <td class="tw-p-2 tw-border">{{ p.code }}</td>
            <td class="tw-p-2 tw-border">{{ p.name }}</td>
            <td class="tw-p-2 tw-border tw-text-right">{{ p.qty }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const props = defineProps({
  kpis: { type: Array, default: () => [] },
  revenueLabels: { type: Array, default: () => [] },
  revenueValues: { type: Array, default: () => [] },
  orderLabels: { type: Array, default: () => [] },
  orderValues: { type: Array, default: () => [] },
  products: { type: Array, default: () => [] },
});

const lineChart = ref(null);
const barChart = ref(null);

onMounted(() => {
  // Chart Line: Doanh thu
  new Chart(lineChart.value, {
    type: "line",
    data: {
      labels: props.revenueLabels,
      datasets: [
        {
          label: "Doanh thu (VND)",
          data: props.revenueValues,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.3)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });

  // Chart Bar: Đơn hàng
  new Chart(barChart.value, {
    type: "bar",
    data: {
      labels: props.orderLabels,
      datasets: [
        {
          label: "Đơn hàng",
          data: props.orderValues,
          backgroundColor: ["#22c55e", "#3b82f6", "#f97316", "#ef4444", "#a855f7"],
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });
});
</script>
