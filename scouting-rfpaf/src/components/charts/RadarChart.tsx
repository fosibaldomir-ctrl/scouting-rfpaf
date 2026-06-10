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
        backgroundColor: `${color}33`,
        borderColor: color,
        borderWidth: 2,
        pointBackgroundColor: color,
        pointRadius: 4,
      },
    ],
  }

  return (
    <Radar
      data={data}
      options={{
        responsive: true,
        scales: {
          r: {
            min: 0,
            max,
            ticks: { stepSize: max === 5 ? 1 : 2, font: { size: 10 } },
            pointLabels: { font: { size: 10 } },
          },
        },
        plugins: { legend: { display: false } },
      }}
    />
  )
}
