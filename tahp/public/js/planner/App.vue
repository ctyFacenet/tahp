<script setup>
import { ref, onMounted } from "vue";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const dynamicMessage = ref("Hello from App.vue 3");

onMounted(() => {
  const ctx = document.getElementById('myChart').getContext('2d');
  const myChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Red', 'Blue', 'Yellow'],
      datasets: [{
        label: '# of Votes',
        data: [12, 19, 3],
        backgroundColor: ['red', 'blue', 'yellow']
      }]
    }
  });
});
</script>

<template>
  <div>
    <h3>{{ dynamicMessage }}</h3>
    <canvas id="myChart" width="400" height="200"></canvas>
  </div>
</template>
