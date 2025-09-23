<template>
  <div>
    <h2 class="text-center text-xl font-semibold mb-4 mt-4">Báo cáo kết quả sản xuất</h2>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div class="lg:col-span-1">
        <TreeFilter :showDateFilter="true" />
      </div>

      <div class="lg:col-span-4 p-4 border rounded shadow">
        <BaseChart
          type="bar"
          :data="productionChartData"
          :options="productionChartOptions"
        />
      </div>
    </div>

    <div class="mt-6 p-4">
      <DefectTable :rows="productionRows" :columns="productionColumns" />
    </div>
  </div>
</template>

<script setup>
import BaseChart from "@/components/BaseChart.vue";
import TreeFilter from "@/components/TreeFilter.vue";
import DefectTable from "@/components/DefectTable.vue";


const productionChartData = {
  labels: ["CAN", "KDAI", "KTRUNG", "KTIEU", "MAHZ", "MALH", "MAVT"],
  datasets: [
    {
      label: "Số lượng kế hoạch",
      data: [880, 760, 690, 755, 645, 735, 430],
      backgroundColor: "rgba(99, 102, 241, 0.6)",
    },
    {
      label: "Số lượng OK",
      data: [670, 590, 310, 468, 364, 685, 205],
      backgroundColor: "rgba(34, 197, 94, 0.6)",
    },
    {
      label: "Số lượng phế (NG + Rối)",
      data: [46, 13, 23.5, 34.2, 21.1, 18.6, 16.67],
      backgroundColor: "rgba(253, 167, 160, 1)",
    },
    {
      label: "Tỷ lệ OK",
      data: [76, 72, 65, 80, 70, 90, 45],
      type: "line",
      borderColor: "blue",
      borderWidth: 1.3,
      pointRadius: 3,
      yAxisID: "y1",
      tension: 0.1,
    },
    {
      label: "Tỷ lệ phế",
      data: [12, 10, 15, 18, 21, 19, 16],
      type: "line",
      borderColor: "red",
      borderWidth: 1.3,
      pointRadius: 3,
      yAxisID: "y1",
      tension: 0.1,
    },
  ],
};


const productionChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: { font: { size: 12 }, boxWidth: 10, boxHeight: 10 },
    },
    tooltip: { enabled: true },
    title: { display: false },
    datalabels: {
      display: (ctx) => ctx.dataset.type !== "line", 
      color: "#000",
      anchor: "end",
      align: "end",
      offset: -5,
      font: { size: 12 },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      suggestedMax: 900,
      ticks: { stepSize: 150 },
    },
    y1: {
      beginAtZero: true,
      position: "right",
      grid: { drawOnChartArea: false },
      suggestedMax: 100,
      ticks: {
        stepSize: 15,
        callback: (value) => `${value}%`,
      },
    },
  },
};


const productionColumns = [
  { title: "Mã công đoạn", key: "processCode" },
  { title: "Mã máy", key: "machineCode" },
  { title: "Nhóm line", key: "lineGroup" },
  { title: "Mã lệnh sản xuất", key: "orderCode" },
  { title: "Ca sản xuất", key: "shift" },
  { title: "Nhân viên thực hiện", key: "operator" },
  { title: "Ngày tạo tem", key: "createdAt" },
  { title: "Mã BTP đầu ra", key: "btpCode" },
  { title: "Tên BTP đầu ra", key: "btpName" },
  { title: "Số lượng sản xuất", key: "producedQty" },
  { title: "Số lượng đầu ra ước tính", key: "estimatedOutput" },
  { title: "Số lượng OK ước tính", key: "estimatedOK" },
  { title: "Số lượng NG ước tính", key: "estimatedNG" },
  { title: "Số lượng đầu ra thực tế", key: "actualOutput" },
  { title: "Số lượng OK thực tế", key: "actualOK" },
  { title: "Số lượng NG thực tế", key: "actualNG" },
  { title: "Số lượng phế rời", key: "scrapQty" },
  { title: "Đơn vị tính", key: "unit" },
];


const productionRows = Array.from({ length: 199 }).map((_, i) => ({
  processCode: i % 2 === 0 ? "KTIEU" : "MAHZ",
  machineCode: `MAY${i % 5 + 1}`,
  lineGroup: `LINE${i % 3 + 1}`,
  orderCode: `WO_EIAW020_A_${i + 1}`,
  shift: i % 2 === 0 ? "Ca 1" : "Ca 2",
  operator: i % 2 === 0 ? "Nguyễn Văn Hoàng" : "Đặng Văn Tú",
  createdAt: "01/06/2025",
  btpCode: `EIAW050_A_${i}`,
  btpName: "Dây đồng điện tử 0.5mm PT25",
  producedQty: Math.floor(Math.random() * 900 + 200),
  estimatedOutput: Math.floor(Math.random() * 900 + 200),
  estimatedOK: Math.floor(Math.random() * 700 + 150),
  estimatedNG: Math.floor(Math.random() * 50 + 10),
  actualOutput: Math.floor(Math.random() * 800 + 100),
  actualOK: Math.floor(Math.random() * 700 + 150),
  actualNG: Math.floor(Math.random() * 40 + 5),
  scrapQty: Math.floor(Math.random() * 20 + 5),
  unit: "kg",
}));
</script>

<style scoped>
div[role="img"] {
  height: 300px;
}
</style>
