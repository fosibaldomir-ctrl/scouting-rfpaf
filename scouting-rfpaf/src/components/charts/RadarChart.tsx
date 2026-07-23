import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

interface RadarChartProps {
  labels: string[]
  values: number[]
  max?: number
  color?: string
  label?: string
}

export default function RadarChart({
  labels,
  values,
  max = 10,
  color = '#1a3a6b',
  label = 'Evaluación',
}: RadarChartProps) {
  const data = {
    labels,
    datasets: [
      {
        label,
        data: values,
        // Relleno translúcido + borde marcado: la silueta se lee de un vistazo.
        backgroundColor: `${color}2b`,
        borderColor: color,
        borderWidth: 2.5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: color,
        pointBorderWidth: 2.5,
        pointRadius: 4.5,
        pointHoverRadius: 6.5,
        pointHoverBorderWidth: 3,
        fill: true,
      },
    ],
  }

  return (
    <Radar
      data={data}
      options={{
        responsive: true,
        // El contenedor decide la altura; así el radar llena la tarjeta en vez
        // de quedarse pequeño en medio de un hueco.
        maintainAspectRatio: false,
        // Sin este margen chart.js recorta las etiquetas de los extremos.
        layout: { padding: 10 },
        scales: {
          r: {
            min: 0,
            max,
            beginAtZero: true,
            ticks: {
              stepSize: max === 5 ? 1 : 2,
              font: { size: 9 },
              color: '#94a3b8',
              backdropColor: 'transparent',
              showLabelBackdrop: false,
            },
            grid: { color: '#e5e9f0' },
            angleLines: { color: '#e5e9f0' },
            pointLabels: {
              font: { size: 11, weight: 600 },
              color: '#334155',
              padding: 10,
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            titleFont: { size: 12, weight: 700 },
            bodyFont: { size: 12 },
            callbacks: {
              label: (ctx) => `${ctx.formattedValue} / ${max}`,
            },
          },
        },
      }}
    />
  )
}
