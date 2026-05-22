// ============================================================
// AppState — shared state management for view transitions
// ============================================================

import { CODE_MAP } from './airports.js';

export function getAirport(code) {
  return CODE_MAP[code] || { code, city: code, name: code };
}

// The single shared application state
const AppState = {
  // Search criteria (populated on form submit)
  origin: 'PEK',
  dest: 'SYD',
  // ——— Two-tier date model ———
  // originalSearchDate: the date the user typed in the search form.
  //   Never changes after initial search — anchors trend data & "go home".
  // currentFocusDate: the date the user is *currently* viewing single-day
  //   flights for.  Defaults to originalSearchDate; changes when user
  //   clicks a date in the trend grid.
  originalSearchDate: '',
  currentFocusDate: '',
  departDate: '',        // convenience alias, kept in sync with currentFocusDate
  returnDate: '',
  tripType: 'oneway', // 'oneway' | 'roundtrip'

  // Results data
  singleDayData: null,
  trendData: null, // lazy-loaded on demand, cached after first fetch

  // UI state
  currentView: 'search', // 'search' | 'results'

  // ——— Methods ———

  setSearchParams({ origin, dest, departDate, returnDate, tripType }) {
    this.origin = origin;
    this.dest = dest;
    this.returnDate = returnDate;
    this.tripType = tripType;
    // Both dates start identical — trend is anchored to this forever
    this.originalSearchDate = departDate;
    this.currentFocusDate = departDate;
    this.departDate = departDate;
  },

  /** Set only the focus date (e.g. when clicking a trend-grid cell).
   *  originalSearchDate is left untouched so the trend panel stays anchored. */
  setFocusDate(dateStr) {
    this.currentFocusDate = dateStr;
    this.departDate = dateStr;
  },

  /** Return true when the user is browsing a date different from the original search. */
  isViewingDifferentDate() {
    return this.currentFocusDate !== this.originalSearchDate;
  },

  getSearchSummary() {
    const from = getAirport(this.origin);
    const to = getAirport(this.dest);
    return {
      from: { code: this.origin, city: from.city, name: from.name },
      to: { code: this.dest, city: to.city, name: to.name },
      departDate: this.currentFocusDate,
      originalSearchDate: this.originalSearchDate,
      returnDate: this.returnDate,
      tripType: this.tripType,
    };
  },

  /** Build a summary anchored to the original search date (for trend API calls). */
  getTrendAnchorSummary() {
    const from = getAirport(this.origin);
    const to = getAirport(this.dest);
    return {
      from: { code: this.origin, city: from.city, name: from.name },
      to: { code: this.dest, city: to.city, name: to.name },
      departDate: this.originalSearchDate,
      originalSearchDate: this.originalSearchDate,
      returnDate: this.returnDate,
      tripType: this.tripType,
    };
  },

  navigateTo(view) {
    this.currentView = view;
  },

  clearResults() {
    this.singleDayData = null;
    this.trendData = null;
  },
};

export default AppState;
