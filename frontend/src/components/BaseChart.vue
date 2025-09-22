<template>
  <div class="w-full h-full">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import {
  Chart,
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  BarController,
  DoughnutController,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

Chart.register(
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  BarController,
  DoughnutController,
  ChartDataLabels
);

const customDoughnutLabels = {
  id: "customDoughnutLabels",
  afterDatasetsDraw(chart, args, opts) {
    if (chart.config.type !== "doughnut") return;

    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    if (!dataset) return;

    const meta = chart.getDatasetMeta(0);
    const total = dataset.data.reduce((a, b) => a + b, 0);

    if (meta.data.length > 0) {
      const { x, y } = meta.data[0];
      ctx.save();
      ctx.font = "bold 15px sans-serif";
      ctx.fillStyle = "#000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(total.toFixed(2), x, y);
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.font = "12px sans-serif";
    ctx.textBaseline = "middle";

    meta.data.forEach((el, i) => {
      const val = dataset.data[i];
      if (!val) return;

      const percentage = ((val / total) * 100).toFixed(2) + "%";
      const color = dataset.backgroundColor[i];

      const { x, y } = el.tooltipPosition();
      const midAngle = (el.startAngle + el.endAngle) / 2;

      const xLine = Math.cos(midAngle) * (el.outerRadius + 15) + el.x;
      const yLine = Math.sin(midAngle) * (el.outerRadius + 15) + el.y;

      const alignRight = xLine > el.x;
      const xText = xLine + (alignRight ? 12 : -12);

      ctx.textAlign = alignRight ? "left" : "right";
      ctx.strokeStyle = color;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(xLine, yLine);
      ctx.lineTo(xText, yLine);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.fillText(`${val} (${percentage})`, xText, yLine);
    });

    ctx.restore();
  },
};


const props = defineProps({
  type: String,
  data: Object,
  options: Object,
});

const canvas = ref(null);
let chart;

onMounted(() => {
  chart = new Chart(canvas.value, {
    type: props.type,
    data: props.data,
    options: props.options,
    plugins: [customDoughnutLabels],
  });
});

watch(
  () => props.data,
  (newData) => {
    chart.data = newData;
    chart.update();
  },
  { deep: true }
);
</script>
