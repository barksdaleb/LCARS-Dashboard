"use client";

import { useState } from "react";
import billHistory from "@/data/history/aps/bills.json";
import { analyzeAPSBills, type BillPhase } from "@/app/lib/energy/APSBillAnalysis";

// Static bill history changes on import/rebuild; do not recalculate on the page's clock ticks.
const analysis = analyzeAPSBills(billHistory.bills);
const money = (n: number | null) => n === null ? "Unavailable" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const quantity = (n: number | null) => n === null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const percentage = (n: number | null) => n === null ? "—" : `${n.toFixed(2)}%`;
const signedMoney = (n: number | null) => n === null ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${money(Math.abs(n))}`;
const signedQuantity = (n: number | null) => n === null ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${quantity(Math.abs(n))}`;
const month = (value: string | null) => value === null ? "—" : new Date(`${value}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const date = (value: string | null) => value === null ? "—" : new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const phaseLabels: Record<BillPhase, string> = {
  pre: "Pre-Home-Ops",
  transition: "Transition",
  post: "Full post-Home-Ops",
};
const phaseColors: Record<BillPhase, string> = {
  pre: "border-cyan-800 text-cyan-300",
  transition: "border-orange-500 text-orange-200",
  post: "border-green-500 text-green-300",
};
const changeColor = (value: number | null) => value === null ? "text-cyan-300" : value < 0 ? "text-green-300" : value > 0 ? "text-orange-300" : "text-cyan-300";

export default function APSBillHistory() {
  const [showAll, setShowAll] = useState(false);
  const { rolling, homeOps, goal } = analysis;
  const rows = [...(showAll ? analysis.rows : analysis.current)].reverse();
  const mix = rolling.mix;
  return (
    <section aria-labelledby="aps-bill-history-title" className="rounded-xl border-2 border-cyan-500 bg-black/40 p-5 md:p-8">
      <div className="text-sm uppercase tracking-[0.3em] text-cyan-400">Home Ops · Actual APS bills</div>
      <h2 id="aps-bill-history-title" className="mt-2 text-3xl font-bold text-orange-100 md:text-4xl">MULTI-MONTH BILL ANALYSIS</h2>
      <p className="mt-3 text-cyan-300">Through {date(analysis.through)} · Home Ops began July 29, 2026</p>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-orange-200">
        Observed year-over-year changes are not proof of Home Ops savings. Weather, usage,
        billing-period length and rate changes also affect bills. Comparisons use actual total
        bill costs, including billed demand charges, taxes and fees; no historical charges are estimated.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Metric label="Rolling 12-month cost" value={money(rolling.currentCost)} detail={`${month(rolling.startMonth)} – ${month(rolling.endMonth)} · ${rolling.billCount}/12 bills`} />
        <Metric label="Corresponding prior year" value={money(rolling.priorCost)} detail={`${month(rolling.priorStartMonth)} – ${month(rolling.priorEndMonth)}`} />
        <Metric label="12-month cost change" value={signedMoney(rolling.costDifference)} detail={`${percentage(rolling.costDifferencePercent)} vs prior year · negative means lower cost`} />
      </div>
      <p className="mt-3 text-sm text-cyan-300">
        Usage: {quantity(rolling.currentKWh)} kWh vs {quantity(rolling.priorKWh)} kWh
        ({signedQuantity(rolling.kWhDifference)} kWh). Matched by billing-end month; periods can differ in length.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-green-600 p-5">
          <h3 className="text-sm uppercase tracking-[0.2em] text-green-300">Cumulative observed reduction since launch</h3>
          <div className="mt-3 text-4xl font-bold text-green-300">{money(homeOps.cumulativeReduction)}</div>
          <p className="mt-2 text-sm leading-6 text-cyan-300">
            {homeOps.postCount} full post-Home-Ops bill(s). Net prior-year cost minus current cost;
            increases reduce this total. Transition bills are excluded from this figure and the goal.
          </p>
          <div className="mt-4 border-t border-cyan-900 pt-4 text-sm text-orange-200">
            Transition bill reduction: {money(homeOps.transitionReduction)}.
            Including whole transition bills: {money(homeOps.includingTransitionReduction)}.
            No partial bill costs are prorated or attributed to Home Ops.
          </div>
        </div>
        <div className="rounded-xl border border-orange-400 p-5">
          <h3 className="text-sm uppercase tracking-[0.2em] text-orange-200">$500 annual observed-reduction goal</h3>
          <div className="mt-3 text-4xl font-bold text-orange-100">{percentage(goal.percent)}</div>
          <p className="mt-2 text-sm text-cyan-300">{money(goal.observedReduction)} of {money(goal.amount)} · {money(goal.remaining)} remaining</p>
          <div role="progressbar" aria-label="Annual observed-reduction goal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={goal.progressPercent} aria-valuetext={`${percentage(goal.percent)} of the $500 goal`} className="mt-4 h-4 overflow-hidden rounded-full bg-cyan-950">
            <div className="h-full rounded-full bg-orange-300" style={{ width: `${goal.progressPercent}%` }} />
          </div>
          <p className="mt-3 text-sm leading-6 text-cyan-300">
            First goal year: {date(goal.start)} – {date(goal.end)}. Counts only full bill periods
            within this window; no annualized projection or claim of causal savings.
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-cyan-800 pt-6">
        <h3 className="text-sm uppercase tracking-[0.2em] text-cyan-400">Rolling 12-month usage mix</h3>
        <p className="mt-2 text-sm text-cyan-300">Weighted by kWh across all three categories, including super-off-peak.</p>
        <div aria-hidden="true" className="mt-4 flex h-5 overflow-hidden rounded-full bg-cyan-950">
          <div className="bg-orange-300" style={{ width: `${mix.onPeakPercent ?? 0}%` }} />
          <div className="bg-cyan-400" style={{ width: `${mix.offPeakPercent ?? 0}%` }} />
          <div className="bg-violet-400" style={{ width: `${mix.superOffPeakPercent ?? 0}%` }} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Metric label="On-peak" value={percentage(mix.onPeakPercent)} detail={`${quantity(mix.onPeakKWh)} kWh`} />
          <Metric label="Off-peak" value={percentage(mix.offPeakPercent)} detail={`${quantity(mix.offPeakKWh)} kWh`} />
          <Metric label="Super-off-peak" value={percentage(mix.superOffPeakPercent)} detail={`${quantity(mix.superOffPeakKWh)} kWh`} />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-orange-100">MONTHLY YEAR-OVER-YEAR COMPARISON</h3>
        <button type="button" aria-pressed={showAll} onClick={() => setShowAll(!showAll)} className="rounded-full border border-cyan-400 px-5 py-2 text-sm text-cyan-200 hover:bg-cyan-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300">
          {showAll ? "Show rolling 12 months" : `Show all ${analysis.rows.length} bills`}
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-cyan-300">
        {homeOps.preCount} pre-Home-Ops · {homeOps.transitionCount} transition · {homeOps.postCount} full post-Home-Ops.
        Transition periods cross July 29; full post periods start on or after July 29.
        Negative changes mean lower cost or usage. Mix order: on / off / super-off-peak.
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-cyan-900" tabIndex={0} role="region" aria-label="Scrollable APS monthly bill comparisons">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <caption className="sr-only">Actual APS bills. Changes are current minus prior year. Older prior-year figures come from the bill when no archived matching bill exists.</caption>
          <thead className="bg-cyan-950/60 text-cyan-300">
            <tr>{["Bill / service period", "Home Ops phase", "Cost / prior year", "Cost change", "kWh / prior year", "kWh change", "Usage mix (%)", "Demand"].map(label => <th key={label} scope="col" className="p-3 font-medium">{label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.end} className="border-t border-cyan-900 align-top text-orange-100">
                <th scope="row" className="p-3 font-normal">
                  <div className="font-semibold">{date(row.issued)}</div>
                  <div className="mt-1 text-xs text-cyan-300">{date(row.start)} – {date(row.issued)}</div>
                </th>
                <td className="p-3"><span className={`inline-block rounded-full border px-3 py-1 text-xs ${phaseColors[row.phase]}`}>{phaseLabels[row.phase]}</span></td>
                <td className="p-3 tabular-nums">{money(row.totalEnergyCost)}<div className="mt-1 text-cyan-300">{money(row.priorCost)}</div><div className="mt-1 text-xs text-cyan-400">{row.priorCostSource}</div></td>
                <td className={`p-3 tabular-nums ${changeColor(row.costDifference)}`}>{signedMoney(row.costDifference)}<div className="mt-1 text-xs">{percentage(row.costDifferencePercent)}</div></td>
                <td className="p-3 tabular-nums">{quantity(row.usageKWh)}<div className="mt-1 text-cyan-300">{quantity(row.priorKWh)}</div></td>
                <td className={`p-3 tabular-nums ${changeColor(row.kWhDifference)}`}>{signedQuantity(row.kWhDifference)}<div className="mt-1 text-xs">{percentage(row.kWhDifferencePercent)}</div></td>
                <td className="p-3 tabular-nums">{percentage(row.mix.onPeakPercent)} /<br />{percentage(row.mix.offPeakPercent)} /<br />{percentage(row.mix.superOffPeakPercent)}</td>
                <td className="p-3 tabular-nums">{row.peakDemandKW === null ? "N/A" : `${quantity(row.peakDemandKW)} kW`}<div className="mt-1 text-xs text-cyan-300">{row.demandCharge === null ? "No demand charge on older plan" : money(row.demandCharge)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-cyan-800 bg-black/40 p-4">
    <div className="text-xs uppercase tracking-[0.15em] text-cyan-400">{label}</div>
    <div className="mt-2 text-3xl font-bold text-orange-200 tabular-nums">{value}</div>
    <div className="mt-2 text-sm text-cyan-300">{detail}</div>
  </div>;
}
