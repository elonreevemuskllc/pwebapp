import express from 'express';
import pool from '../db/connection';
import { getShavePercentageForDate } from '../services/shaveHistoryService';
import { parseStringPromise } from 'xml2js';
import { fetch, Agent } from 'undici';

const router = express.Router();

const ipv4Agent = new Agent({
  connect: {
    family: 4
  }
});

async function fetchRevenueFromAPI(trackingCodes: string[], fromDate: string, toDate: string): Promise<number> {
  try {
    const apiUrl = `${process.env.AFFILIATE_API_URL}?command=commissions&fromdate=${fromDate}&todate=${toDate}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'affiliateid': process.env.AFFILIATE_ID || '',
        'x-api-key': process.env.AFFILIATE_API_KEY || ''
      },
      dispatcher: ipv4Agent
    });

    if (!response.ok) {
      console.error('API request failed:', response.status, response.statusText);
      return 0;
    }

    const text = await response.text();

    const xmlData = await parseStringPromise(text, { explicitArray: false });
    const commissions = xmlData?.ResultSet?.Commission || [];
    const commissionsArray = Array.isArray(commissions) ? commissions : [commissions];

    let totalRevenue = 0;

    for (const commission of commissionsArray) {
      const trackingCode = commission.TrackingCode || '';

      if (trackingCodes.includes(trackingCode)) {
        const amount = parseFloat(commission.Commission || 0);
        totalRevenue += amount;
      }
    }

    return totalRevenue;
  } catch (error) {
    console.error('Error fetching revenue from API:', error);
    return 0;
  }
}

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

function getDateFilter(period: PeriodFilter, startDate?: string, endDate?: string): {
  ftdFilter: string;
  dateFilter: string;
  salaryFilter: string;
  expenseFilter: string;
  apiFromDate: string;
  apiToDate: string;
} {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (period === 'custom' && startDate && endDate) {
    return {
      ftdFilter: `DATE(registration_date) >= '${startDate}' AND DATE(registration_date) <= '${endDate}'`,
      dateFilter: `DATE(date) >= '${startDate}' AND DATE(date) <= '${endDate}'`,
      salaryFilter: `DATE(payment_date) >= '${startDate}' AND DATE(payment_date) <= '${endDate}'`,
      expenseFilter: `DATE(processed_at) >= '${startDate}' AND DATE(processed_at) <= '${endDate}'`,
      apiFromDate: startDate,
      apiToDate: endDate
    };
  }

  switch (period) {
    case 'today':
      return {
        ftdFilter: 'DATE(registration_date) = CURDATE()',
        dateFilter: 'DATE(date) = CURDATE()',
        salaryFilter: 'DATE(payment_date) = CURDATE()',
        expenseFilter: 'DATE(processed_at) = CURDATE()',
        apiFromDate: todayStr,
        apiToDate: todayStr
      };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      return {
        ftdFilter: 'DATE(registration_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)',
        dateFilter: 'DATE(date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)',
        salaryFilter: 'DATE(payment_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)',
        expenseFilter: 'DATE(processed_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)',
        apiFromDate: yesterdayStr,
        apiToDate: yesterdayStr
      };
    case 'week':
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      return {
        ftdFilter: 'registration_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)',
        dateFilter: 'date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)',
        salaryFilter: 'payment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)',
        expenseFilter: 'processed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)',
        apiFromDate: weekAgoStr,
        apiToDate: todayStr
      };
    case 'month':
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      const monthAgoStr = monthAgo.toISOString().split('T')[0];
      return {
        ftdFilter: 'registration_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)',
        dateFilter: 'date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)',
        salaryFilter: 'payment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)',
        expenseFilter: 'processed_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)',
        apiFromDate: monthAgoStr,
        apiToDate: todayStr
      };
    default:
      return {
        ftdFilter: '1=1',
        dateFilter: '1=1',
        salaryFilter: '1=1',
        expenseFilter: '1=1',
        apiFromDate: todayStr,
        apiToDate: todayStr
      };
  }
}

router.get('/', async (req, res) => {
  try {
    console.log('[COMPTA] Request received:', req.query);
    const period = (req.query.period as PeriodFilter) || 'today';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const filters = getDateFilter(period, startDate, endDate);
    console.log('[COMPTA] Filters:', filters);

    const [affiliates] = await pool.query(
      `SELECT
        u.id,
        u.username,
        ad.cpa_enabled,
        ad.cpa_amount,
        ad.revshare_enabled,
        ad.revshare_percentage,
        u.salary,
        u.referrer
      FROM users u
      LEFT JOIN affiliate_deals ad ON ad.user_id = u.id
      WHERE u.role = 'affiliate' AND u.state = 'accepted'
      ORDER BY u.username`
    ) as any[];
    console.log('[COMPTA] Found affiliates:', affiliates.length);

    const affiliateData = await Promise.all(
      affiliates.map(async (affiliate: any) => {
        const [ftdRows] = await pool.query(
          `SELECT COUNT(*) as count
          FROM ftd_assignments
          WHERE assigned_user_id = ? AND ${filters.ftdFilter}`,
          [affiliate.id]
        ) as any[];

        const ftdCount = ftdRows[0]?.count || 0;

        let cpaGenerated = 0;
        let cpaPocketEarned = 0;

        if (affiliate.cpa_enabled && affiliate.cpa_amount) {
          cpaGenerated = ftdCount * parseFloat(affiliate.cpa_amount);

          const [ftdDates] = await pool.query(
            `SELECT DATE(registration_date) as reg_date
            FROM ftd_assignments
            WHERE assigned_user_id = ? AND ${filters.ftdFilter}`,
            [affiliate.id]
          ) as any[];

          for (const ftdDate of ftdDates) {
            const date = new Date(ftdDate.reg_date);
            const shavePercentage = await getShavePercentageForDate(affiliate.id, date);
            const earnedPercentage = (100 - shavePercentage) / 100;
            cpaPocketEarned += parseFloat(affiliate.cpa_amount) * earnedPercentage;
          }
        }

        const [salaryRows] = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as total
          FROM daily_salary_payments
          WHERE user_id = ? AND ${filters.salaryFilter}`,
          [affiliate.id]
        ) as any[];

        const dailySalary = parseFloat(salaryRows[0]?.total || 0);

        const [expenseRows] = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as total
          FROM expense_reimbursements
          WHERE user_id = ? AND status = 'accepted' AND ${filters.expenseFilter}`,
          [affiliate.id]
        ) as any[];

        const dailyExpenses = parseFloat(expenseRows[0]?.total || 0);

        const [trackingCodesResult] = await pool.query(
          `SELECT code FROM tracking_codes WHERE user_id = ?`,
          [affiliate.id]
        ) as any[];

        const trackingCodes = trackingCodesResult.map((row: any) => row.code);

        let realRevenue = 0;
        let companyRevshare = 0;
        let affiliateRevshare = 0;
        let visitors = 0;

        if (trackingCodes.length > 0) {
          console.log(`[COMPTA] Fetching API revenue for ${affiliate.username} from ${filters.apiFromDate} to ${filters.apiToDate}`);
          realRevenue = await fetchRevenueFromAPI(trackingCodes, filters.apiFromDate, filters.apiToDate);
          console.log(`[COMPTA] API revenue for ${affiliate.username}: ${realRevenue}€`);

          if (affiliate.revshare_enabled && affiliate.revshare_percentage) {
            const affiliatePercentage = parseFloat(affiliate.revshare_percentage) / 100;
            affiliateRevshare = realRevenue * affiliatePercentage;
            companyRevshare = realRevenue - affiliateRevshare;
          } else {
            companyRevshare = realRevenue;
          }
        }

        const [visitorRows] = await pool.query(
          `SELECT COALESCE(SUM(dms.unique_visitors), 0) as total
          FROM daily_media_stats dms
          INNER JOIN tracking_codes tc ON tc.code = dms.tracking_code
          WHERE tc.user_id = ? AND ${filters.dateFilter}`,
          [affiliate.id]
        ) as any[];

        visitors = parseInt(visitorRows[0]?.total || 0);

        let referralShare = 0;
        if (affiliate.referrer) {
          const totalIncome = cpaGenerated + companyRevshare;
          const referralPercentage = 0.10;
          referralShare = totalIncome * referralPercentage;
        }

        const totalIncome = cpaGenerated + companyRevshare;
        const totalExpenses = cpaPocketEarned + dailySalary + dailyExpenses + affiliateRevshare + referralShare;
        const profit = totalIncome - totalExpenses;

        const [last30DaysFtds] = await pool.query(
          `SELECT COUNT(*) as count
          FROM ftd_assignments
          WHERE assigned_user_id = ? AND registration_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
          [affiliate.id]
        ) as any[];

        const last30DaysCount = last30DaysFtds[0]?.count || 0;
        const avgDailyFtds = last30DaysCount / 30;
        const estimatedNext30DaysFtds = Math.round(avgDailyFtds * 30);

        let estimatedNext30Days = 0;
        if (affiliate.cpa_enabled && affiliate.cpa_amount) {
          const estimatedCpaGenerated = estimatedNext30DaysFtds * parseFloat(affiliate.cpa_amount);
          const avgShave = cpaPocketEarned > 0 ? (cpaPocketEarned / cpaGenerated) : 0.7;
          const estimatedCpaPocket = estimatedCpaGenerated * avgShave;
          const estimatedSalary = affiliate.salary ? parseFloat(affiliate.salary) : 0;
          const avgDailyExpenses = dailyExpenses / Math.max(1, period === 'today' ? 1 : period === 'week' ? 7 : 30);
          const estimatedExpenses = avgDailyExpenses * 30;

          estimatedNext30Days = estimatedCpaGenerated - estimatedCpaPocket - estimatedSalary - estimatedExpenses;
        }

        return {
          userId: affiliate.id,
          username: affiliate.username,
          realRevenue,
          ftdCount,
          visitors,
          cpaThem: cpaPocketEarned,
          cpaUs: cpaGenerated,
          revshareThem: affiliateRevshare,
          revshareUs: companyRevshare,
          expenses: dailyExpenses,
          salary: dailySalary,
          referralShare,
          profit,
          estimatedMonthly: estimatedNext30Days
        };
      })
    );

    const totals = affiliateData.reduce(
      (acc, curr) => ({
        realRevenue: acc.realRevenue + curr.realRevenue,
        ftdCount: acc.ftdCount + curr.ftdCount,
        visitors: acc.visitors + curr.visitors,
        cpaThem: acc.cpaThem + curr.cpaThem,
        cpaUs: acc.cpaUs + curr.cpaUs,
        revshareThem: acc.revshareThem + curr.revshareThem,
        revshareUs: acc.revshareUs + curr.revshareUs,
        expenses: acc.expenses + curr.expenses,
        salary: acc.salary + curr.salary,
        referralShare: acc.referralShare + curr.referralShare,
        profit: acc.profit + curr.profit
      }),
      {
        realRevenue: 0,
        ftdCount: 0,
        visitors: 0,
        cpaThem: 0,
        cpaUs: 0,
        revshareThem: 0,
        revshareUs: 0,
        expenses: 0,
        salary: 0,
        referralShare: 0,
        profit: 0
      }
    );

    console.log('[COMPTA] Sending response:', {
      affiliateCount: affiliateData.length,
      totals
    });

    res.json({
      affiliates: affiliateData,
      totals
    });
  } catch (error) {
    console.error('[COMPTA] Error fetching compta data:', error);
    res.status(500).json({ message: 'Error fetching compta data' });
  }
});

export default router;