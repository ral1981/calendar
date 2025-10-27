import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Trash2, Printer } from 'lucide-react';

const HolidayTracker = () => {
  const categories = [
    'Bank Holidays',
    'Birthday',
    'Vacation',
    'Volunteer Days',
    'Wellness Days',
    'Winter Holidays'
  ].sort();

  const [allowances, setAllowances] = useState({
    'Bank Holidays': 8,
    'Volunteer Days': 2,
    'Wellness Days': 3,
    'Birthday': 1,
    'Vacation': 20,
    'Winter Holidays': 5
  });

  const [holidays, setHolidays] = useState([
    { id: 1, category: 'Vacation', days: 1, status: 'spent', date: '2025-03-15' },
    { id: 2, category: 'Bank Holidays', days: 1, status: 'spent', date: '2025-01-01' },
    { id: 3, category: 'Vacation', days: 1, status: 'requested', date: '2025-07-10' }
  ]);

  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 1)); // October 2025
  const [selectedCategory, setSelectedCategory] = useState('Bank Holidays');
  const [showYearView, setShowYearView] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printIncludeTotals, setPrintIncludeTotals] = useState(false);
  const [printIncludeBreakdown, setPrintIncludeBreakdown] = useState(false);
  const [printIncludeEntries, setPrintIncludeEntries] = useState(false);

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
      setHolidays(holidays.filter(h => h.id !== existing.id));
    } else {
      // Check if we can add more holidays of this category
      if (!canAddHoliday(selectedCategory)) {
        return; // Don't add if limit reached
      }
      
      const status = determineStatus(year, month, day);
      setHolidays([...holidays, {
        id: Date.now(),
        category: selectedCategory,
        days: 1,
        status: status,
        date: dateStr
      }]);
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const previousYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
  };

  const nextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
  };

  const selectMonth = (monthIndex) => {
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1));
    setShowYearView(false);
  };

  const handlePrint = () => {
    setShowPrintOptions(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const deleteHoliday = (id) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };

  const updateAllowance = (category, value) => {
    setAllowances({ ...allowances, [category]: parseInt(value) || 0 });
  };

  const calculateStats = (category) => {
    const categoryHolidays = holidays.filter(h => h.category === category);
    const spent = categoryHolidays
      .filter(h => h.status === 'spent')
      .reduce((sum, h) => sum + h.days, 0);
    const requested = categoryHolidays
      .filter(h => h.status === 'requested')
      .reduce((sum, h) => sum + h.days, 0);
    const total = allowances[category];
    const pending = total - spent - requested;
    
    return { total, spent, requested, pending };
  };

  const calculateTotals = () => {
    let totalAllowed = 0;
    let totalSpent = 0;
    let totalRequested = 0;
    
    categories.forEach(cat => {
      const stats = calculateStats(cat);
      totalAllowed += stats.total;
      totalSpent += stats.spent;
      totalRequested += stats.requested;
    });
    
    const totalPending = totalAllowed - totalSpent - totalRequested;
    
    return { totalAllowed, totalSpent, totalRequested, totalPending };
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Bank Holidays': 'bg-purple-500',
      'Volunteer Days': 'bg-green-500',
      'Wellness Days': 'bg-blue-500',
      'Birthday': 'bg-pink-500',
      'Vacation': 'bg-orange-500',
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
    
    const getBorderColor = () => {
      return percent === 0 ? 'border-red-500' : 'border-gray-400';
    };
    
    const getTerminalColor = () => {
      return percent === 0 ? 'bg-red-500' : 'bg-gray-400';
    };
    
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

  const totals = calculateTotals();
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .bg-gradient-to-br {
            background: white !important;
          }
          .shadow-lg {
            box-shadow: none !important;
          }
          .hover\\:scale-105:hover {
            transform: none !important;
          }
          button {
            pointer-events: none;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">Holiday Tracker</h1>
            </div>
            <button
              onClick={() => setShowPrintOptions(!showPrintOptions)}
              className="no-print flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
          </div>

          {/* Print Options Modal */}
          {showPrintOptions && (
            <div className="no-print fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Print Options</h3>
                <div className="space-y-3 mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printIncludeTotals}
                      onChange={(e) => setPrintIncludeTotals(e.target.checked)}
                      className="w-5 h-5 text-indigo-600"
                    />
                    <span className="text-gray-700">Include Summary Totals</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printIncludeBreakdown}
                      onChange={(e) => setPrintIncludeBreakdown(e.target.checked)}
                      className="w-5 h-5 text-indigo-600"
                    />
                    <span className="text-gray-700">Include Category Breakdown</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={printIncludeEntries}
                      onChange={(e) => setPrintIncludeEntries(e.target.checked)}
                      className="w-5 h-5 text-indigo-600"
                    />
                    <span className="text-gray-700">Include Holiday Entries</span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handlePrint}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Print
                  </button>
                  <button
                    onClick={() => setShowPrintOptions(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {(!showPrintOptions || printIncludeTotals) && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                <div className="text-sm opacity-90">Total Allowance</div>
                <div className="text-3xl font-bold">{totals.totalAllowed}</div>
                <div className="text-xs opacity-75">days</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
                <div className="text-sm opacity-90">Days Spent</div>
                <div className="text-3xl font-bold">{totals.totalSpent}</div>
                <div className="text-xs opacity-75">days</div>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-4 text-white">
                <div className="text-sm opacity-90">Days Requested</div>
                <div className="text-3xl font-bold">{totals.totalRequested}</div>
                <div className="text-xs opacity-75">days</div>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
                <div className="text-sm opacity-90">Days Remaining</div>
                <div className="text-3xl font-bold">{totals.totalPending}</div>
                <div className="text-xs opacity-75">days</div>
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {(!showPrintOptions || printIncludeBreakdown) && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Category Breakdown</h2>
              <div className="overflow-x-auto mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 text-gray-700 font-semibold">Category</th>
                      <th className="text-center py-3 px-4 text-gray-700 font-semibold">Total</th>
                      <th className="text-center py-3 px-4 text-gray-700 font-semibold">Spent</th>
                      <th className="text-center py-3 px-4 text-gray-700 font-semibold">Requested</th>
                      <th className="text-center py-3 px-4 text-gray-700 font-semibold">Remaining</th>
                      <th className="text-center py-3 px-4 text-gray-700 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(category => {
                      const stats = calculateStats(category);
                      const percentRemaining = stats.total > 0 ? (stats.pending / stats.total) * 100 : 0;
                      
                      return (
                        <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-800">{category}</td>
                          <td className="text-center py-3 px-4">
                            <input
                              type="number"
                              value={stats.total}
                              onChange={(e) => updateAllowance(category, e.target.value)}
                              className="no-print w-16 text-center border border-gray-300 rounded px-2 py-1"
                              min="0"
                            />
                            <span className="print-only">{stats.total}</span>
                          </td>
                          <td className="text-center py-3 px-4 text-green-600 font-semibold">{stats.spent}</td>
                          <td className="text-center py-3 px-4 text-amber-600 font-semibold">{stats.requested}</td>
                          <td className="text-center py-3 px-4 text-indigo-600 font-semibold">{stats.pending}</td>
                          <td className="py-3 px-2 flex justify-center">
                            <BatteryGauge percent={percentRemaining} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Calendar Section */}
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Holidays</h2>
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4 no-print">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
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
              </div>
              <div className="flex items-center gap-2">
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
                      className="no-print text-lg font-semibold text-gray-800 min-w-48 text-center hover:text-indigo-600 transition-colors cursor-pointer"
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
                      className="no-print text-lg font-semibold text-gray-800 min-w-48 text-center hover:text-indigo-600 transition-colors cursor-pointer"
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

            {/* Calendar Grid */}
            {!showYearView && (
              <div className="bg-white rounded-lg p-4">
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {daysOfWeek.map(day => (
                    <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
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
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all ${
                          canAdd || holiday ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-50'
                        } ${
                          holiday
                            ? `${getCategoryColor(holiday.category)} text-white font-semibold shadow-md`
                            : isToday
                            ? 'bg-indigo-100 border-2 border-indigo-500 text-gray-800 font-semibold'
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

            {/* Year View - All 12 Months */}
            {showYearView && (
              <div className="bg-white rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4">
                  {monthNames.map((monthName, monthIndex) => {
                    const monthDate = new Date(currentDate.getFullYear(), monthIndex, 1);
                    const monthInfo = getDaysInMonth(monthDate);
                    const monthYear = monthDate.getFullYear();
                    const isCurrentMonth = monthIndex === month && monthYear === year;
                    
                    return (
                      <div 
                        key={monthName}
                        onClick={() => selectMonth(monthIndex)}
                        className={`cursor-pointer p-3 rounded-lg transition-all hover:shadow-md ${
                          isCurrentMonth ? 'bg-indigo-50 border-2 border-indigo-400' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`text-center font-semibold mb-2 text-sm ${
                          isCurrentMonth ? 'text-indigo-600' : 'text-gray-700'
                        }`}>
                          {monthName}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
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

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3">
              {categories.map(cat => (
                <div key={cat} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${getCategoryColor(cat)}`}></div>
                  <span className="text-sm text-gray-700">{cat}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Click on a day to add/remove a holiday.
            </div>
          </div>

          {/* Holiday List */}
          <h2 className={`text-xl font-semibold text-gray-800 mb-4 ${!printIncludeEntries ? 'no-print' : ''}`}>Holiday Entries</h2>
          <div className={`space-y-2 ${!printIncludeEntries ? 'no-print' : ''}`}>
            {holidays.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No holidays added yet</div>
            ) : (
              holidays.sort((a, b) => new Date(b.date) - new Date(a.date)).map(holiday => (
                <div key={holiday.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-3 h-3 rounded-full ${getCategoryColor(holiday.category)}`}></div>
                    <div className="font-medium text-gray-800 w-40">{holiday.category}</div>
                    <div className="text-gray-600">{holiday.date}</div>
                    <div className="font-semibold text-gray-800">{holiday.days} day{holiday.days > 1 ? 's' : ''}</div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        holiday.status === 'spent' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {holiday.status.charAt(0).toUpperCase() + holiday.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteHoliday(holiday.id)}
                    className="no-print text-red-500 hover:text-red-700 p-2 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolidayTracker;
