import React from 'react';
import Chart from 'react-apexcharts';

interface Props {
  data: number[];
  categories: string[];
}

const ResidualLineChart: React.FC<Props> = ({ data, categories }) => {
  const options = {
    chart: { type: 'line', zoom: { enabled: false } },
    xaxis: { categories },
    theme: { mode: 'light' },
    tooltip: { theme: 'dark' },
  };
  const series = [{ name: 'Residual', data }];

  return <Chart options={options} series={series} type="line" height={350} />;
};

export default ResidualLineChart;
