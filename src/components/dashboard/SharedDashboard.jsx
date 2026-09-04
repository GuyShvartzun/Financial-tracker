import React from 'react';
import MetricCards from './MetricCards';
import GrowthSummaryCards from './GrowthSummaryCards';
import EmergencyFundCard from './EmergencyFundCard';
import DemographicBox from './DemographicBox';
import WaterfallChartModule from '../charts/WaterfallChartModule';

export default function SharedDashboard({ roomStats, budgetTotals }) {
  return (
    <div className="space-y-6">
      <MetricCards
        netWorth={roomStats.netWorth}
        liquid={roomStats.liquid}
        nonLiquid={roomStats.nonLiquid}
        liabilities={roomStats.liabilities}
        growthPct={roomStats.growthPct}
      />

      <GrowthSummaryCards
        avgMonthlyTotalGrowth={roomStats.avgMonthlyTotalGrowth}
        totalGrowthAmount={roomStats.totalGrowthAmount}
        avgMonthlyLiquidGrowth={roomStats.avgMonthlyLiquidGrowth}
        liquidGrowthAmount={roomStats.liquidGrowthAmount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <EmergencyFundCard
          emergencyMonths={roomStats.emergencyMonths}
          shortTermAssets={roomStats.shortTermAssets}
          monthlyExp={roomStats.monthlyExp}
        />

        <div className="lg:col-span-2">
          <WaterfallChartModule budgetTotals={budgetTotals} />
        </div>
      </div>

      <DemographicBox 
        netWorth={roomStats.netWorth} 
        liquid={roomStats.liquid} 
        nonLiquid={roomStats.nonLiquid}
        isCouple={true} 
        label="השוואה דמוגרפית לזוג מול נתוני הלמ״ס" 
      />
    </div>
  );
}
