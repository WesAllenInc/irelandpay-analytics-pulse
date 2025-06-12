import React from 'react';
import Chart from 'react-apexcharts';

interface Candle { x: Date; y: [number, number, number, number]; }
interface Props { seriesData: Candle[]; }

const SalesCandlestick: React.FC<Props> = ({ seriesData }) => {
  const options = {
    chart: { type: 'candlestick' },
    xaxis: { type: 'datetime' },
    theme: { mode: 'light' },
  };
  const series = [{ data: seriesData }];

  return <Chart options={options} series={series} type="candlestick" height={350} />;
};

export default SalesCandlestick;
