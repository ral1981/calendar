import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import { ChevronLeft, ChevronRight, Trash2, Printer, LogOut, CalendarSearch, ArrowUp } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return <HolidayTracker session={session} />;
}

function HolidayTracker({ session }) {
  const categories = [
    'Bank Holidays',
    'Birthday',
    'Vacation',
    'Volunteer Days',
    'Wellness Days',
    'Winter Holidays'
  ].sort();

  const [allowances, setAllowances] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 1));
  const [selectedCategory, setSelectedCategory] = useState('Bank Holidays');
  const [showYearView, setShowYearView] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printIncludeTotals, setPrintIncludeTotals] = useState(false);
  const [printIncludeBreakdown, setPrintIncludeBreakdown] = useState(false);
  const [printIncludeEntries, setPrintIncludeEntries] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    loadAllowances();
    loadHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling down 300px
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getDefaultAllowance = (category) => {
    const defaults = {
      'Bank Holidays': 8,
      'Volunteer Days': 2,
      'Wellness Days': 3,
      'Birthday': 1,
      'Vacation': 20,
      'Winter Holidays': 5
    };
    return defaults[category] || 0;
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const loadAllowances = async () => {
    try {
      const { data, error } = await supabase
        .from('allowances')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;

      const allowancesObj = {};
      data.forEach(item => {
        allowancesObj[item.category] = item.total;
      });

      categories.forEach(cat => {
        if (!allowancesObj[cat]) {
          allowancesObj[cat] = getDefaultAllowance(cat);
        }
      });

      setAllowances(allowancesObj);
    } catch (error) {
      console.error('Error loading allowances:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;

      setHolidays(data.map(h => ({
        id: h.id,
        category: h.category,
        days: h.days,
        status: h.status,
        date: h.date
      })));
    } catch (error) {
      console.error('Error loading holidays:', error);
    }
  };

  const updateAllowance = async (category, value) => {
    const newValue = parseInt(value) || 0;
    setAllowances({ ...allowances, [category]: newValue });

    try {
      await supabase
        .from('allowances')
        .upsert({
          user_id: session.user.id,
          category,
          total: newValue
        }, {
          onConflict: 'user_id,category'
        });
    } catch (error) {
      console.error('Error updating allowance:', error);
    }
  };

  const addHoliday = async (year, month, day, category, status) => {
    const dateStr = formatDate(year, month, day);
    
    try {
      const { data, error } = await supabase
        .from('holidays')
        .insert({
          user_id: session.user.id,
          category,
          days: 1,
          status,
          date: dateStr
        })
        .select()
        .single();

      if (error) throw error;

      setHolidays([...holidays, {
        id: data.id,
        category: data.category,
        days: data.days,
        status: data.status,
        date: data.date
      }]);
    } catch (error) {
      console.error('Error adding holiday:', error);
    }
  };

  const deleteHoliday = async (id) => {
    try {
      await supabase
        .from('holidays')
        .delete()
        .eq('id', id);

      setHolidays(holidays.filter(h => h.id !== id));
    } catch (error) {
      console.error('Error deleting holiday:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getHolidayForDate = (dateStr) => {
    return holidays.find(h => h.date === dateStr);
  };

  const determineStatus = (year, month, day) => {
    const selectedDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today ? 'spent' : 'requested';
  };

  const canAddHoliday = (category) => {
    const stats = calculateStats(category);
    return stats.pending > 0;
  };

  const toggleHoliday = (year, month, day) => {
    const dateStr = formatDate(year, month, day);
    const existing = getHolidayForDate(dateStr);
    
    if (existing) {
      deleteHoliday(existing.id);
    } else {
      if (!canAddHoliday(selectedCategory)) return;
      const status = determineStatus(year, month, day);
      addHoliday(year, month, day, selectedCategory, status);
    }
  };

  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const previousYear = () => setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
  const nextYear = () => setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
  
  const selectMonth = (monthIndex) => {
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1));
    setShowYearView(false);
  };

  const handlePrint = () => {
    setShowPrintOptions(false);
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      // Reset isPrinting after print dialog closes
      setTimeout(() => setIsPrinting(false), 100);
    }, 100);
  };

  const calculateStats = (category) => {
    const categoryHolidays = holidays.filter(h => h.category === category);
    const spent = categoryHolidays.filter(h => h.status === 'spent').reduce((sum, h) => sum + h.days, 0);
    const requested = categoryHolidays.filter(h => h.status === 'requested').reduce((sum, h) => sum + h.days, 0);
    const total = allowances[category] || 0;
    const pending = total - spent - requested;
    return { total, spent, requested, pending };
  };

  const calculateTotals = () => {
    let totalAllowed = 0, totalSpent = 0, totalRequested = 0;
    categories.forEach(cat => {
      const stats = calculateStats(cat);
      totalAllowed += stats.total;
      totalSpent += stats.spent;
      totalRequested += stats.requested;
    });
    return { totalAllowed, totalSpent, totalRequested, totalPending: totalAllowed - totalSpent - totalRequested };
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Bank Holidays': 'bg-rose-500',
      'Birthday': 'bg-violet-500',
      'Vacation': 'bg-blue-500',
      'Volunteer Days': 'bg-emerald-500',
      'Wellness Days': 'bg-amber-500',
      'Winter Holidays': 'bg-cyan-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  const BatteryGauge = ({ percent }) => {
    const getColor = () => {
      if (percent >= 75) return 'from-green-500 to-green-600';
      if (percent >= 25) return 'from-amber-500 to-amber-600';
      return 'from-red-500 to-red-600';
    };
    const getBorderColor = () => percent === 0 ? 'border-red-500' : 'border-gray-400';
    const getTerminalColor = () => percent === 0 ? 'bg-red-500' : 'bg-gray-400';
    
    return (
      <div className={`relative w-16 h-8 border-2 ${getBorderColor()} rounded-md flex items-center transition-colors duration-300`}>
        <div className={`absolute right-0 top-1/2 transform translate-x-full -translate-y-1/2 w-1 h-4 ${getTerminalColor()} rounded-r transition-colors duration-300`} />
        <div className="w-full h-full p-0.5">
          <div 
            className={`h-full bg-gradient-to-r ${getColor()} rounded transition-all duration-300`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading your data...</div>
      </div>
    );
  }

  const totals = calculateTotals();
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 p-2 sm:p-6">
      <style>{`
        @media print {
          /* Enable background colors for printing */
          body { 
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Basic print styles */
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .bg-gradient-to-br { background: white !important; }
          .shadow-lg { box-shadow: none !important; }
          button { pointer-events: none; }
          
          /* CRITICAL: Prevent page breaks within calendar section */
          .calendar-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: auto !important;
            break-before: auto !important;
            display: block !important;
          }
          
          /* Ensure calendar background container doesn't break */
          .calendar-section .bg-gray-50 {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Scale down calendar to fit A4 page */
          .calendar-section {
            transform: scale(0.85);
            transform-origin: top center;
            margin-bottom: -2rem !important;
          }
          
          /* Year view: make more compact */
          .calendar-section .grid.grid-cols-2,
          .calendar-section .grid.grid-cols-3 {
            gap: 0.25rem !important;
            padding: 0.5rem !important;
          }
          
          /* Month view: ensure single page */
          .calendar-section .grid.grid-cols-7 {
            font-size: 0.875rem !important;
          }
          
          /* Reduce padding in calendar section for print */
          .calendar-section .bg-gray-50 {
            padding: 0.75rem !important;
          }
          
          /* Category breakdown: prevent orphaning */
          .bg-white.rounded-lg {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Allow page break before calendar if needed */
          .calendar-section {
            page-break-before: auto !important;
          }
          
          /* Ensure total allowance cards don't break */
          .grid.grid-cols-2.gap-2 {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
        .print-only { display: none; }
      `}</style>
      
      {/* Floating Action Buttons - Print and Logout */}
      <div className="no-print fixed top-4 right-4 z-50 flex flex-col gap-3">
        <button
          onClick={() => {
            setShowPrintOptions(!showPrintOptions);
            if (showPrintOptions) {
              setPrintIncludeTotals(false);
              setPrintIncludeBreakdown(false);
              setPrintIncludeEntries(false);
            }
          }}
          className="bg-white hover:bg-gray-50 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 group"
          title="Print options"
        >
          <Printer className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
        </button>
        <button
          onClick={handleSignOut}
          className="bg-white hover:bg-red-50 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200 group"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors" />
        </button>
      </div>
      
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 rounded-lg blur-md opacity-45"></div>
                <div className="relative bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 rounded-lg p-2 shadow">
                  <CalendarSearch className="w-5 h-5 text-white" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-gray-800">Holiday Tracker</h1>
            </div>
          </div>

          {showBackToTop && (
            <button
              onClick={scrollToTop}
              className="no-print fixed bottom-4 right-4 bg-white text-gray-700 p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all hover:scale-110 z-50"
              title="Back to top"
            >
              <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          {showPrintOptions && (
            <div className="no-print fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Print Options</h3>
                <div className="space-y-3 mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printIncludeTotals}
                      onChange={(e) => setPrintIncludeTotals(e.target.checked)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-sm sm:text-base text-gray-700">Include Summary Totals</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printIncludeBreakdown}
                      onChange={(e) => setPrintIncludeBreakdown(e.target.checked)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-sm sm:text-base text-gray-700">Include Category Breakdown</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printIncludeEntries}
                      onChange={(e) => setPrintIncludeEntries(e.target.checked)}
                      className="w-5 h-5 text-blue-600"
                    />
                    <span className="text-sm sm:text-base text-gray-700">Include Holiday Entries</span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handlePrint}
                    className="flex-1 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-700 hover:via-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg transition-all text-sm sm:text-base shadow-md"
                  >
                    Print
                  </button>
                  <button
                    onClick={() => setShowPrintOptions(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {(!isPrinting || printIncludeTotals) && (
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6 sm:mb-8">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg p-3 sm:p-4 text-white">
                <div className="text-xs sm:text-sm opacity-90">Total Allowance</div>
                <div className="text-2xl sm:text-3xl font-bold">{totals.totalAllowed}</div>
                <div className="text-xs opacity-75">days</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 sm:p-4 text-white">
                <div className="text-xs sm:text-sm opacity-90">Days Spent</div>
                <div className="text-2xl sm:text-3xl font-bold">{totals.totalSpent}</div>
                <div className="text-xs opacity-75">days</div>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-3 sm:p-4 text-white">
                <div className="text-xs sm:text-sm opacity-90">Days Requested</div>
                <div className="text-2xl sm:text-3xl font-bold">{totals.totalRequested}</div>
                <div className="text-xs opacity-75">days</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg p-3 sm:p-4 text-white">
                <div className="text-xs sm:text-sm opacity-90">Days Remaining</div>
                <div className="text-2xl sm:text-3xl font-bold">{totals.totalPending}</div>
                <div className="text-xs opacity-75">days</div>
              </div>
            </div>
          )}

          {(!isPrinting || printIncludeBreakdown) && (
            <div className="category-breakdown">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Category Breakdown</h2>
              <div className="overflow-x-auto mb-6 sm:mb-8 -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <table className="w-full text-sm sm:text-base">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-700 font-semibold">Category</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-gray-700 font-semibold">Total</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-gray-700 font-semibold">Spent</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-gray-700 font-semibold">Req.</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-gray-700 font-semibold">Rem.</th>
                        <th className="text-center py-2 sm:py-3 px-2 sm:px-4 text-gray-700 font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(category => {
                        const stats = calculateStats(category);
                        const percentRemaining = stats.total > 0 ? (stats.pending / stats.total) * 100 : 0;
                        
                        return (
                          <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-800 text-xs sm:text-base">{category}</td>
                            <td className="text-center py-2 sm:py-3 px-2 sm:px-4">
                              <input
                                type="number"
                                value={stats.total}
                                onChange={(e) => updateAllowance(category, e.target.value)}
                                className="no-print w-12 sm:w-16 text-center border border-gray-300 rounded px-1 sm:px-2 py-1 text-sm"
                                min="0"
                              />
                              <span className="print-only">{stats.total}</span>
                            </td>
                            <td className="text-center py-2 sm:py-3 px-2 sm:px-4 text-green-600 font-semibold">{stats.spent}</td>
                            <td className="text-center py-2 sm:py-3 px-2 sm:px-4 text-amber-600 font-semibold">{stats.requested}</td>
                            <td className="text-center py-2 sm:py-3 px-2 sm:px-4 text-blue-600 font-semibold">{stats.pending}</td>
                            <td className="py-2 sm:py-3 px-1 sm:px-2 flex justify-center">
                              <BatteryGauge percent={percentRemaining} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="calendar-section">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Add Holidays</h2>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div className="w-full sm:w-auto no-print">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-auto border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {categories.map(cat => {
                    const stats = calculateStats(cat);
                    const isDisabled = stats.pending <= 0;
                    return (
                      <option key={cat} value={cat} disabled={isDisabled}>
                        {cat} {isDisabled ? '(No days remaining)' : `(${stats.pending} remaining)`}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                {showYearView && (
                  <>
                    <button
                      onClick={previousYear}
                      className="no-print p-2 hover:bg-gray-200 rounded transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowYearView(false)}
                      className="no-print text-base sm:text-lg font-semibold text-gray-800 min-w-32 sm:min-w-48 text-center hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {currentDate.getFullYear()}
                    </button>
                    <span className="print-only text-lg font-semibold text-gray-800 min-w-48 text-center">
                      {currentDate.getFullYear()}
                    </span>
                    <button
                      onClick={nextYear}
                      className="no-print p-2 hover:bg-gray-200 rounded transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
                {!showYearView && (
                  <>
                    <button
                      onClick={previousMonth}
                      className="no-print p-2 hover:bg-gray-200 rounded transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowYearView(true)}
                      className="no-print text-base sm:text-lg font-semibold text-gray-800 min-w-32 sm:min-w-48 text-center hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {monthName}
                    </button>
                    <span className="print-only text-lg font-semibold text-gray-800 min-w-48 text-center">
                      {monthName}
                    </span>
                    <button
                      onClick={nextMonth}
                      className="no-print p-2 hover:bg-gray-200 rounded transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {!showYearView && (
              <div className="month-calendar bg-white rounded-lg p-2 sm:p-4">
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                  {daysOfWeek.map(day => (
                    <div key={day} className="text-center font-semibold text-gray-600 text-xs sm:text-sm py-1 sm:py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {[...Array(startingDayOfWeek)].map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square"></div>
                  ))}
                  {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1;
                    const dateStr = formatDate(year, month, day);
                    const holiday = getHolidayForDate(dateStr);
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                    const canAdd = !holiday && canAddHoliday(selectedCategory);
                    
                    return (
                      <button
                        key={day}
                        onClick={() => toggleHoliday(year, month, day)}
                        disabled={!holiday && !canAdd}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs sm:text-sm transition-all ${
                          canAdd || holiday ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-50'
                        } ${
                          holiday
                            ? `${getCategoryColor(holiday.category)} text-white font-semibold shadow-md`
                            : isToday
                            ? 'bg-blue-50 border-2 border-blue-500 text-gray-800 font-semibold'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <span>{day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {showYearView && (
              <div className="bg-white rounded-lg p-2 sm:p-4">
                <div className="year-view-grid grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  {monthNames.map((monthName, monthIndex) => {
                    const monthDate = new Date(currentDate.getFullYear(), monthIndex, 1);
                    const monthInfo = getDaysInMonth(monthDate);
                    const monthYear = monthDate.getFullYear();
                    
                    return (
                      <div 
                        key={monthName}
                        onClick={() => selectMonth(monthIndex)}
                        className={`cursor-pointer p-2 sm:p-3 rounded-lg transition-all hover:shadow-md bg-gray-50 hover:bg-gray-100`}
                      >
                        <div className={`text-center font-semibold mb-2 text-xs sm:text-sm text-gray-700`}>
                          {monthName}
                        </div>
                        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                          {[...Array(monthInfo.startingDayOfWeek)].map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square"></div>
                          ))}
                          {[...Array(monthInfo.daysInMonth)].map((_, i) => {
                            const day = i + 1;
                            const dateStr = formatDate(monthYear, monthIndex, day);
                            const holiday = getHolidayForDate(dateStr);
                            
                            return (
                              <div
                                key={day}
                                className={`aspect-square rounded flex items-center justify-center text-xs ${
                                  holiday
                                    ? `${getCategoryColor(holiday.category)} text-white`
                                    : 'text-gray-400'
                                }`}
                              >
                                {day}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
              {categories.map(cat => (
                <div key={cat} className="flex items-center gap-2">
                  <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded ${getCategoryColor(cat)}`}></div>
                  <span className="text-xs sm:text-sm text-gray-700">{cat}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs sm:text-sm text-gray-600">
              Click on a day to add/remove a holiday.
            </div>
          </div>
          </div>

          {(!isPrinting || printIncludeEntries) && (
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Holiday Entries</h2>
              <div className="space-y-2">
                {holidays.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">No holidays added yet</div>
                ) : (
                  holidays.sort((a, b) => new Date(b.date) - new Date(a.date)).map(holiday => (
                    <div key={holiday.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className={`w-3 h-3 rounded-full ${getCategoryColor(holiday.category)} flex-shrink-0 mt-1`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-sm sm:text-base mb-1">{holiday.category}</div>
                            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
                              <span>{holiday.date}</span>
                              <span>•</span>
                              <span className="font-semibold text-gray-800">{holiday.days} day{holiday.days > 1 ? 's' : ''}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                holiday.status === 'spent' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {holiday.status.charAt(0).toUpperCase() + holiday.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteHoliday(holiday.id)}
                          className="no-print text-red-500 hover:text-red-700 p-1 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;