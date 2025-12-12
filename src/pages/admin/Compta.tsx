import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { getNavItems } from '../../config/navigation';
import { Download, Calendar, TrendingUp, TrendingDown, DollarSign, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface AffiliateComptaData {
  userId: number;
  username: string;
  realRevenue: number;
  ftdCount: number;
  visitors: number;
  cpaThem: number;
  cpaUs: number;
  revshareThem: number;
  revshareUs: number;
  expenses: number;
  salary: number;
  referralShare: number;
  profit: number;
  estimatedMonthly: number;
}

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type SortField = keyof AffiliateComptaData | null;
type SortDirection = 'asc' | 'desc';

export default function Compta() {
  const { user, loading, logout } = useAuth();
  const [data, setData] = useState<AffiliateComptaData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [totals, setTotals] = useState({
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
  });
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const navItems = getNavItems('admin');

  useEffect(() => {
    if (!loading && user && user.accountType === 'admin') {
      fetchComptaData();
    }
  }, [loading, user, period, customStartDate, customEndDate]);

  const fetchComptaData = async () => {
    try {
      setIsLoading(true);
      console.log('[COMPTA UI] Fetching data for period:', period, 'startDate:', customStartDate, 'endDate:', customEndDate);

      const params = new URLSearchParams({ period });
      if (period === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      }

      console.log('[COMPTA UI] Request URL:', `${import.meta.env.VITE_API_URL}/api/admin/compta?${params.toString()}`);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/compta?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch compta data');
      }

      const result = await response.json();
      console.log('[COMPTA UI] Data received:', result);
      setData(result.affiliates || []);
      setTotals(result.totals || {
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
      });
    } catch (error) {
      console.error('[COMPTA UI] Error fetching compta data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0;

    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    const aNum = Number(aValue);
    const bNum = Number(bValue);
    return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const exportToCSV = () => {
    const headers = [
      'Affilié',
      'Revenue Total',
      'FTDs',
      'Visiteurs',
      'CPA Eux',
      'CPA Nous',
      'Revshare Eux',
      'Revshare Nous',
      'Dépenses',
      'Salaire',
      'Part Parrainage',
      'Bénéfice',
      'Estimation Mensuelle'
    ];

    const rows = data.map(affiliate => [
      affiliate.username,
      affiliate.realRevenue.toFixed(2),
      affiliate.ftdCount,
      affiliate.visitors,
      affiliate.cpaThem.toFixed(2),
      affiliate.cpaUs.toFixed(2),
      affiliate.revshareThem.toFixed(2),
      affiliate.revshareUs.toFixed(2),
      affiliate.expenses.toFixed(2),
      affiliate.salary.toFixed(2),
      affiliate.referralShare.toFixed(2),
      affiliate.profit.toFixed(2),
      affiliate.estimatedMonthly.toFixed(2)
    ]);

    rows.push([
      'TOTAL',
      totals.realRevenue.toFixed(2),
      totals.ftdCount.toString(),
      totals.visitors.toString(),
      totals.cpaThem.toFixed(2),
      totals.cpaUs.toFixed(2),
      totals.revshareThem.toFixed(2),
      totals.revshareUs.toFixed(2),
      totals.expenses.toFixed(2),
      totals.salary.toFixed(2),
      totals.referralShare.toFixed(2),
      totals.profit.toFixed(2),
      ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const periodLabel = period === 'custom' ? `${customStartDate}_${customEndDate}` : period;
    link.setAttribute('href', url);
    link.setAttribute('download', `compta_${periodLabel}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  if (!user || user.accountType !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} navItems={navItems} onLogout={logout} />

      <div className="relative pt-24 px-4 pb-12">
        <div className="max-w-7xl mx-auto py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div>
              <h1 className="text-4xl font-bold text-foreground">Comptabilité</h1>
              <p className="text-muted-foreground mt-2">Vue d'ensemble financière de tous les affiliés</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportToCSV}
              disabled={isLoading || data.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Exporter CSV
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-6 mb-8"
          >
            <div className="flex items-center gap-2 text-foreground mb-4">
              <Calendar className="w-5 h-5" />
              <span className="font-semibold">Période</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { value: 'today', label: "Aujourd'hui" },
                { value: 'yesterday', label: 'Hier' },
                { value: 'week', label: 'Cette semaine' },
                { value: 'month', label: 'Ce mois-ci' },
                { value: 'custom', label: 'Personnalisé' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value as PeriodFilter)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    period === option.value
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
                      : 'bg-accent text-foreground hover:bg-accent/70'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="flex gap-3 items-center mt-4">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                />
                <span className="text-muted-foreground">à</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                />
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm font-medium">Revenue Total (API)</span>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-foreground">{totals.realRevenue.toFixed(2)}€</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm font-medium">FTDs Total</span>
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground">{totals.ftdCount}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm font-medium">Visiteurs</span>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-foreground">{totals.visitors}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm font-medium">Bénéfice</span>
                {totals.profit >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className={`text-3xl font-bold ${totals.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totals.profit >= 0 ? '+' : ''}{totals.profit.toFixed(2)}€
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="overflow-x-auto max-h-[600px] relative">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border">
                    <th onClick={() => handleSort('username')} className="px-4 py-4 text-left text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center">Affilié<SortIcon field="username" /></div>
                    </th>
                    <th onClick={() => handleSort('realRevenue')} className="px-4 py-4 text-right text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-end">Revenue Total<SortIcon field="realRevenue" /></div>
                    </th>
                    <th onClick={() => handleSort('ftdCount')} className="px-4 py-4 text-center text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-center">FTDs<SortIcon field="ftdCount" /></div>
                    </th>
                    <th onClick={() => handleSort('visitors')} className="px-4 py-4 text-center text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-center">Visiteurs<SortIcon field="visitors" /></div>
                    </th>
                    <th onClick={() => handleSort('cpaThem')} className="px-4 py-4 text-right text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-end">CPA Eux<SortIcon field="cpaThem" /></div>
                    </th>
                    <th onClick={() => handleSort('cpaUs')} className="px-4 py-4 text-right text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-end">CPA Nous<SortIcon field="cpaUs" /></div>
                    </th>
                    <th onClick={() => handleSort('revshareThem')} className="px-4 py-4 text-right text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-end">RS Eux<SortIcon field="revshareThem" /></div>
                    </th>
                    <th onClick={() => handleSort('revshareUs')} className="px-4 py-4 text-right text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-end">RS Nous<SortIcon field="revshareUs" /></div>
                    </th>
                    <th onClick={() => handleSort('expenses')} className="px-4 py-4 text-right text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-end">Dépenses<SortIcon field="expenses" /></div>
                    </th>
                    <th onClick={() => handleSort('salary')} className="px-4 py-4 text-right text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-end">Salaire<SortIcon field="salary" /></div>
                    </th>
                    <th onClick={() => handleSort('referralShare')} className="px-4 py-4 text-right text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-end">Part Ref<SortIcon field="referralShare" /></div>
                    </th>
                    <th onClick={() => handleSort('profit')} className="px-4 py-4 text-right text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-end">Bénéfice<SortIcon field="profit" /></div>
                    </th>
                    <th onClick={() => handleSort('estimatedMonthly')} className="px-4 py-4 text-right text-xs font-semibold text-foreground cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-end">Est. Mens.<SortIcon field="estimatedMonthly" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={13} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <motion.div
                            className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                          Chargement...
                        </div>
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-6 py-12 text-center text-muted-foreground">
                        Aucune donnée disponible pour cette période
                      </td>
                    </tr>
                  ) : (
                    <>
                      {sortedData.map((affiliate, index) => (
                        <motion.tr
                          key={affiliate.userId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-border hover:bg-accent/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs font-medium text-foreground">{affiliate.username}</td>
                          <td className="px-4 py-3 text-right text-xs text-green-500 font-semibold">{affiliate.realRevenue.toFixed(2)}€</td>
                          <td className="px-4 py-3 text-center text-xs text-foreground">{affiliate.ftdCount}</td>
                          <td className="px-4 py-3 text-center text-xs text-foreground">{affiliate.visitors}</td>
                          <td className="px-4 py-3 text-right text-xs text-blue-500">{affiliate.cpaThem.toFixed(2)}€</td>
                          <td className="px-4 py-3 text-right text-xs text-green-500">{affiliate.cpaUs.toFixed(2)}€</td>
                          <td className="px-4 py-3 text-right text-xs text-blue-500">{affiliate.revshareThem.toFixed(2)}€</td>
                          <td className="px-4 py-3 text-right text-xs text-green-500">{affiliate.revshareUs.toFixed(2)}€</td>
                          <td className="px-4 py-3 text-right text-xs text-orange-500">{affiliate.expenses.toFixed(2)}€</td>
                          <td className="px-4 py-3 text-right text-xs text-foreground">{affiliate.salary.toFixed(2)}€</td>
                          <td className="px-4 py-3 text-right text-xs text-purple-500">{affiliate.referralShare.toFixed(2)}€</td>
                          <td className={`px-4 py-3 text-right text-xs font-semibold ${
                            affiliate.profit >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {affiliate.profit >= 0 ? '+' : ''}{affiliate.profit.toFixed(2)}€
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-cyan-500">{affiliate.estimatedMonthly.toFixed(2)}€</td>
                        </motion.tr>
                      ))}
                      <tr className="sticky bottom-0 bg-card/95 backdrop-blur-sm font-bold border-t-2 border-border shadow-lg">
                        <td className="px-4 py-4 text-xs text-foreground font-bold">TOTAL</td>
                        <td className="px-4 py-4 text-right text-xs text-green-500 font-bold">{totals.realRevenue.toFixed(2)}€</td>
                        <td className="px-4 py-4 text-center text-xs text-foreground font-bold">{totals.ftdCount}</td>
                        <td className="px-4 py-4 text-center text-xs text-foreground font-bold">{totals.visitors}</td>
                        <td className="px-4 py-4 text-right text-xs text-blue-500 font-bold">{totals.cpaThem.toFixed(2)}€</td>
                        <td className="px-4 py-4 text-right text-xs text-green-500 font-bold">{totals.cpaUs.toFixed(2)}€</td>
                        <td className="px-4 py-4 text-right text-xs text-blue-500 font-bold">{totals.revshareThem.toFixed(2)}€</td>
                        <td className="px-4 py-4 text-right text-xs text-green-500 font-bold">{totals.revshareUs.toFixed(2)}€</td>
                        <td className="px-4 py-4 text-right text-xs text-orange-500 font-bold">{totals.expenses.toFixed(2)}€</td>
                        <td className="px-4 py-4 text-right text-xs text-foreground font-bold">{totals.salary.toFixed(2)}€</td>
                        <td className="px-4 py-4 text-right text-xs text-purple-500 font-bold">{totals.referralShare.toFixed(2)}€</td>
                        <td className={`px-4 py-4 text-right text-sm font-bold ${
                          totals.profit >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {totals.profit >= 0 ? '+' : ''}{totals.profit.toFixed(2)}€
                        </td>
                        <td className="px-4 py-4"></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}