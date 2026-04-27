import { supabaseService } from './supabaseService';

test('getChartData returns legacy datasets and slaTrend', async () => {
  const data = await supabaseService.getChartData();

  expect(Array.isArray(data.monthlyApprovals)).toBe(true);
  expect(Array.isArray(data.workloadByBarangay)).toBe(true);
  expect(Array.isArray(data.programBreakdown?.labels)).toBe(true);
  expect(Array.isArray(data.programBreakdown?.values)).toBe(true);
  expect(Array.isArray(data.slaTrend)).toBe(true);

  if (data.slaTrend.length > 0) {
    expect(data.slaTrend[0]).toEqual(
      expect.objectContaining({
        period: expect.any(String),
        breaches: expect.any(Number),
        withinSla: expect.any(Number),
      })
    );
  }
});
