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
  terminationDate: 'Termination Date (1)',
  professionalCareer: 'Professional Career',
  ayesNays: 'Ayes/Nays (1)'
};

const SCHOOL_COLS = ['School (1)', 'School (2)', 'School (3)', 'School (4)', 'School (5)'];
const DEGREE_COLS = ['Degree (1)', 'Degree (2)', 'Degree (3)', 'Degree (4)', 'Degree (5)'];
const DEGREE_YEAR_COLS = ['Degree Year (1)', 'Degree Year (2)', 'Degree Year (3)', 'Degree Year (4)', 'Degree Year (5)'];
const COURT_TYPE_COLS = ['Court Type (1)', 'Court Type (2)', 'Court Type (3)'];
const DEFAULT_COURT_TYPE = 'Supreme Court';

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

const DEBUG = true;

function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

function debugGroup(label, value) {
  if (!DEBUG) return;
  console.group(label);
  console.log(value);
  console.groupEnd();
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

const els = {
  fileName: document.getElementById('fileName'),
  downloadBtn: document.getElementById('downloadBtn'),
  clearBtn: document.getElementById('clearBtn'),
  totalRows: document.getElementById('totalRows'),
  filteredRows: document.getElementById('filteredRows'),
  courtTypesCount: document.getElementById('courtTypesCount'),
  presidentsCount: document.getElementById('presidentsCount'),
  nameSearch: document.getElementById('nameSearch'),
  courtTypeButtons: document.getElementById('courtTypeButtons'),
  presidentSelect: document.getElementById('presidentSelect'),
  partyButtons: document.getElementById('partyButtons'),
  birthStateButtons: document.getElementById('birthStateButtons'),
  confirmMin: document.getElementById('confirmMin'),
  confirmMax: document.getElementById('confirmMax'),
  termMin: document.getElementById('termMin'),
  termMax: document.getElementById('termMax'),
  confirmMinLabel: document.getElementById('confirmMinLabel'),
  confirmMaxLabel: document.getElementById('confirmMaxLabel'),
  termMinLabel: document.getElementById('termMinLabel'),
  termMaxLabel: document.getElementById('termMaxLabel'),
  topSchools: document.getElementById('topSchools'),
  topDegrees: document.getElementById('topDegrees'),
  tbody: document.querySelector('#dataTable tbody')
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

function parseDateValue(value) {
  const raw = safe(value);
  if (!raw) return null;

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.getTime();

  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const year = mdy[3].length === 2 ? Number(`19${mdy[3]}`) : Number(mdy[3]);
    const dt = new Date(year, Number(mdy[1]) - 1, Number(mdy[2]));
    if (!Number.isNaN(dt.getTime())) return dt.getTime();
  }

  if (/^\d{4}$/.test(raw)) {
    const dt = new Date(Number(raw), 0, 1);
    if (!Number.isNaN(dt.getTime())) return dt.getTime();
  }

  return null;
}

function formatDateLabel(ms) {
  if (ms == null || Number.isNaN(ms)) return '—';
  const d = new Date(ms);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
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
      return Object.values(row).some(v => safe(v));
    })
    .filter(row => getMultiValues(row, COURT_TYPE_COLS).includes(DEFAULT_COURT_TYPE))
    .map(row => {
      const out = { ...row };
      out.__name = formatName(row);
      out.__birthDate = formatBirthDate(row);
      out.__birthState = formatBirthState(row);
      out.__genderRace = formatGenderRace(row);
      out.__education = formatEducation(row);
      out.__schoolValues = getSchoolValues(row);
      out.__lawSchoolValues = getLawSchoolValues(row);
      out.__degreeValues = getDegreeValues(row);
      out.__courtTypes = getMultiValues(row, COURT_TYPE_COLS).filter(value => value !== DEFAULT_COURT_TYPE);
      out.__confirmMs = parseDateValue(getCell(row, COLS.confirmationDate));
      out.__termMs = parseDateValue(getCell(row, COLS.terminationDate));
      return out;
    });

  confirmDomain = [...new Set(rawRows.map(d => d.__confirmMs).filter(v => v != null))].sort((a, b) => a - b);
  termDomain = [...new Set(rawRows.map(d => d.__termMs).filter(v => v != null))].sort((a, b) => a - b);

  filters.confirmMin = confirmDomain.length ? 0 : null;
  filters.confirmMax = confirmDomain.length ? confirmDomain.length - 1 : null;
  filters.termMin = termDomain.length ? 0 : null;
  filters.termMax = termDomain.length ? termDomain.length - 1 : null;

  debugGroup('[DEBUG processRows normalized]', {
    normalizedRowCount: rawRows.length,
    firstNormalizedRow: rawRows[0] || null,
    firstFiveSchoolSamples: rawRows.slice(0, 5).map((row, index) => ({
      index,
      name: row.__name,
      schools: row.__schoolValues,
      lawSchools: row.__lawSchoolValues,
      degrees: row.__degreeValues,
      otherCourtTypes: row.__courtTypes
    })),
    datasetFilteredTo: DEFAULT_COURT_TYPE
  });

  buildAllFilterControls();
  initRangeBands();
  applyFilters();
}

function renderTable() {
  els.tbody.innerHTML = '';

  if (!filteredRows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" class="empty">No rows match the current filters.</td>`;
    els.tbody.appendChild(tr);
    return;
  }

  filteredRows.forEach(row => {
    const educationLines = row.__education.length
      ? row.__education.map(line => `<div>${escapeHtml(line)}</div>`).join('')
      : '<div class="empty">—</div>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Name">${escapeHtml(row.__name) || '<span class="empty">—</span>'}</td>
      <td data-label="Birth Date">${escapeHtml(row.__birthDate) || '<span class="empty">—</span>'}</td>
      <td data-label="Birth State">${escapeHtml(row.__birthState) || '<span class="empty">—</span>'}</td>
      <td data-label="Gender / Race or Ethnicity">${escapeHtml(row.__genderRace) || '<span class="empty">—</span>'}</td>
      <td data-label="Education">${educationLines}</td>
      <td data-label="Professional Career">${escapeHtml(safe(getCell(row, COLS.professionalCareer))) || '<span class="empty">—</span>'}</td>
      <td data-label="Ayes/Nays (1)">${escapeHtml(safe(getCell(row, COLS.ayesNays))) || '<span class="empty">—</span>'}</td>
    `;
    els.tbody.appendChild(tr);
  });
}
