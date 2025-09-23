<template>
  <div class="bg-white min-h-screen flex flex-col md:flex-row">
    <div class="w-full md:w-[35%] lg:w-[15%] p-2 mt-8">
      <TreeFilter />
    </div>

    <div class="flex-1 p-2 md:p-4">
      <h2 class="text-center font-bold text-2xl mb-4 mt-2 md:mt-4">
        Báo cáo tỷ lệ phế
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 rounded-sm shadow p-4 gap-4 mb-6">
        <div class="p-4 h-[250px] sm:h-[300px] lg:h-[350px]">
          <BaseChart type="line" :data="lineData" :options="lineOptions" />
        </div>

        <div class="p-4 h-[250px] sm:h-[300px] lg:h-[350px] shadow rounded-sm">
          <BaseChart type="doughnut" :data="doughnutData" :options="doughnutOptions" />
        </div>

        <div class="p-4 h-[250px] sm:h-[300px] lg:h-[350px] shadow rounded-sm">
          <BaseChart type="bar" :data="barData" :options="barOptions" />
        </div>
      </div>

      <DefectTable :rows="tableRows" />
    </div>
  </div>
</template>

<script setup>
import BaseChart from "@/components/BaseChart.vue";
import TreeFilter from "@/components/TreeFilter.vue";
import DefectTable from "@/components/DefectTable.vue";

const lineData = {
  labels: ["2024", "2025", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
  datasets: [
    {
      data: [4, 3.8, 4.5, 10, 9.5, 1.5, 2, 2.5, 1.8, 3],
      borderColor: "rgba(137, 121, 255, 0.8)",
      backgroundColor: "rgba(137, 121, 255, 0.4)",
      tension: 0.1,
      fill: false,
      pointRadius: 4,
      pointBackgroundColor: "white",
      pointBorderColor: "#6366f1",
      pointBorderWidth: 1,
    },
  ],
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: {
      display: true,
      text: "Biểu đồ tỷ lệ phế",
      font: { size: 14, weight: "bold" },
      align: "center",
      padding: { top: 10, bottom: 20 },
    },
    legend: { display: false},
    datalabels: {
      color: "#000",
      anchor: "end",
      align: "bottom",
      formatter: (val) => val,
    },
  },
  scales: {
    y: {
      suggestedMin: 0,
      suggestedMax: 10,
      ticks: {
        stepSize: 2,
        callback: (val) => val + "%",
      },
    
    },
  },
};

const doughnutData = {
  labels: [
    "Méo ngoài",
    "Sản một cạnh",
    "Sản phối",
    "Đường kính",
    "Điện áp thấp",
    "Độ mềm dẻo",
    "Nhiệt men thấp",
    "Số dây",
    "Lỗ kim",
  ],
  datasets: [
    {
      data: [85.66, 12.53, 57.61, 93.47, 43.32, 61.2, 27.08, 98.46, 69.03],
      backgroundColor: [
        "#3b82f6", "#facc15", "#a78bfa", "#22c55e", "#06b6d4",
        "#8b5cf6", "#f87171", "#4ade80", "#fb923c",
      ],
    },
  ],
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "35%",
  radius: "60%",
  plugins: {
    title: {
      display: true,
      text: "Biểu đồ số lượng hàng bị lỗi theo loại lỗi",
      font: { size: 14, weight: "bold" },
      align: "center",
      padding: { top: 10, bottom: 20 },
    },
    legend: {
      display: true,
      position: "right",
      align: "center",
      labels: {
        usePointStyle: true,
        pointStyle: "circle",
        boxWidth: 5,
        boxHeight: 5,
        font: { size: 12 },
      },
    },
 tooltip: {
      backgroundColor: "#fff",  
      titleColor: "#000",     
      bodyColor: "#000",    
      borderWidth: 1,
      cursor:'pointer',
      borderColor: (ctx) => {
        return ctx.tooltipItems?.[0]
          ? ctx.chart.data.datasets[0].backgroundColor[ctx.tooltipItems[0].dataIndex]
          : "#ccc";
      },
      displayColors: true, 
      padding: 8,
      bodyFont: { size: 13 },
      titleFont: { weight: "bold" },
      boxPadding: 4,
      caretPadding: 6,
      caretSize: 6,
      cornerRadius: 6,
      usePointStyle: true,
      callbacks: {
        label: (ctx) => {
          const dataset = ctx.dataset;
          const total = dataset.data.reduce((a, b) => a + b, 0);
          const value = ctx.raw;
          const pct = ((value / total) * 100).toFixed(2);
          return `${ctx.label}: ${value} (${pct}%)`;
        },
      },
    },
    datalabels: { display: false },
  },
};

const barData = {
  labels: [
    "Độ mềm dẻo",
    "Nhiệt men thấp",
    "Số dây",
    "Lỗ kim",
    "Điện áp thấp",
    "Đường kính",
    "Sản phối",
    "Sản một cạnh",
    "Méo ngoài",
  ],
  datasets: [
    { label: "CAN", data: [14.92, 13.4, 64.96, 26.93, 24.62, 27.17, 57.61, 12.53, 85.66], backgroundColor: "#6366f1" },
    { label: "KEODAI", data: [32.88, 14.06, 33.5, 42.1, 18.7, 66.3, 0, 0, 0], backgroundColor: "#f87171" },
    { label: "KEOTRUNG", data: [0, 0, 0, 26.93, 0, 0, 0, 0, 0], backgroundColor: "#facc15" },
    { label: "KEOTIEU", data: [0, 13.02, 0, 24.62, 0, 0, 0, 0, 0], backgroundColor: "#fb923c" },
    { label: "MAHZ", data: [0, 0, 42.1, 0, 0, 0, 0, 0, 0], backgroundColor: "#22c55e" },
    { label: "MALH", data: [0, 0, 0, 0, 0, 27.17, 0, 0, 0], backgroundColor: "#a78bfa" },
    { label: "MAVT", data: [0, 0, 0, 0, 0, 0, 57.61, 12.53, 0], backgroundColor: "#06b6d4" },
  ],
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    title: {
      display: true,
      text: "Biểu đồ số lượng hàng bị lỗi theo công đoạn của loại lỗi",
      font: { size: 14, weight: "bold" },
      align: "center",
      padding: { top: 10, bottom: 20 },
    },
   legend: { 
      position: "bottom",
      labels: {
        font: {
          size: 10,
        },
        boxWidth: 5,
        boxHeight: 5,
      }
    },
    
  datalabels: {
      color: "#000",
      anchor: "end",
      align: "end", 
      offset: -18, 
      font: { size: 10},
      formatter: (val) => (val > 0 ? val : ""),
    },
  },
   scales: {
    x: { stacked: true },
    y: { 
      stacked: true,
      suggestedMin: 20,
      suggestedMax: 100,
      ticks: {
        stepSize: 20,
      },
    },
  },
};

const tableRows = [
  {
    process: "KEOTIEU",
    code: "DT.DK01",
    name: "Đường kính to, nhỏ, méo ngoài tiêu chuẩn",
    symptom: "Không đạt chuẩn",
    cause: "Không kiểm tra dies",
    qty: 52,
    unit: "kg",
    order: "WO_EIAW020_A_27_2506.1",
    machine: "KEOTIEU1",
    line: "KEOTIEU.1",
    operator: "Trần Tiến Đạt",
  }
];

for (let i = 6; i <= 100; i++) {
  tableRows.push({
    process: i % 2 === 0 ? "KEOTIEU" : "MAHZ",
    code: `CODE${i}`,
    name: i % 2 === 0 ? "Đường kính bất thường" : "Ngoại quan mờ",
    symptom: i % 2 === 0 ? "Không đạt chuẩn" : "Xỉn màu",
    cause: i % 2 === 0 ? "Sai thông số máy" : "Ống hơi lỗi",
    qty: 40 + i,
    unit: "kg",
    order: `WO_EIAW020_A_${i}_2506.${i}`,
    machine: i % 2 === 0 ? `KEOTIEU${i}` : `HZ${i}`,
    line: i % 2 === 0 ? `KEOTIEU.${i}` : `HZ.${i}`,
    operator: i % 2 === 0 ? "Nguyễn Văn C" : "Trần Tiến Đạt",
  });
}
</script>
