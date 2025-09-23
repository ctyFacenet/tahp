<template>
  <div>
    <h2 class="text-center text-xl font-semibold mb-4 mt-4">Báo cáo tổng quan đơn hàng chi tiết</h2>
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div class="lg:col-span-1">
        <TreeFilter />
      </div>

      <div class="lg:col-span-4 grid grid-cols-1 lg:grid-cols-2 gap-4 mr-4 shadow rounded-sm p-4">
        <div class="p-2 border rounded">
          <BaseChart type="bar" :data="barChartData" :options="barChartOptions" />
        </div>
        <div class="p-2 border rounded flex flex-col lg:flex-row justify-around items-center gap-4">
          <BaseChart type="doughnut" :data="donutChartData1" :options="donutChartOptions('07/2025')" />
          <BaseChart type="doughnut" :data="donutChartData2" :options="donutChartOptions('08/2025')" />
        </div>
      </div>
    </div>

    <div class="mt-6 p-4">
      <DefectTable :rows="rows" />
    </div>
  </div>
</template>

<script setup>
import BaseChart from "@/components/BaseChart.vue";
import TreeFilter from "@/components/TreeFilter.vue";
import DefectTable from "@/components/DefectTable.vue";

const barChartData = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
  datasets: [
    {
      label: "Số lượng hàng hóa yêu cầu",
      data: [6394, 6683, 7321, 5257, 6981, 7023, 7122, 1835],
      backgroundColor: "rgba(99, 102, 241, 0.6)",
      borderColor: "rgba(99, 102, 241, 1)",
      borderWidth: 1,
    },
    {
      label: "Số lượng hàng hóa trung bình",
      data: new Array(8).fill(6400),
      type: "line",
      borderColor: "red",
      borderWidth: 2,
      fill: false,
      pointRadius: 0,
    },
  ],
};
const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom",labels: {
        font: {
          size: 13,
        },
        boxWidth: 10,
        boxHeight: 10,
      } },
    tooltip: { enabled: true },
     title: {
      display: true,
      text: `Biểu đồ số lượng hàng hóa yêu cầu theo tháng`,
      font: { size: 14, weight: "bold" },
    },
  },

  scales: { y: { 
    beginAtZero: true , 
    suggestedMin: 0,
    suggestedMax: 8000,
      ticks: {
        stepSize: 1600,
      },} },
};

const donutChartData1 = {
  datasets: [
    {
      data: [8740.16, 8616.67, 8213.12, 5237.25, 4314.73],
      backgroundColor: ["#6366f1", "#f87171", "#22c55e", "#a855f7", "#fbbf24"],
    },
  ],
};
const donutChartData2 = {
  labels: ["EIAI_BT", "PEW", "2U", "EIAI_KPA", "Khác"],
  datasets: [
    {
      data: [3392.88, 6273.93, 2111.86, 2282.14, 2433.93],
      backgroundColor: ["#6366f1", "#f87171", "#22c55e", "#a855f7", "#fbbf24"],
    },
  ],
};
const donutChartOptions = (monthLabel) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { 
      position: "right", 
      labels: {
        usePointStyle: true,
        pointStyle: "circle",
        boxWidth: 5,
        boxHeight: 5,
        font: { size: 10 },
      }, 
    },
    title: {
      display: true,
      text: `Biểu đồ so sánh tỷ lệ nhóm hàng được đặt\n${monthLabel}`,
      font: { size: 14, weight: "bold" },
    },
     datalabels: { display: false },
        tooltip: {
      callbacks: {
        label: function (context) {
          const dataset = context.dataset;
          const value = dataset.data[context.dataIndex];
          const total = dataset.data.reduce((a, b) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(2) + "%";
          return `${value} (${percentage})`;
        },
      },
    },

  },
  cutout: "45%",
  radius: "60%",

});

const rows = Array.from({ length: 80 }).map((_, i) => ({
  process: i % 2 === 0 ? "KEOTIEU" : "MAHZ",
  code: `CODE${i + 1}`,
  name: i % 2 === 0 ? "Ngoại quan (xỉn màu)" : "Đường kính bất thường",
  symptom: i % 2 === 0 ? "Xỉn màu" : "Sai thông số máy",
  cause: i % 2 === 0 ? "Ống hơi lỗi" : "Không kiểm tra dies",
  qty: Math.floor(Math.random() * 100) + 40,
  unit: "kg",
  order: `WO_EIAW020_A_${i + 1}`,
  machine: `MACHINE${(i % 5) + 1}`,
  line: `LINE${(i % 3) + 1}`,
  operator: i % 2 === 0 ? "Trần Tiến Đạt" : "Nguyễn Văn C",
}));
</script>

<style scoped>
div[role="img"] {
  height: 280px;
}
</style>
