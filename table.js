const COLS = {
  lastName: 'Last Name',
  firstName: 'First Name',
  middleName: 'Middle Name',
  birthMonth: 'Birth Month',
  birthDay: 'Birth Day',
  birthYear: 'Birth Year',
  birthCity: 'Birth City',
  birthState: 'Birth State',
  gender: 'Gender',
  race: 'Race or Ethnicity',
  president: 'Appointing President (1)',
  party: 'Party of Appointing President (1)',
  confirmationDate: 'Confirmation Date (1)',
  // terminationDate: 'Termination Date (1)',
  professionalCareer: 'Professional Career',
  ayesNays: 'Ayes/Nays (1)'
};
let confirmHistogramBins = [];

const SCHOOL_COLS = ['School (1)', 'School (2)', 'School (3)', 'School (4)', 'School (5)'];
const DEGREE_COLS = ['Degree (1)', 'Degree (2)', 'Degree (3)', 'Degree (4)', 'Degree (5)'];
const DEGREE_YEAR_COLS = ['Degree Year (1)', 'Degree Year (2)', 'Degree Year (3)', 'Degree Year (4)', 'Degree Year (5)'];
const COURT_TYPE_COLS = ['Court Type (1)', 'Court Type (2)', 'Court Type (3)'];
const DEFAULT_COURT_TYPE = 'Supreme Court';
const COURT_NAME_COLS = [
  'Court Name (1)',
  'Court Name (2)',
  'Court Name (3)',
  'Court Name (4)',
  'Court Name (5)'
];

const CONFIRMATION_DATE_COLS = [
  'Confirmation Date (1)',
  'Confirmation Date (2)',
  'Confirmation Date (3)',
  'Confirmation Date (4)',
  'Confirmation Date (5)'
];
const TERMINATION_DATE_COLS = [
   'Termination Date (1)',
  'Termination Date (2)',
  'Termination Date (3)',
  'Termination Date (4)',
  'Termination Date (5)'
]

const SENIOR_STATUS_DATE_COLS = [
  'Senior Status Date (1)',
  'Senior Status Date (2)',
  'Senior Status Date (3)',
  'Senior Status Date (4)',
  'Senior Status Date (5)'
];

const PARTY_COLS = [
  'Party of Appointing President (1)',
  'Party of Appointing President (2)',
  'Party of Appointing President (3)',
  'Party of Appointing President (4)',
  'Party of Appointing President (5)'
];
const AYES_NAYS_COLS = [
  'Ayes/Nays (1)',
  'Ayes/Nays (2)',
  'Ayes/Nays (3)',
  'Ayes/Nays (4)',
  'Ayes/Nays (5)'
];

const SCOTUS_COURT_NAME = 'Supreme Court of the United States';

const STATE_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY',
  'District of Columbia':'DC',
  'American Samoa':'AS','Guam':'GU','Northern Mariana Islands':'MP','Puerto Rico':'PR','U.S. Virgin Islands':'VI',
  'american samoa':'AS','guam':'GU','northern mariana islands':'MP','puerto rico':'PR','u.s. virgin islands':'VI'
};

const STATE_NAME_BY_ABBR = Object.fromEntries(
  Object.entries(STATE_ABBR)
    .filter(([name]) => name === name.trim() && name[0] === name[0]?.toUpperCase())
    .map(([name, abbr]) => [abbr, name])
);

const DEBUG = false;

function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

function debugGroup(label, value) {
  if (!DEBUG) return;
  console.group(label);
  console.log(value);
  console.groupEnd();
}

function normalizeCourtName(value) {
  return safe(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function getCourtSlotIndex(row, targetCourtName) {
  const target = normalizeCourtName(targetCourtName);

  for (let i = 0; i < COURT_NAME_COLS.length; i++) {
    const courtName = normalizeCourtName(getCell(row, COURT_NAME_COLS[i]));
    if (courtName === target) return i;
  }

  return -1;
}

function getSlotMatchedValue(row, courtNameTarget, valueCols) {
  const slotIndex = getCourtSlotIndex(row, courtNameTarget);
  if (slotIndex === -1) return '';
  return safe(getCell(row, valueCols[slotIndex]));
}
function getAllScotusSlots(row, birthYear) {
  const slots = [];

  for (let i = 0; i < COURT_NAME_COLS.length; i++) {
    const courtName = normalizeCourtName(getCell(row, COURT_NAME_COLS[i]));
    if (courtName !== normalizeCourtName(SCOTUS_COURT_NAME)) continue;

    const confirmRaw = safe(getCell(row, CONFIRMATION_DATE_COLS[i]));
    const seniorRaw = safe(getCell(row, SENIOR_STATUS_DATE_COLS[i]));
    const terminationRaw = safe(getCell(row, TERMINATION_DATE_COLS[i]));
    const partyRaw = safe(getCell(row, PARTY_COLS[i]));

    const confirmMs = parseDateValue(confirmRaw, birthYear);
    const seniorMs = parseDateValue(seniorRaw, birthYear);
    const terminationMs = parseDateValue(terminationRaw, birthYear);

    slots.push({
      slot: i + 1,
      confirmRaw,
      seniorRaw,
      terminationRaw,
      partyRaw,
      confirmMs,
      seniorMs,
      terminationMs
    });
  }

  return slots;
}

function resolveScotusServiceDates(row, birthYear) {
  const slots = getAllScotusSlots(row, birthYear);

  const validConfirmSlots = slots.filter(s => s.confirmMs != null && !Number.isNaN(s.confirmMs));
  const validSeniorSlots = slots.filter(s => s.seniorMs != null && !Number.isNaN(s.seniorMs));

  const earliestConfirmSlot = validConfirmSlots.length
    ? validConfirmSlots.reduce((min, slot) => slot.confirmMs < min.confirmMs ? slot : min)
    : null;

  let endSlot = null;
let endRaw = '';
let endDisplay = '';
let termMs = null;

if (validSeniorSlots.length) {
  endSlot = validSeniorSlots.reduce((max, slot) => slot.seniorMs > max.seniorMs ? slot : max);
  endRaw = endSlot.seniorRaw;
  termMs = endSlot.seniorMs;
  endDisplay = termMs ? formatDateLabel(termMs) : '';
} else {
  const latestConfirmSlot = validConfirmSlots.length
    ? validConfirmSlots.reduce((best, slot) => {
        if (!best) return slot;
        return slot.confirmMs > best.confirmMs ? slot : best;
      }, null)
    : null;

  const latestConfirmWithTermination = validConfirmSlots
    .filter(slot => slot.terminationMs != null && !Number.isNaN(slot.terminationMs))
    .reduce((best, slot) => {
      if (!best) return slot;
      return slot.confirmMs > best.confirmMs ? slot : best;
    }, null);

  if (latestConfirmWithTermination) {
    endSlot = latestConfirmWithTermination;
    endRaw = latestConfirmWithTermination.terminationRaw;
    termMs = latestConfirmWithTermination.terminationMs;
    endDisplay = termMs ? formatDateLabel(termMs) : '';
  } else if (latestConfirmSlot) {
    endSlot = latestConfirmSlot;
    endRaw = 'Current';
    termMs = Date.now();
    endDisplay = formatDateLabel(termMs);
  }
}

  const startMs = earliestConfirmSlot ? earliestConfirmSlot.confirmMs : null;
  const startRaw = earliestConfirmSlot ? earliestConfirmSlot.confirmRaw : '';
  const partyRaw = earliestConfirmSlot ? earliestConfirmSlot.partyRaw : '';

  return {
    slots,
    startMs,
    startRaw,
    endMs,
    endRaw,
    partyRaw
  };
}
function getDecadeStartFromMs(ms) {
  if (ms == null || Number.isNaN(ms)) return null;
  const year = new Date(ms).getFullYear();
  return Math.floor(year / 10) * 10;
}

function buildConfirmHistogramBins(rows) {
  const counts = new Map();

  rows.forEach(row => {
    if (row.__confirmMs == null) return;
    const decade = getDecadeStartFromMs(row.__confirmMs);
    if (decade == null) return;
    counts.set(decade, (counts.get(decade) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([decade, count]) => ({ decade, count }));
}

function formatDecadeLabel(decade) {
  return `${decade}s`;
}

function parseTileGridFromScript(scriptId) {
  const el = document.getElementById(scriptId);
  if (!el) return {};

  const raw = el.textContent.replace(/\t/g, '    ').replace(/\r/g, '');
  const lines = raw.split('\n').filter(line => line.trim().length > 0);

  const positions = {};
  const cellWidth = 3;

  lines.forEach((line, y) => {
    for (let i = 0; i < line.length; i += cellWidth) {
      const token = line.slice(i, i + cellWidth).trim();
      if (/^[A-Z]{2}$/.test(token)) {
        const x = Math.floor(i / cellWidth);
        positions[token] = [x, y];
      }
    }
  });

  return positions;
}

const TILE_POSITIONS = parseTileGridFromScript('grid');

let rawRows = [];
let filteredRows = [];
let confirmDomain = [];
let termDomain = [];

const filters = {
  name: '',
  courtTypes: new Set(),
  topSchools: new Set(),
  topLawSchools: new Set(),
  topDegrees: new Set(),
  president: '',
  parties: new Set(),
  confirmMin: null,
  confirmMax: null,
  termMin: null,
  termMax: null,
  birthStates: new Set()
};

let currentSort = {
  type: 'name',
  direction: 1
};

function sortRows(rows) {
  rows.sort((a, b) => {
    if (currentSort.type === 'name') {
      const aLast = safe(getCell(a, COLS.lastName)).toLowerCase();
      const bLast = safe(getCell(b, COLS.lastName)).toLowerCase();

      if (aLast < bLast) return -1 * currentSort.direction;
      if (aLast > bLast) return 1 * currentSort.direction;

      const aFirst = safe(getCell(a, COLS.firstName)).toLowerCase();
      const bFirst = safe(getCell(b, COLS.firstName)).toLowerCase();

      if (aFirst < bFirst) return -1 * currentSort.direction;
      if (aFirst > bFirst) return 1 * currentSort.direction;

      return 0;
    }

    if (currentSort.type === 'confirm') {
      const aVal = a.__confirmMs ?? Number.POSITIVE_INFINITY;
      const bVal = b.__confirmMs ?? Number.POSITIVE_INFINITY;

      if (aVal < bVal) return -1 * currentSort.direction;
      if (aVal > bVal) return 1 * currentSort.direction;

      return 0;
    }

    if (currentSort.type === 'termLength') {
      const aVal = a.__termLengthYears ?? Number.POSITIVE_INFINITY;
      const bVal = b.__termLengthYears ?? Number.POSITIVE_INFINITY;

      if (aVal < bVal) return -1 * currentSort.direction;
      if (aVal > bVal) return 1 * currentSort.direction;

      return 0;
    }

    return 0;
  });
}

function createNullElement() {
  return {
    value: '',
    textContent: '',
    innerHTML: '',
    min: 0,
    max: 0,
    disabled: false,
    checked: false,
    dataset: {},
    style: {},
    className: '',
    classList: {
      add() {},
      remove() {},
      toggle() { return false; },
      contains() { return false; }
    },
    appendChild() {},
    insertBefore() {},
    removeChild() {},
    remove() {},
    setAttribute() {},
    getAttribute() { return null; },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {},
    blur() {},
    click() {},
    parentNode: null,
    clientWidth: 0
  };
}

function getEl(id) {
  return document.getElementById(id) || createNullElement();
}

function getQueryEl(selector) {
  return document.querySelector(selector) || createNullElement();
}

const els = {
  fileName: getEl('fileName'),
  downloadBtn: getEl('downloadBtn'),
  clearBtn: getEl('clearBtn'),
  totalRows: getEl('totalRows'),
  filteredRows: getEl('filteredRows'),
  courtTypesCount: getEl('courtTypesCount'),
  presidentsCount: getEl('presidentsCount'),
  nameSearch: getEl('nameSearch'),
  courtTypeButtons: getEl('courtTypeButtons'),
  presidentSelect: getEl('presidentSelect'),
  partyButtons: getEl('partyButtons'),
  birthStateButtons: getEl('birthStateButtons'),
  confirmMin: getEl('confirmMin'),
  confirmMax: getEl('confirmMax'),
  termMin: getEl('termMin'),
  termMax: getEl('termMax'),
  confirmMinLabel: getEl('confirmMinLabel'),
  confirmMaxLabel: getEl('confirmMaxLabel'),
  termMinLabel: getEl('termMinLabel'),
  termMaxLabel: getEl('termMaxLabel'),
  topSchools: getEl('topSchools'),
  topDegrees: getEl('topDegrees'),
  tbody: getQueryEl('#dataTable tbody')
};

const rangeBands = {
  confirm: null,
  term: null
};

function safe(v) {
  return v == null ? '' : String(v).trim();
}

function normalizeKey(v) {
  return safe(v).toLowerCase();
}

function normalizeHeaderName(key) {
  return String(key ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .trim();
}

function normalizeRowKeys(row) {
  const out = {};
  Object.keys(row || {}).forEach(key => {
    out[normalizeHeaderName(key)] = row[key];
  });
  return out;
}

function dedupeHeaders(headers) {
  const counts = new Map();

  return headers.map((header, index) => {
    const clean = normalizeHeaderName(header) || `__blank_${index}`;
    const seen = counts.get(clean) || 0;
    counts.set(clean, seen + 1);
    return seen === 0 ? clean : `${clean}__dup_${seen + 1}`;
  });
}

function rowsFromParsedMatrix(matrix) {
  if (!matrix.length) return [];

  const rawHeaders = matrix[0].map(normalizeHeaderName);
  const headers = dedupeHeaders(rawHeaders);
  const rows = [];

  for (let i = 1; i < matrix.length; i++) {
    const sourceRow = matrix[i] || [];
    const rowObj = {};

    headers.forEach((header, colIndex) => {
      rowObj[header] = sourceRow[colIndex] ?? '';
    });

    rows.push(rowObj);
  }

  debugGroup('[DEBUG rowsFromParsedMatrix]', {
    headerCount: headers.length,
    headers,
    rawHeaders,
    firstRowColumnCount: (matrix[1] || []).length,
    firstRowObject: rows[0] || null
  });

  return rows;
}

function getCell(row, key) {
  if (!row) return '';
  if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];

  const target = normalizeHeaderName(key);
  const foundKey = Object.keys(row).find(k => normalizeHeaderName(k) === target || normalizeHeaderName(k).startsWith(`${target}__dup_`));
  return foundKey ? row[foundKey] : '';
}

function normalizeMultiSlotValue(value) {
  return safe(value)
    .replace(/\s+/g, ' ')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

function splitCellValues(value) {
  const raw = normalizeMultiSlotValue(value);
  if (!raw) return [];

  return raw
    .split(/\s*(?:\||;)\s*/)
    .map(part => normalizeMultiSlotValue(part))
    .filter(Boolean);
}

function getMultiValues(row, cols) {
  const seen = new Set();

  cols.forEach(col => {
    const raw = getCell(row, col);
    splitCellValues(raw).forEach(value => seen.add(value));
  });

  return [...seen];
}

function isLawSchoolName(value) {
  return normalizeKey(value).includes('law school');
}

function getEducationEntries(row) {
  const entries = [];

  for (let i = 0; i < SCHOOL_COLS.length; i++) {
    const school = safe(getCell(row, SCHOOL_COLS[i]));
    const degree = safe(getCell(row, DEGREE_COLS[i]));
    const year = safe(getCell(row, DEGREE_YEAR_COLS[i]));

    if (!school && !degree && !year) continue;

    entries.push({
      slot: i,
      school,
      degree,
      year
    });
  }

  return entries;
}

function getSchoolValues(row) {
  const seen = new Set();

  SCHOOL_COLS.forEach(col => {
    const value = safe(getCell(row, col));
    if (value && !isLawSchoolName(value)) seen.add(value);
  });

  return [...seen];
}

function getLawSchoolValues(row) {
  const seen = new Set();

  SCHOOL_COLS.forEach(col => {
    const value = safe(getCell(row, col));
    if (value && isLawSchoolName(value)) seen.add(value);
  });

  return [...seen];
}

function getDegreeValues(row) {
  const seen = new Set();

  DEGREE_COLS.forEach(col => {
    const value = safe(getCell(row, col));
    if (value) seen.add(value);
  });

  return [...seen];
}

function uniqueSortedValues(rows, col) {
  return [...new Set(rows.map(r => safe(getCell(r, col))).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function uniqueSortedCourtTypes(rows) {
  const seen = new Set();
  rows.forEach(row => {
    (row.__courtTypes || []).forEach(value => {
      if (value && value !== DEFAULT_COURT_TYPE) seen.add(value);
    });
  });
  return [...seen].sort((a, b) => a.localeCompare(b));
}

function countCourtTypes(rows) {
  const counts = new Map();
  rows.forEach(row => {
    const seenInRow = new Set(row.__courtTypes || []);
    seenInRow.forEach(value => {
      if (!value || value === DEFAULT_COURT_TYPE) return;
      counts.set(value, (counts.get(value) || 0) + 1);
    });
  });
  return counts;
}

function countSimpleValuesFromColumns(rows, cols) {
  const counts = new Map();

  rows.forEach((row, rowIndex) => {
    const seenInRow = new Set();

    cols.forEach(col => {
      const value = safe(getCell(row, col));
      if (!value || seenInRow.has(value)) return;
      seenInRow.add(value);
      counts.set(value, (counts.get(value) || 0) + 1);
    });

    if (DEBUG && rowIndex < 5) {
      debugLog('[DEBUG column sample]', {
        rowIndex,
        name: row.__name || formatName(row),
        values: cols.map(col => ({ col, value: safe(getCell(row, col)) })),
        dedupedValues: [...seenInRow]
      });
    }
  });

  return counts;
}

function countValuesFromAccessor(rows, accessor) {
  const counts = new Map();

  rows.forEach((row, rowIndex) => {
    const seenInRow = new Set(accessor(row) || []);
    seenInRow.forEach(value => {
      if (!value) return;
      counts.set(value, (counts.get(value) || 0) + 1);
    });

    if (DEBUG && rowIndex < 5) {
      debugLog('[DEBUG accessor sample]', {
        rowIndex,
        name: row.__name || formatName(row),
        values: [...seenInRow]
      });
    }
  });

  return counts;
}

function countValues(rows, col) {
  const counts = new Map();
  rows.forEach(row => {
    const value = safe(getCell(row, col));
    if (!value) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return counts;
}

function getTopSchoolCounts(rows, limit = 10) {
  const counts = countValuesFromAccessor(rows, row => row.__schoolValues);
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);

  debugGroup('[DEBUG getTopSchoolCounts]', {
    rowCount: rows.length,
    uniqueSchoolCount: counts.size,
    topSchools: sorted
  });

  return sorted;
}

function getTopLawSchoolCounts(rows, limit = 10) {
  const counts = countValuesFromAccessor(rows, row => row.__lawSchoolValues);
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);

  debugGroup('[DEBUG getTopLawSchoolCounts]', {
    rowCount: rows.length,
    uniqueLawSchoolCount: counts.size,
    topLawSchools: sorted
  });

  return sorted;
}

function getTopDegreeCounts(rows, limit = 10) {
  const counts = countSimpleValuesFromColumns(rows, DEGREE_COLS);
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);

  debugGroup('[DEBUG getTopDegreeCounts]', {
    rowCount: rows.length,
    degreeColumns: DEGREE_COLS,
    uniqueDegreeCount: counts.size,
    topDegrees: sorted
  });

  return sorted;
}

function formatName(row) {
  return [
    safe(getCell(row, COLS.lastName)),
    safe(getCell(row, COLS.firstName)),
    safe(getCell(row, COLS.middleName))
  ]
    .filter(Boolean)
    .join(', ')
    .replace(/,\s*,/g, ', ')
    .replace(/,\s*$/, '');
}

function formatBirthDate(row) {
  return [
    safe(getCell(row, COLS.birthMonth)),
    safe(getCell(row, COLS.birthDay)),
    safe(getCell(row, COLS.birthYear))
  ]
    .filter(Boolean)
    .join(' ');
}

function formatBirthState(row) {
  return safe(getCell(row, COLS.birthState));
}

function formatGenderRace(row) {
  return [
    safe(getCell(row, COLS.gender)),
    safe(getCell(row, COLS.race))
  ]
    .filter(Boolean)
    .join(' / ');
}

function formatEducation(row) {
  return getEducationEntries(row).map(entry => {
    const bits = [];
    if (entry.school) bits.push(entry.school);
    if (entry.degree) bits.push(entry.degree);
    if (entry.year) bits.push(entry.year);
    return bits.join(' — ');
  });
}

function getAllSlotMatchedValues(row, courtNameTarget, valueCols) {
  const target = normalizeCourtName(courtNameTarget);
  const values = [];

  for (let i = 0; i < COURT_NAME_COLS.length; i++) {
    const courtName = normalizeCourtName(getCell(row, COURT_NAME_COLS[i]));
    if (courtName === target) {
      values.push(safe(getCell(row, valueCols[i])));
    }
  }

  return values.filter(Boolean);
}

function choosePlausibleYear(year, birthYear, minAge = 25, maxAge = 90) {
  if (!birthYear || Number.isNaN(Number(birthYear))) return year;

  const birth = Number(birthYear);
  let candidates = [year - 200, year - 100, year, year + 100, year + 200]
    .filter(y => y > birth);

  const preferred = candidates.find(y => {
    const age = y - birth;
    return age >= minAge && age <= maxAge;
  });

  if (preferred != null) return preferred;

  if (candidates.length) {
    candidates.sort((a, b) => (a - birth) - (b - birth));
    return candidates[0];
  }

  return year;
}

function parseDateValue(value, birthYear = null) {
  const raw = safe(value);
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    let year = Number(iso[1]);
    const month = Number(iso[2]) - 1;
    const day = Number(iso[3]);

    year = choosePlausibleYear(year, birthYear);

    const dt = new Date(year, month, day);
    if (!Number.isNaN(dt.getTime())) return dt.getTime();
  }

  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const month = Number(mdy[1]) - 1;
    const day = Number(mdy[2]);
    let year = Number(mdy[3]);

    if (mdy[3].length === 2) {
      year = 2000 + year;
    }

    year = choosePlausibleYear(year, birthYear);

    const dt = new Date(year, month, day);
    if (!Number.isNaN(dt.getTime())) return dt.getTime();
  }

  if (/^\d{4}$/.test(raw)) {
    let year = Number(raw);
    year = choosePlausibleYear(year, birthYear);

    const dt = new Date(year, 0, 1);
    if (!Number.isNaN(dt.getTime())) return dt.getTime();
  }

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    let year = d.getFullYear();
    year = choosePlausibleYear(year, birthYear);

    const repaired = new Date(year, d.getMonth(), d.getDate());
    if (!Number.isNaN(repaired.getTime())) return repaired.getTime();
  }

  return null;
}

function formatDateLabel(ms) {
  if (ms == null || Number.isNaN(ms)) return '—';
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTermLength(confirmMs, termMs) {
  if (confirmMs == null || termMs == null || Number.isNaN(confirmMs) || Number.isNaN(termMs) || termMs < confirmMs) {
    return '—';
  }

  const years = (termMs - confirmMs) / (1000 * 60 * 60 * 24 * 365.2425);

  if (years < 1) {
    return `${years.toFixed(1)} years`;
  }

  if (years < 10) {
    return `${years.toFixed(1)} years`;
  }

  return `${years.toFixed(1)} years`;
}

function escapeHtml(str) {
  return safe(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function processRows(rows) {
  debugGroup('[DEBUG processRows incoming]', {
    incomingRowCount: rows.length,
    firstIncomingRow: rows[0] || null,
    schoolColumns: SCHOOL_COLS,
    degreeColumns: DEGREE_COLS,
    courtTypeColumns: COURT_TYPE_COLS
  });

  rawRows = rows
    .map(normalizeRowKeys)
    .filter(row => {
      const isHeaderRow =
        safe(getCell(row, 'nid')).toLowerCase() === 'nid' ||
        safe(getCell(row, COLS.lastName)) === 'Last Name' ||
        safe(getCell(row, SCHOOL_COLS[0])) === 'School (1)' ||
        safe(getCell(row, DEGREE_COLS[0])) === 'Degree (1)' ||
        safe(getCell(row, COLS.professionalCareer)) === 'Professional Career';

      if (isHeaderRow) return false;
      return Object.values(row).some(value => safe(value) !== '');
    })
    .map(row => {
      const courtTypes = getMultiValues(row, COURT_TYPE_COLS);
      const schoolValues = getSchoolValues(row);
      const lawSchoolValues = getLawSchoolValues(row);
      const degreeValues = getDegreeValues(row);
      const educationLines = formatEducation(row);

      const birthYear = safe(getCell(row, COLS.birthYear));

      const scotusSlots = [];

      for (let i = 0; i < COURT_NAME_COLS.length; i++) {
        const courtName = normalizeCourtName(getCell(row, COURT_NAME_COLS[i]));
        if (courtName !== normalizeCourtName(SCOTUS_COURT_NAME)) continue;

      const confirmRaw = safe(getCell(row, CONFIRMATION_DATE_COLS[i]));
      const seniorRaw = safe(getCell(row, SENIOR_STATUS_DATE_COLS[i]));
      const terminationRaw = safe(getCell(row, TERMINATION_DATE_COLS[i]));
      const partyRaw = safe(getCell(row, PARTY_COLS[i]));
      const ayesNaysRaw = safe(getCell(row, AYES_NAYS_COLS[i]));

        const confirmMs = parseDateValue(confirmRaw, birthYear);
        const seniorMs = parseDateValue(seniorRaw, birthYear);
        const terminationMs = parseDateValue(terminationRaw, birthYear);

        scotusSlots.push({
          slot: i + 1,
          confirmRaw,
          seniorRaw,
          terminationRaw,
          partyRaw,
          ayesNaysRaw,
          confirmMs,
          seniorMs,
          terminationMs
        });
      }

      const validConfirmSlots = scotusSlots.filter(
        slot => slot.confirmMs != null && !Number.isNaN(slot.confirmMs)
      );

      const validSeniorSlots = scotusSlots.filter(
        slot => slot.seniorMs != null && !Number.isNaN(slot.seniorMs)
      );

      const earliestConfirm = validConfirmSlots.length
        ? validConfirmSlots.reduce((min, slot) => slot.confirmMs < min.confirmMs ? slot : min)
        : null;

     let endSlot = null;
let endRaw = '';
let endDisplay = '';
let termMs = null;

if (validSeniorSlots.length) {
  endSlot = validSeniorSlots.reduce((max, slot) => slot.seniorMs > max.seniorMs ? slot : max);
  endRaw = endSlot.seniorRaw;
  termMs = endSlot.seniorMs;
  endDisplay = termMs ? formatDateLabel(termMs) : '';
} else {
  const latestConfirmSlot = validConfirmSlots.length
    ? validConfirmSlots.reduce((best, slot) => {
        if (!best) return slot;
        return slot.confirmMs > best.confirmMs ? slot : best;
      }, null)
    : null;

  const latestConfirmWithTermination = validConfirmSlots
    .filter(slot => slot.terminationMs != null && !Number.isNaN(slot.terminationMs))
    .reduce((best, slot) => {
      if (!best) return slot;
      return slot.confirmMs > best.confirmMs ? slot : best;
    }, null);

  if (latestConfirmWithTermination) {
    endSlot = latestConfirmWithTermination;
    endRaw = latestConfirmWithTermination.terminationRaw;
    termMs = latestConfirmWithTermination.terminationMs;
    endDisplay = termMs ? formatDateLabel(termMs) : '';
  } else if (latestConfirmSlot) {
    endSlot = latestConfirmSlot;
    endRaw = 'Current';
    termMs = Date.now();
    endDisplay = formatDateLabel(termMs);
  }
}

      const confirmMs = earliestConfirm ? earliestConfirm.confirmMs : null;

      const termLengthYears =
        confirmMs != null &&
        termMs != null &&
        !Number.isNaN(confirmMs) &&
        !Number.isNaN(termMs) &&
        termMs >= confirmMs
          ? (termMs - confirmMs) / (1000 * 60 * 60 * 24 * 365.2425)
          : null;

      const scotusParty = earliestConfirm ? earliestConfirm.partyRaw : '';
      const scotusAyesNays = earliestConfirm ? earliestConfirm.ayesNaysRaw : '';

      debugLog('[DEBUG SCOTUS term dates]', {
        name: formatName(row),
        birthYear,
        scotusSlots: scotusSlots.map(slot => ({
          slot: slot.slot,
          confirmRaw: slot.confirmRaw,
          seniorRaw: slot.seniorRaw,
          terminationRaw: slot.terminationRaw,
          confirmLabel: slot.confirmMs ? formatDateLabel(slot.confirmMs) : null,
          seniorLabel: slot.seniorMs ? formatDateLabel(slot.seniorMs) : null,
          terminationLabel: slot.terminationMs ? formatDateLabel(slot.terminationMs) : null
        })),
        confirmMs,
        confirmLabel: confirmMs ? formatDateLabel(confirmMs) : null,
        termMs,
        termLabel: termMs ? formatDateLabel(termMs) : null
      });

      return {
        ...row,
        __name: formatName(row),
        __birthDate: formatBirthDate(row),
        __birthState: formatBirthState(row),
        __genderRace: formatGenderRace(row),
        __education: educationLines,
        __schoolValues: schoolValues,
        __lawSchoolValues: lawSchoolValues,
        __degreeValues: degreeValues,
        __courtTypes: courtTypes,
        __confirmRaw: earliestConfirm ? earliestConfirm.confirmRaw : '',
        __termRaw: endRaw,
        __confirmMs: confirmMs,
        __termMs: termMs,
        __termLengthYears: termLengthYears,
        __termLengthLabel: formatTermLength(confirmMs, termMs),
        __party: scotusParty,
        __ayesNays: scotusAyesNays,
        __allScotusConfirmRaw: scotusSlots.map(slot => slot.confirmRaw).filter(Boolean),
        __allScotusSeniorRaw: scotusSlots.map(slot => slot.seniorRaw).filter(Boolean),
        __allScotusTerminationRaw: scotusSlots.map(slot => slot.terminationRaw).filter(Boolean),
        __termDisplay: endDisplay
      };
    })
    .filter(row => row.__courtTypes.includes(DEFAULT_COURT_TYPE));

  filteredRows = [...rawRows];

  confirmDomain = [...new Set(rawRows.map(r => r.__confirmMs).filter(v => v != null))].sort((a, b) => a - b);
  termDomain = [...new Set(rawRows.map(r => r.__termMs).filter(v => v != null))].sort((a, b) => a - b);

  filters.confirmMin = confirmDomain.length ? 0 : null;
  filters.confirmMax = confirmDomain.length ? confirmDomain.length - 1 : null;
  filters.termMin = termDomain.length ? 0 : null;
  filters.termMax = termDomain.length ? termDomain.length - 1 : null;

  debugGroup('[DEBUG processRows output]', {
    rawRowCount: rawRows.length,
    firstProcessedRow: rawRows[0] || null,
    confirmDomainCount: confirmDomain.length,
    termDomainCount: termDomain.length,
    courtTypeSamples: rawRows.slice(0, 5).map(r => ({ name: r.__name, courtTypes: r.__courtTypes })),
    schoolSamples: rawRows.slice(0, 5).map(r => ({
      name: r.__name,
      schools: r.__schoolValues,
      lawSchools: r.__lawSchoolValues,
      degrees: r.__degreeValues
    }))
  });

  buildAllFilterControls();
  applyFilters();
  initRangeBands();
}

function renderTable() {
  els.tbody.innerHTML = '';

  if (!filteredRows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="2" class="empty">No rows match the current filters.</td>`;
    els.tbody.appendChild(tr);
    return;
  }

  filteredRows.forEach(row => {
    const educationLines = row.__education.length
      ? row.__education.map(line => `<div>${escapeHtml(line)}</div>`).join('')
      : '<div class="empty">—</div>';

    const rawCareer = safe(getCell(row, COLS.professionalCareer));
    const careerLines = rawCareer
      ? rawCareer
          .split(';')
          .map(part => part.trim())
          .filter(Boolean)
          .map(part => {
            const commaIndex = part.indexOf(',');
            if (commaIndex === -1) {
              return `
                <div class="career-line">
                  <span class="career-role">${escapeHtml(part)}</span>
                </div>
              `;
            }

            const role = part.slice(0, commaIndex).trim();
            const rest = part.slice(commaIndex + 1).trim();

            return `
              <div class="career-line">
                <span class="career-role">${escapeHtml(role)}</span><span class="career-rest">, ${escapeHtml(rest)}</span>
              </div>
            `;
          })
          .join('')
      : '<div class="empty">—</div>';

    const justiceStack = `
  <div class="justice-stack">
    <div class="justice-stack-item">
      <span class="justice-stack-label">Name</span>
      <span class="justice-stack-value justice-name">
        ${escapeHtml(row.__name) || '<span class="empty">—</span>'}
      </span>
    </div>

    <div class="justice-stack-item">
      <span class="justice-stack-label">Confirmed</span>
      <span class="justice-stack-value">
        ${
          row.__confirmMs
            ? formatDateLabel(row.__confirmMs)
            : '<span class="empty">—</span>'
        }
      </span>
    </div>

    <div class="justice-stack-item">
      <span class="justice-stack-label">Senior Status</span>
      <span class="justice-stack-value">
        ${
          row.__termMs
            ? formatDateLabel(row.__termMs)
            : '<span class="empty">—</span>'
        }
      </span>
    </div>

    <div class="justice-stack-item">
      <span class="justice-stack-label">Term Length</span>
      <span class="justice-stack-value">
        ${escapeHtml(row.__termLengthLabel || '—')}
      </span>
    </div>

    <div class="justice-stack-item">
      <span class="justice-stack-label">Confirm Raw</span>
      <span class="justice-stack-value">
        ${escapeHtml(row.__confirmRaw || '—')}
      </span>
    </div>

    <div class="justice-stack-item">
      <span class="justice-stack-label">Term Raw</span>
      <span class="justice-stack-value">
        ${escapeHtml(row.__termRaw || '—')}
      </span>
    </div>

    <div class="justice-stack-item">
      <span class="justice-stack-label">Born</span>
      <span class="justice-stack-value">
        ${
          (row.__birthDate || row.__birthState)
            ? `${escapeHtml(row.__birthDate || '')}${row.__birthDate && row.__birthState ? ', ' : ''}${escapeHtml(row.__birthState || '')}`
            : '<span class="empty">—</span>'
        }
      </span>
    </div>

    <div class="justice-stack-item">
      <span class="justice-stack-label">Gender / Race or Ethnicity</span>
      <span class="justice-stack-value">
        ${escapeHtml(row.__genderRace) || '<span class="empty">—</span>'}
      </span>
    </div>

    <div class="justice-stack-item">
      <span class="justice-stack-label">Ayes/Nays</span>
        <div class="ayes-box">
          ${escapeHtml(row.__ayesNays || '—')}
        </div>
    </div>
  </div>
`;

    const eduCareerStack = `
      <div class="edu-career-stack">
        <div class="edu-career-section">
          <span class="edu-career-label">Education</span>
          ${educationLines}
        </div>
        <div class="edu-career-section">
          <span class="edu-career-label">Professional Career</span>
          <div class="career-stack">${careerLines}</div>
        </div>
      </div>
    `;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Justice">${justiceStack}</td>
      <td data-label="Education & Career">${eduCareerStack}</td>
    `;
    els.tbody.appendChild(tr);
  });
}