import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import { ChevronLeft, ChevronRight, Trash2, Printer, LogOut, CalendarSearch, ArrowUp, Settings, ChevronDown, ChevronUp } from 'lucide-react';

const BatteryGauge = ({ percent }) => {
  const getColor = () => {
    if (percent > 60) return 'bg-green-500';
    if (percent > 30) return 'bg-yellow-500';
    if (percent > 10) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getBars = () => {
    const barCount = 4;
    const activeBars = Math.ceil((percent / 100) * barCount);
    return Array.from({ length: barCount }, (_, i) => (
      <div
        key={i}
        className={`w-1.5 sm:w-2 h-4 sm:h-6 rounded-sm ${
          i < activeBars ? getColor() : 'bg-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="flex gap-0.5 sm:gap-1 items-center border border-gray-300 rounded px-1 py-0.5">
      {getBars()}
    </div>
  );
};

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
  const [categories, setCategories] = useState([]);
  const [allowances, setAllowances] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 1));
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showYearView, setShowYearView] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printIncludeTotals, setPrintIncludeTotals] = useState(false);
  const [printIncludeBreakdown, setPrintIncludeBreakdown] = useState(false);
  const [printIncludeCalendar, setPrintIncludeCalendar] = useState(true);
  const [printIncludeEntries, setPrintIncludeEntries] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Category management states
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAllowance, setNewCategoryAllowance] = useState(0);
  const [newCategoryColor, setNewCategoryColor] = useState('bg-blue-500');
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  // Collapsible section states
  const [yearOverviewExpanded, setYearOverviewExpanded] = useState(true);
  const [calendarExpanded, setCalendarExpanded] = useState(true);
  const [categoryBreakdownExpanded, setCategoryBreakdownExpanded] = useState(false);
  const [holidayEntriesExpanded, setHolidayEntriesExpanded] = useState(false);

  const availableColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
    'bg-rose-500', 'bg-gray-500'
  ];

  useEffect(() => {
    loadCategories();
    loadHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load allowances when categories are loaded or when year changes
  useEffect(() => {
    if (categories.length > 0) {
      loadAllowances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, currentDate.getFullYear()]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name');

      if (error) throw error;

      if (data.length === 0) {
        await initializeDefaultCategories();
      } else {
        setCategories(data);
        if (data.length > 0 && !selectedCategory) {
          setSelectedCategory(data[0].name);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const initializeDefaultCategories = async () => {
    const defaultCategories = [
      { name: 'Bank Holidays', default_allowance: 13, color: 'bg-rose-500' },
      { name: 'Birthday', default_allowance: 0, color: 'bg-violet-500' },
      { name: 'Vacation', default_allowance: 25, color: 'bg-blue-500' },
      { name: 'Wellness', default_allowance: 3, color: 'bg-gray-500' },
      { name: 'Winter Holidays', default_allowance: 3, color: 'bg-cyan-500' }
    ];

    try {
      const categoriesToInsert = defaultCategories.map(cat => ({
        user_id: session.user.id,
        name: cat.name,
        default_allowance: cat.default_allowance,
        color: cat.color
      }));

      const { data, error } = await supabase
        .from('categories')
        .insert(categoriesToInsert)
        .select();

      if (error) throw error;
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0].name);
      }
    } catch (error) {
      console.error('Error initializing categories:', error);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const loadAllowances = async () => {
    try {
      const currentYear = currentDate.getFullYear();
      
      const { data, error } = await supabase
        .from('allowances')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('year', currentYear);

      if (error) throw error;

      const allowancesObj = {};
      
      // First, populate with data from database
      data.forEach(item => {
        allowancesObj[item.category] = item.total;
      });

      // Then, for categories without allowances, use default_allowance
      categories.forEach(cat => {
        if (allowancesObj[cat.name] === undefined) {
          allowancesObj[cat.name] = cat.default_allowance;
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
        .eq('user_id', session.user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error('Error loading holidays:', error);
    }
  };

  const deleteHoliday = async (id) => {
    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setHolidays(holidays.filter(h => h.id !== id));
    } catch (error) {
      console.error('Error deleting holiday:', error);
    }
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleAllowanceChange = async (categoryName, value) => {
    const parsedValue = parseInt(value) || 0;
    const currentYear = currentDate.getFullYear();
    
    // Update local state immediately for responsive UI
    setAllowances(prev => ({
      ...prev,
      [categoryName]: parsedValue
    }));
    
    try {
      // Check if allowance record exists
      const { data: existingData, error: fetchError } = await supabase
        .from('allowances')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('year', currentYear)
        .eq('category', categoryName)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('allowances')
          .update({ total: parsedValue })
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('allowances')
          .insert({
            user_id: session.user.id,
            year: currentYear,
            category: categoryName,
            total: parsedValue
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating allowance:', error);
      // Revert on error
      loadAllowances();
    }
  };

  const getDaysSpent = (categoryName, status) => {
    return holidays
      .filter(h => h.category === categoryName && h.status === status)
      .reduce((sum, h) => sum + h.days, 0);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const previousYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth()));
  };

  const nextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth()));
  };

  const selectMonth = (monthIndex) => {
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex));
    setShowYearView(false);
  };

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getHolidayForDate = (dateStr) => {
    return holidays.find(h => h.date === dateStr);
  };

  const toggleHoliday = async (year, month, day) => {
    const dateStr = formatDate(year, month, day);
    const existingHoliday = getHolidayForDate(dateStr);

    if (existingHoliday) {
      await deleteHoliday(existingHoliday.id);
    } else if (canAddHoliday(selectedCategory)) {
      try {
        const { data, error } = await supabase
          .from('holidays')
          .insert({
            user_id: session.user.id,
            date: dateStr,
            days: 1,
            category: selectedCategory,
            status: 'planned'
          })
          .select()
          .single();

        if (error) throw error;
        setHolidays([...holidays, data]);
      } catch (error) {
        console.error('Error adding holiday:', error);
      }
    }
  };

  const canAddHoliday = (categoryName) => {
    const allowance = allowances[categoryName] || 0;
    const plannedDays = getDaysSpent(categoryName, 'planned');
    const spentDays = getDaysSpent(categoryName, 'spent');
    return (plannedDays + spentDays) < allowance;
  };

  const getCategoryColor = (categoryName) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || 'bg-gray-500';
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const toggleAllPrintOptions = () => {
    const allChecked = printIncludeTotals && printIncludeBreakdown && printIncludeCalendar && printIncludeEntries;
    const newValue = !allChecked;
    
    setPrintIncludeTotals(newValue);
    setPrintIncludeBreakdown(newValue);
    setPrintIncludeCalendar(newValue);
    setPrintIncludeEntries(newValue);
  };  

  const saveCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      if (editingCategoryId) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: newCategoryName,
            default_allowance: newCategoryAllowance,
            color: newCategoryColor
          })
          .eq('id', editingCategoryId);

        if (error) throw error;
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert({
            user_id: session.user.id,
            name: newCategoryName,
            default_allowance: newCategoryAllowance,
            color: newCategoryColor
          });

        if (error) throw error;
      }

      // Reload categories
      await loadCategories();
      
      // Reset form
      setNewCategoryName('');
      setNewCategoryAllowance(0);
      setNewCategoryColor('bg-blue-500');
      setEditingCategoryId(null);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const editCategory = (category) => {
    setNewCategoryName(category.name);
    setNewCategoryAllowance(category.default_allowance);
    setNewCategoryColor(category.color);
    setEditingCategoryId(category.id);
  };

  const deleteCategory = async (categoryId, categoryName) => {
    // Check if category has holidays
    const hasHolidays = holidays.some(h => h.category === categoryName);
    
    if (hasHolidays) {
      if (!window.confirm(`Category "${categoryName}" has holidays associated with it. Delete anyway?`)) {
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      await loadCategories();
      await loadHolidays();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const getOverallStats = () => {
    let totalAllowance = 0;
    let totalSpent = 0;
    let totalPlanned = 0;

    categories.forEach(cat => {
      const allowance = allowances[cat.name] || 0;
      const spent = getDaysSpent(cat.name, 'spent');
      const planned = getDaysSpent(cat.name, 'planned');
      
      totalAllowance += allowance;
      totalSpent += spent;
      totalPlanned += planned;
    });

    return {
      totalAllowance,
      totalSpent,
      totalPlanned,
      totalRemaining: totalAllowance - totalSpent - totalPlanned
    };
  };

  const calculateStats = (categoryName) => {
    const total = allowances[categoryName] || 0;
    const spent = getDaysSpent(categoryName, 'spent');
    const planned = getDaysSpent(categoryName, 'planned');
    const remaining = total - spent - planned;
    
    return {
      total,
      spent,
      requested: planned,  // 'requested' matches the table header "Req."
      pending: remaining   // 'pending' for remaining days
    };
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const overallStats = getOverallStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { 
            background: white !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          .bg-gradient-to-br { background: white !important; }
          * { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Ensure calendar section fits on one page */
          .bg-white.rounded-xl.shadow-lg {
            page-break-inside: avoid !important;
            box-shadow: none !important;
            margin-bottom: 0 !important;
          }
          
          /* Monthly calendar */
          .month-calendar { 
            page-break-inside: avoid !important;
            padding: 0.5rem !important;
          }
          
          .month-calendar .grid {
            gap: 0.25rem !important;
          }
          
          /* Year view calendar */
          .year-view-grid { 
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 0.5rem !important;
            page-break-inside: avoid !important;
            padding: 0.5rem !important;
          }
          
          .year-view-grid > div {
            padding: 0.25rem !important;
          }
          
          .year-view-grid .grid-cols-7 {
            gap: 0.125rem !important;
          }
          
          .year-view-grid .text-xs {
            font-size: 0.625rem !important;
          }
          
          /* Reduce spacing in print */
          .container {
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
          }
          
          .mb-6, .sm\\:mb-8 {
            margin-bottom: 0.5rem !important;
          }
          
          .p-4, .sm\\:p-6 {
            padding: 0.5rem !important;
          }
          
          /* Scale down for print */
          @page {
            size: auto;
            margin: 10mm;
          }
          
          /* Ensure legend stays with calendar */
          .mt-4.flex.flex-wrap {
            margin-top: 0.5rem !important;
            page-break-before: avoid !important;
            font-size: 0.75rem !important;
          }
          
          .mt-2.text-xs {
            margin-top: 0.25rem !important;
            font-size: 0.7rem !important;
            page-break-before: avoid !important;
          }
          
          h1, h2 { 
            page-break-after: avoid !important;
            margin-bottom: 0.5rem !important;
          }
          
          /* Force calendar to scale to fit */
          .year-view-grid, .month-calendar {
            transform: scale(0.95);
            transform-origin: top center;
          }
        }
        .print-only { display: none; }
      `}</style>

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="no-print fixed bottom-8 right-8 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {showCategoryManager && (
        <div className="no-print fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategoryId ? 'Edit Category' : 'Add Category'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter category name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Allowance (days)
                </label>
                <input
                  type="number"
                  value={newCategoryAllowance}
                  onChange={(e) => setNewCategoryAllowance(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {availableColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-10 h-10 rounded-lg ${color} ${
                        newCategoryColor === color ? 'ring-2 ring-offset-2 ring-gray-800' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveCategory}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingCategoryId ? 'Update' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setShowCategoryManager(false);
                    setNewCategoryName('');
                    setNewCategoryAllowance(0);
                    setNewCategoryColor('bg-blue-500');
                    setEditingCategoryId(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <h3 className="font-medium mb-3">Existing Categories</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${cat.color}`}></div>
                      <span className="text-sm">{cat.name}</span>
                      <span className="text-xs text-gray-500">({cat.default_allowance} days)</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editCategory(cat)}
                        className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id, cat.name)}
                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrintOptions && (
        <div className="no-print fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Print Options</h2>
            
            <div className="mb-4 pb-3 border-b border-gray-200">
              <button
                onClick={toggleAllPrintOptions}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {(printIncludeTotals && printIncludeBreakdown && printIncludeCalendar && printIncludeEntries)
                  ? '✓ Deselect All'
                  : 'Select All'}
              </button>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={printIncludeTotals}
                  onChange={(e) => setPrintIncludeTotals(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Include Overview</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={printIncludeCalendar}
                  onChange={(e) => setPrintIncludeCalendar(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Include Calendar</span>
              </label>              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={printIncludeBreakdown}
                  onChange={(e) => setPrintIncludeBreakdown(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Include Category Breakdown</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={printIncludeEntries}
                  onChange={(e) => setPrintIncludeEntries(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Include Holiday Entries</span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handlePrint}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => setShowPrintOptions(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-40 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 no-print">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Holiday Tracker</h1>
                <p className="text-sm sm:text-base text-gray-600">{session.user.email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCategoryManager(true)}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
                  title="Manage Categories"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowPrintOptions(true)}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
                  title="Print"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="print-only container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Holiday Tracker</h1>
              <p className="text-sm sm:text-base text-gray-600">{session.user.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">

          {(!isPrinting || printIncludeTotals) && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 sm:p-6 mb-6 text-white shadow-lg">
              <div 
                className="flex items-center justify-between mb-4 cursor-pointer no-print"
                onClick={() => setYearOverviewExpanded(!yearOverviewExpanded)}
              >
                <div className="flex items-center gap-2">
                  <CalendarSearch className="w-6 h-6 sm:w-8 sm:h-8" />
                  <h2 className="text-xl sm:text-2xl font-bold">Year {currentDate.getFullYear()} Overview</h2>
                </div>
                {yearOverviewExpanded ? 
                  <ChevronUp className="w-5 h-5" /> : 
                  <ChevronDown className="w-5 h-5" />
                }
              </div>
              <div className="flex items-center gap-2 mb-4 print-only">
                <CalendarSearch className="w-6 h-6 sm:w-8 sm:h-8" />
                <h2 className="text-xl sm:text-2xl font-bold">Year {currentDate.getFullYear()} Overview</h2>
              </div>
              
              {yearOverviewExpanded && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                    <div className="text-xs sm:text-sm font-medium opacity-90 mb-1">Total Days</div>
                    <div className="text-xl sm:text-2xl font-bold">{overallStats.totalAllowance}</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                    <div className="text-xs sm:text-sm font-medium opacity-90 mb-1">Days Spent</div>
                    <div className="text-xl sm:text-2xl font-bold">{overallStats.totalSpent}</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                    <div className="text-xs sm:text-sm font-medium opacity-90 mb-1">Days Planned</div>
                    <div className="text-xl sm:text-2xl font-bold">{overallStats.totalPlanned}</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg p-3">
                    <div className="text-xs sm:text-sm font-medium opacity-90 mb-1">Days Remaining</div>
                    <div className="text-xl sm:text-2xl font-bold">{overallStats.totalRemaining}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(!isPrinting || printIncludeCalendar) && (
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
              <div className="mb-4">
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer no-print"
                  onClick={() => setCalendarExpanded(!calendarExpanded)}
                >
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Calendar</h2>
                  {calendarExpanded ? 
                    <ChevronUp className="w-5 h-5 text-gray-600" /> : 
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  }
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 print-only">Calendar</h2>
                
                {calendarExpanded && (
                  <>
                    <div className="flex items-center gap-2 sm:gap-4 mb-4 no-print">
                      <label htmlFor="category-select" className="text-sm sm:text-base text-gray-600">Select category:</label>
                      <select
                        id="category-select"
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                        className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <div className={`w-4 h-4 rounded ${getCategoryColor(selectedCategory)}`}></div>
                        <span className="text-xs sm:text-sm text-gray-600">
                          {getDaysSpent(selectedCategory, 'spent') + getDaysSpent(selectedCategory, 'planned')}/{allowances[selectedCategory] || 0} days
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center mb-4">
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
                        <div key={cat.id} className="flex items-center gap-2">
                          <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded ${getCategoryColor(cat.name)}`}></div>
                          <span className="text-xs sm:text-sm text-gray-700">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs sm:text-sm text-gray-600">
                      Click on a day to add/remove a holiday.
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {(!isPrinting || printIncludeBreakdown) && (
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
              <div 
                className="flex items-center justify-between mb-4 cursor-pointer no-print"
                onClick={() => setCategoryBreakdownExpanded(!categoryBreakdownExpanded)}
              >
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Category Breakdown</h2>
                {categoryBreakdownExpanded ? 
                  <ChevronUp className="w-5 h-5 text-gray-600" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                }
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 print-only">Category Breakdown</h2>
              
              {categoryBreakdownExpanded && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-sm font-medium text-blue-700">Year:</span>
                      <span className="text-sm font-bold text-blue-900">{currentDate.getFullYear()}</span>
                    </div>
                  </div>
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
                            const stats = calculateStats(category.name);
                            const percentRemaining = stats.total > 0 ? (stats.pending / stats.total) * 100 : 0;
                            
                            return (
                              <tr key={category.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-800 text-xs sm:text-base">{category.name}</td>
                                <td className="text-center py-2 sm:py-3 px-2 sm:px-4">
                                  <input
                                    type="number"
                                    value={stats.total}
                                    onChange={(e) => handleAllowanceChange(category.name, e.target.value)}
                                    className="no-print w-12 sm:w-16 text-center border border-gray-300 rounded px-1 sm:px-2 py-1 text-sm"
                                    min="0"
                                  />
                                  <span className="print-only">{stats.total}</span>
                                </td>
                                <td className="text-center py-2 sm:py-3 px-2 sm:px-4 text-red-600 font-semibold">{stats.spent}</td>
                                <td className="text-center py-2 sm:py-3 px-2 sm:px-4 text-amber-600 font-semibold">{stats.requested}</td>
                                <td className="text-center py-2 sm:py-3 px-2 sm:px-4 text-green-600 font-semibold">{stats.pending}</td>
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
                </>
              )}
            </div>
          )}          

          {(!isPrinting || printIncludeEntries) && (
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div 
                className="flex items-center justify-between mb-4 cursor-pointer no-print"
                onClick={() => setHolidayEntriesExpanded(!holidayEntriesExpanded)}
              >
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Holiday Entries</h2>
                {holidayEntriesExpanded ? 
                  <ChevronUp className="w-5 h-5 text-gray-600" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                }
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 print-only">Holiday Entries</h2>
              
              {holidayEntriesExpanded && (
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;