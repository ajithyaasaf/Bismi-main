import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { useQuery } from '@tanstack/react-query';
import { Order } from '@shared/types';

Chart.register(...registerables);

export default function SalesChart() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  const { data: orders = [] } = useQuery<Order[]>({ 
    queryKey: ['/api/orders'],
  });
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Generate last 7 days data from orders
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();
    
    const dayLabels = days.map(day => day.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    }));
    
    const dailySales = days.map(day => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayOrders = orders.filter(order => {
        // Use createdAt timestamp
        const timestamp = order.createdAt;
        if (!timestamp) return false;
        const orderDate = new Date(timestamp);
        return orderDate >= dayStart && orderDate <= dayEnd;
      });
      
      return dayOrders.reduce((sum, order) => {
        const amount = order.totalAmount || 0;
        return Math.round((sum + amount + Number.EPSILON) * 100) / 100;
      }, 0);
    });
    
    // Create new chart
    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: dayLabels,
        datasets: [
          {
            label: 'Daily Sales (₹)',
            data: dailySales,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: 'rgba(59, 130, 246, 1)',
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `₹${context.raw}`,
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              callback: (value) => `₹${value}`
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [orders]);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Sales Trend</h3>
      </div>
      <div className="px-4 py-5 sm:p-6" style={{ height: '300px' }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}
