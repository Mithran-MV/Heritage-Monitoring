import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register required components
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export default function LineChart({ data, parameter, label }) {
    const chartData = {
        labels: data.map((row) => row.timestamp),
        datasets: [
            {
                label,
                data: data.map((row) => row[parameter]),
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: false,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                enabled: true,
            },
        },
        scales: {
            x: {
                type: 'category',
                title: {
                    display: true,
                    text: 'Timestamp',
                },
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: label,
                },
            },
        },
    };

    return <Line data={chartData} options={options} />;
}
