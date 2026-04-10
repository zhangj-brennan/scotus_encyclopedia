function getStateAbbr(value) {
  const raw = safe(value);
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (TILE_POSITIONS[upper]) return upper;
  if (STATE_ABBR[raw]) return STATE_ABBR[raw];
  const title = raw.toLowerCase().split(' ').map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '').join(' ');
  return STATE_ABBR[title] || '';
}
function getCartogramTileStyles(count, maxCount, isActive) {
  if (!count || maxCount <= 0) {
    return {
      background: isActive ? 'var(--accent)' : '#fff',
      color: isActive ? '#fff' : '#555',
      borderColor: isActive ? 'var(--text)' : 'var(--border)'
    };
  }

  const t = maxCount > 1 ? count / maxCount : 1;
  const lightness = isActive
    ? Math.max(28, 52 - t * 18)
    : Math.max(42, 92 - t * 38);

  return {
    background: `hsl(351, 78%, ${lightness}%)`,
    color: '#111',
    borderColor: isActive ? 'var(--text)' : 'var(--border)'
  };
}
function setButtonGroupActiveState(container, activeSet) {
  const buttons = container.querySelectorAll('[data-filter-value]');
  buttons.forEach(btn => {
    const value = btn.dataset.filterValue || '';
    btn.classList.toggle('active', activeSet.has(value));
  });
}
function buildDropdown(selectEl, values, currentValue) {
  selectEl.innerHTML = '';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'All presidents';
  selectEl.appendChild(defaultOpt);

  values.forEach(value => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    if (value === currentValue) opt.selected = true;
    selectEl.appendChild(opt);
  });
}
function buildToggleButtons(container, values, activeSet, onClick, countsMap = null) {
  container.innerHTML = '';

  values.forEach(value => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.filterValue = value;
    btn.className = 'filter-btn' + (activeSet.has(value) ? ' active' : '');

    const count = countsMap ? (countsMap.get(value) || 0) : null;
    btn.textContent = count != null ? `${value} (${count})` : value;

    btn.addEventListener('click', () => onClick(value));
    container.appendChild(btn);
  });
}
function buildHistogramList(container, items, activeSet, onClick, emptyLabel) {
  container.innerHTML = '';

  debugGroup('[DEBUG buildHistogramList]', {
    containerId: container.id,
    itemCount: items.length,
    activeValues: [...activeSet],
    items
  });

  if (!items.length) {
    container.innerHTML = `<div class="empty">${emptyLabel}</div>`;
    return;
  }

  const maxCount = Math.max(...items.map(item => item[1]), 1);

  container.style.display = 'grid';
  container.style.gap = '2px';

  items.forEach(([label, count]) => {
    const isActive = activeSet.has(label);

    const rowBtn = document.createElement('button');
    rowBtn.type = 'button';
    rowBtn.dataset.filterValue = label;
    rowBtn.className = 'degree-histogram-row';
    rowBtn.style.position = 'relative';
    rowBtn.style.display = 'grid';
    rowBtn.style.gridTemplateColumns = '1fr auto';
    rowBtn.style.alignItems = 'center';
    rowBtn.style.gap = '10px';
    rowBtn.style.width = '100%';
    rowBtn.style.padding = '3px 8px';
    rowBtn.style.border = '1px solid var(--border)';
    rowBtn.style.background = isActive ? 'var(--accent-soft)' : '#fff';
    rowBtn.style.color = 'var(--text)';
    rowBtn.style.cursor = 'pointer';
    rowBtn.style.textAlign = 'left';
    rowBtn.style.overflow = 'hidden';

    const bar = document.createElement('div');
    bar.className = 'degree-histogram-bar';
    bar.style.position = 'absolute';
    bar.style.left = '0';
    bar.style.top = '0';
    bar.style.bottom = '0';
    bar.style.width = `${(count / maxCount) * 100}%`;
    bar.style.background = isActive ? 'var(--accent)' : 'var(--accent-soft)';
    bar.style.pointerEvents = 'none';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'degree-histogram-label';
    labelSpan.textContent = label;
    labelSpan.style.position = 'relative';
    labelSpan.style.zIndex = '1';
    labelSpan.style.fontSize = '11px';
    labelSpan.style.fontWeight = '700';
    labelSpan.style.lineHeight = '1';
    labelSpan.style.whiteSpace = 'nowrap';
    labelSpan.style.overflow = 'hidden';
    labelSpan.style.textOverflow = 'ellipsis';
    labelSpan.style.color = isActive ? '#fff' : 'var(--text)';

    const countSpan = document.createElement('span');
    countSpan.className = 'degree-histogram-count';
    countSpan.textContent = count;
    countSpan.style.position = 'relative';
    countSpan.style.zIndex = '1';
    countSpan.style.fontSize = '11px';
    countSpan.style.fontWeight = '700';
    countSpan.style.lineHeight = '1';
    countSpan.style.whiteSpace = 'nowrap';
    countSpan.style.color = isActive ? '#fff' : 'var(--text)';

    rowBtn.addEventListener('click', () => onClick(label));

    rowBtn.appendChild(bar);
    rowBtn.appendChild(labelSpan);
    rowBtn.appendChild(countSpan);
    container.appendChild(rowBtn);
  });
}
function buildStateCartogramFilter(container, values, activeSet, onClick, countsMap = new Map()) {
  container.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'state-cartogram-grid';

  const valuesByAbbr = new Map();
  values.forEach(v => {
    const abbr = getStateAbbr(v);
    if (abbr) valuesByAbbr.set(abbr, v);
  });

  const maxCount = Math.max(0, ...Array.from(countsMap.values()));
  const positions = Object.values(TILE_POSITIONS);
  const maxX = positions.length ? Math.max(...positions.map(pos => pos[0])) : 0;
  const maxY = positions.length ? Math.max(...positions.map(pos => pos[1])) : 0;
  grid.style.gridTemplateColumns = `repeat(${maxX + 1}, minmax(16px, 1fr))`;

  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x <= maxX; x++) {
      const found = Object.entries(TILE_POSITIONS).find(([, pos]) => pos[0] === x && pos[1] === y);
      const tile = document.createElement('button');
      tile.type = 'button';

      if (!found) {
        tile.className = 'state-cartogram-tile empty';
        tile.disabled = true;
        tile.textContent = '';
      } else {
        const [abbr] = found;
        const actualValue = valuesByAbbr.get(abbr) || '';
        const fallbackLabel = STATE_NAME_BY_ABBR[abbr] || abbr;
        const displayValue = actualValue || fallbackLabel;
        const count = actualValue ? (countsMap.get(actualValue) || 0) : 0;
        const isActive = actualValue ? activeSet.has(actualValue) : false;
        const styles = getCartogramTileStyles(count, maxCount, isActive);

        tile.dataset.filterValue = displayValue;
        tile.className = 'state-cartogram-tile' + (isActive ? ' active' : '');
        tile.title = `${displayValue} (${count})`;
        tile.style.display = 'flex';
        tile.style.flexDirection = 'column';
        tile.style.alignItems = 'center';
        tile.style.justifyContent = 'center';
        tile.style.gap = '1px';
        tile.style.background = styles.background;
        tile.style.color = styles.color;
        tile.style.borderColor = styles.borderColor;
        tile.style.opacity = actualValue ? '1' : '0.65';
        tile.disabled = !actualValue;
        tile.style.cursor = actualValue ? 'pointer' : 'default';

        const abbrEl = document.createElement('span');
        abbrEl.textContent = abbr;
        abbrEl.style.fontSize = '9px';
        abbrEl.style.fontWeight = '700';
        abbrEl.style.lineHeight = '1';

        const countEl = document.createElement('span');
        countEl.textContent = count;
        countEl.style.fontSize = '8px';
        countEl.style.lineHeight = '1';

        tile.appendChild(abbrEl);
        tile.appendChild(countEl);

        if (actualValue) {
          tile.addEventListener('click', () => onClick(actualValue));
        }
      }

      grid.appendChild(tile);
    }
  }

  const legend = document.createElement('div');
  legend.className = 'state-cartogram-legend';
  legend.textContent = activeSet.size
    ? `Selected: ${Array.from(activeSet).join(', ')}`
    : 'Click states to filter.';

  container.appendChild(grid);
  container.appendChild(legend);
}
function syncStaticControlStates() {
  setButtonGroupActiveState(els.courtTypeButtons, filters.courtTypes);
  setButtonGroupActiveState(els.partyButtons, filters.parties);

  const stateButtons = els.birthStateButtons.querySelectorAll('.state-cartogram-tile[data-filter-value]');
  stateButtons.forEach(btn => {
    const value = btn.dataset.filterValue || '';
    btn.classList.toggle('active', filters.birthStates.has(value));
  });

  const legend = els.birthStateButtons.querySelector('.state-cartogram-legend');
  if (legend) {
    legend.textContent = filters.birthStates.size
      ? `Selected: ${Array.from(filters.birthStates).join(', ')}`
      : 'Click states to filter.';
  }

  els.presidentSelect.value = filters.president;
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function updateRangeBandPosition(which, minIndex, maxIndex, stackWidth, maxDomainIndex) {
  const band = rangeBands[which];
  if (!band) return;

  const startRatio = maxDomainIndex > 0 ? minIndex / maxDomainIndex : 0;
  const endRatio = maxDomainIndex > 0 ? maxIndex / maxDomainIndex : 1;

  band.style.display = 'block';
  band.style.left = `${startRatio * stackWidth}px`;
  band.style.width = `${Math.max(8, (endRatio - startRatio) * stackWidth)}px`;
}
function createRangeBand(which) {
  const stack = which === 'confirm'
    ? els.confirmMin.closest('.range-stack')
    : els.termMin.closest('.range-stack');

  if (!stack) return null;

  const band = document.createElement('div');
  band.className = 'range-drag-band';
  band.dataset.which = which;
  band.style.position = 'absolute';
  band.style.top = '9px';
  band.style.height = '4px';
  band.style.background = 'var(--accent)';
  band.style.cursor = 'grab';
  band.style.zIndex = '2';
  band.style.borderRadius = '0';
  band.style.pointerEvents = 'auto';

  stack.appendChild(band);

  let dragState = null;

  const commitDrag = () => {
    if (!dragState) return;
    dragState = null;
    band.style.cursor = 'grab';
    applyFilters();
  };

  const onPointerMove = e => {
    if (!dragState) return;

    dragState.lastClientX = e.clientX;
    if (dragState.rafPending) return;

    dragState.rafPending = true;
    requestAnimationFrame(() => {
      if (!dragState) return;

      dragState.rafPending = false;

      const dx = dragState.lastClientX - dragState.startX;
      const deltaSteps = Math.round(dx / dragState.stepWidth);
      const span = dragState.startMax - dragState.startMin;

      let nextMin = dragState.startMin + deltaSteps;
      nextMin = clamp(nextMin, 0, dragState.maxIndex - span);
      const nextMax = nextMin + span;

      if (which === 'confirm') {
        filters.confirmMin = nextMin;
        filters.confirmMax = nextMax;
        els.confirmMin.value = nextMin;
        els.confirmMax.value = nextMax;
      } else {
        filters.termMin = nextMin;
        filters.termMax = nextMax;
        els.termMin.value = nextMin;
        els.termMax.value = nextMax;
      }

      updateRangeBandPosition(which, nextMin, nextMax, dragState.stackWidth, dragState.maxIndex);
      updateRangeLabels();
    });
  };

  const onPointerUp = () => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    if (!dragState) return;

    if (dragState.rafPending) {
      requestAnimationFrame(commitDrag);
    } else {
      commitDrag();
    }
  };

  band.addEventListener('pointerdown', e => {
    const domain = which === 'confirm' ? confirmDomain : termDomain;
    if (!domain.length) return;

    const minIndex = which === 'confirm' ? Number(filters.confirmMin) : Number(filters.termMin);
    const maxIndex = which === 'confirm' ? Number(filters.confirmMax) : Number(filters.termMax);
    const maxDomainIndex = domain.length - 1;
    const stackWidth = stack.clientWidth;
    const stepWidth = maxDomainIndex > 0 ? stackWidth / maxDomainIndex : stackWidth;

    dragState = {
      startX: e.clientX,
      lastClientX: e.clientX,
      startMin: minIndex,
      startMax: maxIndex,
      maxIndex: maxDomainIndex,
      stackWidth,
      stepWidth: stepWidth || 1,
      rafPending: false
    };

    band.style.cursor = 'grabbing';
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  });

  return band;
}
function updateRangeBand(which) {
  const band = rangeBands[which];
  if (!band) return;

  const domain = which === 'confirm' ? confirmDomain : termDomain;
  const minIndex = which === 'confirm' ? Number(filters.confirmMin) : Number(filters.termMin);
  const maxIndex = which === 'confirm' ? Number(filters.confirmMax) : Number(filters.termMax);

  if (!domain.length || minIndex == null || maxIndex == null) {
    band.style.display = 'none';
    return;
  }

  const minInput = which === 'confirm' ? els.confirmMin : els.termMin;
  const maxInput = which === 'confirm' ? els.confirmMax : els.termMax;
  const stack = minInput.closest('.range-stack');

  if (!stack) {
    band.style.display = 'none';
    return;
  }

  const stackWidth = stack.clientWidth;
  const maxDomainIndex = domain.length - 1;

  updateRangeBandPosition(which, minIndex, maxIndex, stackWidth, maxDomainIndex);

  minInput.style.zIndex = '3';
  maxInput.style.zIndex = '3';
}
function initRangeBands() {
  if (!rangeBands.confirm) rangeBands.confirm = createRangeBand('confirm');
  if (!rangeBands.term) rangeBands.term = createRangeBand('term');
  updateRangeBand('confirm');
  updateRangeBand('term');
}
function setRangeDomain(which, values) {
  if (!values.length) {
    updateRangeBand(which);
    return;
  }

  const min = 0;
  const max = values.length - 1;
  const minEl = which === 'confirm' ? els.confirmMin : els.termMin;
  const maxEl = which === 'confirm' ? els.confirmMax : els.termMax;

  minEl.min = min;
  minEl.max = max;
  maxEl.min = min;
  maxEl.max = max;

  if (which === 'confirm') {
    if (filters.confirmMin == null) filters.confirmMin = min;
    if (filters.confirmMax == null) filters.confirmMax = max;
    minEl.value = filters.confirmMin;
    maxEl.value = filters.confirmMax;
  } else {
    if (filters.termMin == null) filters.termMin = min;
    if (filters.termMax == null) filters.termMax = max;
    minEl.value = filters.termMin;
    maxEl.value = filters.termMax;
  }

  updateRangeLabels();
  updateRangeBand(which);
}
function updateRangeLabels() {
  els.confirmMinLabel.textContent = confirmDomain.length
    ? formatDateLabel(confirmDomain[Number(filters.confirmMin)])
    : '—';
  els.confirmMaxLabel.textContent = confirmDomain.length
    ? formatDateLabel(confirmDomain[Number(filters.confirmMax)])
    : '—';
  els.termMinLabel.textContent = termDomain.length
    ? formatDateLabel(termDomain[Number(filters.termMin)])
    : '—';
  els.termMaxLabel.textContent = termDomain.length
    ? formatDateLabel(termDomain[Number(filters.termMax)])
    : '—';
}
function buildAllFilterControls() {
  const otherCourtTypes = uniqueSortedCourtTypes(rawRows);
  const courtTypeCounts = countCourtTypes(rawRows);
  const presidents = uniqueSortedValues(rawRows, COLS.president);
  const parties = uniqueSortedValues(rawRows, COLS.party);
  const birthStates = uniqueSortedValues(rawRows, COLS.birthState);

  debugGroup('[DEBUG buildAllFilterControls]', {
    otherCourtTypes,
    courtTypeCounts: [...courtTypeCounts.entries()],
    topSchoolCountsFromRawRows: getTopSchoolCounts(rawRows, 10),
    topLawSchoolCountsFromRawRows: getTopLawSchoolCounts(rawRows, 10),
    topDegreeCountsFromRawRows: getTopDegreeCounts(rawRows, 10),
    presidents,
    parties,
    birthStatesCount: birthStates.length
  });

  buildHistogramList(
    els.courtTypeButtons,
    [...courtTypeCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    filters.courtTypes,
    value => {
      if (filters.courtTypes.has(value)) filters.courtTypes.delete(value);
      else filters.courtTypes.add(value);
      debugLog('[DEBUG court type toggled]', { value, activeCourtTypes: [...filters.courtTypes] });
      applyFilters();
    },
    'No court type values available.'
  );

  buildDropdown(els.presidentSelect, presidents, filters.president);

  buildHistogramList(
    els.partyButtons,
    [...countValues(rawRows, COLS.party).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    filters.parties,
    value => {
      if (filters.parties.has(value)) filters.parties.delete(value);
      else filters.parties.add(value);
      debugLog('[DEBUG party toggled]', { value, activeParties: [...filters.parties] });
      applyFilters();
    },
    'No party values available.'
  );

  buildStateCartogramFilter(
    els.birthStateButtons,
    birthStates,
    filters.birthStates,
    value => {
      if (filters.birthStates.has(value)) filters.birthStates.delete(value);
      else filters.birthStates.add(value);
      syncStaticControlStates();
      debugLog('[DEBUG birth state toggled]', { value, activeBirthStates: [...filters.birthStates] });
      applyFilters();
    },
    countValues(filteredRows.length ? filteredRows : rawRows, COLS.birthState)
  );

  setRangeDomain('confirm', confirmDomain);
  setRangeDomain('term', termDomain);

  if (els.courtTypesCount) {
    els.courtTypesCount.textContent = otherCourtTypes.length.toLocaleString();
  }
  if (els.presidentsCount) {
    els.presidentsCount.textContent = presidents.length;
  }

  syncStaticControlStates();
}
function rowMatches(row) {
  if (filters.name) {
    const q = normalizeKey(filters.name);
    if (!normalizeKey(row.__name).includes(q)) return false;
  }

  if (filters.courtTypes.size) {
    const hasCourtTypeMatch = row.__courtTypes.some(value => filters.courtTypes.has(value));
    if (!hasCourtTypeMatch) return false;
  }

  if (filters.topSchools.size) {
    const hasSchoolMatch = row.__schoolValues.some(value => filters.topSchools.has(value));
    if (!hasSchoolMatch) return false;
  }

  if (filters.topLawSchools.size) {
    const hasLawSchoolMatch = row.__lawSchoolValues.some(value => filters.topLawSchools.has(value));
    if (!hasLawSchoolMatch) return false;
  }

  if (filters.topDegrees.size) {
    const hasDegreeMatch = row.__degreeValues.some(value => filters.topDegrees.has(value));
    if (!hasDegreeMatch) return false;
  }

  if (filters.president) {
    if (safe(getCell(row, COLS.president)) !== filters.president) return false;
  }

  if (filters.parties.size) {
    if (!filters.parties.has(safe(getCell(row, COLS.party)))) return false;
  }

  if (filters.birthStates.size) {
    if (!filters.birthStates.has(safe(getCell(row, COLS.birthState)))) return false;
  }

  if (confirmDomain.length && row.__confirmMs != null) {
    const minMs = confirmDomain[Number(filters.confirmMin)];
    const maxMs = confirmDomain[Number(filters.confirmMax)];
    if (row.__confirmMs < minMs || row.__confirmMs > maxMs) return false;
  }

  if (termDomain.length && row.__termMs != null) {
    const minMs = termDomain[Number(filters.termMin)];
    const maxMs = termDomain[Number(filters.termMax)];
    if (row.__termMs < minMs || row.__termMs > maxMs) return false;
  }

  return true;
}
function applyFilters() {
  filteredRows = rawRows.filter(rowMatches);

  debugGroup('[DEBUG applyFilters]', {
    totalRows: rawRows.length,
    filteredRows: filteredRows.length,
    activeFilters: {
      name: filters.name,
      courtTypes: [...filters.courtTypes],
      topSchools: [...filters.topSchools],
      topLawSchools: [...filters.topLawSchools],
      topDegrees: [...filters.topDegrees],
      president: filters.president,
      parties: [...filters.parties],
      birthStates: [...filters.birthStates],
      confirmMin: filters.confirmMin,
      confirmMax: filters.confirmMax,
      termMin: filters.termMin,
      termMax: filters.termMax
    },
    topSchoolCountsFiltered: getTopSchoolCounts(filteredRows, 10),
    topLawSchoolCountsFiltered: getTopLawSchoolCounts(filteredRows, 10),
    topDegreeCountsFiltered: getTopDegreeCounts(filteredRows, 10)
  });

  renderSummary();
  renderTopLists();
  renderTable();
  buildStateCartogramFilter(
    els.birthStateButtons,
    uniqueSortedValues(rawRows, COLS.birthState),
    filters.birthStates,
    value => {
      if (filters.birthStates.has(value)) filters.birthStates.delete(value);
      else filters.birthStates.add(value);
      syncStaticControlStates();
      debugLog('[DEBUG birth state toggled]', { value, activeBirthStates: [...filters.birthStates] });
      applyFilters();
    },
    countValues(filteredRows, COLS.birthState)
  );
  syncStaticControlStates();
  updateRangeLabels();
  updateRangeBand('confirm');
  updateRangeBand('term');
}
function renderSummary() {
  els.totalRows.textContent = rawRows.length.toLocaleString();
  els.filteredRows.textContent = filteredRows.length.toLocaleString();
}
function ensureTopFiltersGrid() {
  let grid = document.getElementById('topFiltersGrid');
  if (grid) return grid;

  const parent = els.topSchools.parentNode;
  if (!parent) return null;

  const schoolPlaceholder = document.createElement('div');
  schoolPlaceholder.id = 'topSchoolsCol';
  schoolPlaceholder.style.minWidth = '0';

  const lawPlaceholder = document.createElement('div');
  lawPlaceholder.id = 'topLawSchoolsCol';
  lawPlaceholder.style.minWidth = '0';

  const degreePlaceholder = document.createElement('div');
  degreePlaceholder.id = 'topDegreesCol';
  degreePlaceholder.style.minWidth = '0';

  const gridEl = document.createElement('div');
  gridEl.id = 'topFiltersGrid';
  gridEl.style.display = 'grid';
  gridEl.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
  gridEl.style.gap = '12px';
  gridEl.style.alignItems = 'start';
  gridEl.style.width = '100%';

  gridEl.appendChild(schoolPlaceholder);
  gridEl.appendChild(lawPlaceholder);
  gridEl.appendChild(degreePlaceholder);

  parent.insertBefore(gridEl, els.topSchools);

  schoolPlaceholder.appendChild(els.topSchools);
  degreePlaceholder.appendChild(els.topDegrees);

  const styleId = 'top-filters-grid-mobile-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media (max-width: 900px) {
        #topFiltersGrid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  return gridEl;
}
function ensureLawSchoolContainer() {
  let lawContainer = document.getElementById('topLawSchools');
  if (lawContainer) return lawContainer;

  ensureTopFiltersGrid();

  lawContainer = document.createElement('div');
  lawContainer.id = 'topLawSchools';
  lawContainer.style.minWidth = '0';

  const lawCol = document.getElementById('topLawSchoolsCol');
  if (lawCol) lawCol.appendChild(lawContainer);

  return lawContainer;
}
function renderTopLists() {
  ensureTopFiltersGrid();
  const lawContainer = ensureLawSchoolContainer();

  const topSchools = getTopSchoolCounts(filteredRows, 10);
  const topLawSchools = getTopLawSchoolCounts(filteredRows, 10);
  const topDegrees = getTopDegreeCounts(filteredRows, 10);

  debugGroup('[DEBUG renderTopLists]', {
    topSchools,
    topLawSchools,
    topDegrees,
    activeTopSchoolFilters: [...filters.topSchools],
    activeTopLawSchoolFilters: [...filters.topLawSchools],
    activeTopDegreeFilters: [...filters.topDegrees]
  });

  buildHistogramList(
    els.topSchools,
    topSchools,
    filters.topSchools,
    value => {
      if (filters.topSchools.has(value)) filters.topSchools.delete(value);
      else filters.topSchools.add(value);
      debugLog('[DEBUG top school toggled]', { value, activeTopSchools: [...filters.topSchools] });
      applyFilters();
    },
    'No non-law school values available.'
  );

  buildHistogramList(
    lawContainer,
    topLawSchools,
    filters.topLawSchools,
    value => {
      if (filters.topLawSchools.has(value)) filters.topLawSchools.delete(value);
      else filters.topLawSchools.add(value);
      debugLog('[DEBUG top law school toggled]', { value, activeTopLawSchools: [...filters.topLawSchools] });
      applyFilters();
    },
    'No law school values available.'
  );

  buildHistogramList(
    els.topDegrees,
    topDegrees,
    filters.topDegrees,
    value => {
      if (filters.topDegrees.has(value)) filters.topDegrees.delete(value);
      else filters.topDegrees.add(value);
      debugLog('[DEBUG top degree toggled]', { value, activeTopDegrees: [...filters.topDegrees] });
      applyFilters();
    },
    'No degree values available.'
  );
}
function clearFilters() {
  filters.name = '';
  filters.courtTypes = new Set();
  filters.topSchools = new Set();
  filters.topLawSchools = new Set();
  filters.topDegrees = new Set();
  filters.president = '';
  filters.parties = new Set();
  filters.birthStates = new Set();
  filters.confirmMin = confirmDomain.length ? 0 : null;
  filters.confirmMax = confirmDomain.length ? confirmDomain.length - 1 : null;
  filters.termMin = termDomain.length ? 0 : null;
  filters.termMax = termDomain.length ? termDomain.length - 1 : null;

  els.nameSearch.value = '';
  els.presidentSelect.value = '';

  if (confirmDomain.length) {
    els.confirmMin.value = filters.confirmMin;
    els.confirmMax.value = filters.confirmMax;
  }

  if (termDomain.length) {
    els.termMin.value = filters.termMin;
    els.termMax.value = filters.termMax;
  }

  syncStaticControlStates();
  debugLog('[DEBUG clearFilters]');
  applyFilters();
}
function downloadFilteredCsv() {
  if (!filteredRows.length) return;

  const exportRows = filteredRows.map(row => ({ ...row }));
  exportRows.forEach(row => {
    delete row.__name;
    delete row.__birthDate;
    delete row.__birthState;
    delete row.__genderRace;
    delete row.__education;
    delete row.__schoolValues;
    delete row.__lawSchoolValues;
    delete row.__degreeValues;
    delete row.__courtTypes;
    delete row.__confirmMs;
    delete row.__termMs;
  });

  const csv = Papa.unparse(exportRows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filtered_judicial_table.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
const CSV_URL = "data.csv";
function loadCsvFromUrl(url, label = 'CSV loaded') {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    })
    .then(text => {
      debugGroup('[DEBUG raw CSV text]', {
        label,
        textLength: text.length,
        first500Chars: text.slice(0, 500)
      });

      const parsed = Papa.parse(text, {
        header: false,
        skipEmptyLines: true
      });

      debugGroup('[DEBUG Papa parsed matrix]', {
        rowCount: parsed.data.length,
        parseErrors: parsed.errors,
        firstRowLength: (parsed.data[0] || []).length,
        secondRowLength: (parsed.data[1] || []).length,
        firstRow: parsed.data[0] || null,
        secondRow: parsed.data[1] || null
      });

      const rows = rowsFromParsedMatrix(parsed.data);

      els.fileName.textContent = `${label} • ${rows.length.toLocaleString()} rows`;

      debugGroup('[DEBUG CSV loaded]', {
        label,
        rowCount: rows.length,
        fields: Object.keys(rows[0] || {}),
        firstRow: rows[0] || null
      });

      processRows(rows);
    })
    .catch(err => {
      alert(`Could not load CSV: ${err.message}`);
    });
}
els.downloadBtn.addEventListener('click', downloadFilteredCsv);
els.clearBtn.addEventListener('click', clearFilters);

els.nameSearch.addEventListener('input', e => {
  filters.name = e.target.value;
  debugLog('[DEBUG name filter changed]', filters.name);
  applyFilters();
});

els.presidentSelect.addEventListener('change', e => {
  filters.president = e.target.value;
  debugLog('[DEBUG president filter changed]', filters.president);
  applyFilters();
});

els.confirmMin.addEventListener('input', e => {
  let v = Number(e.target.value);
  if (v > Number(filters.confirmMax)) v = Number(filters.confirmMax);
  filters.confirmMin = v;
  els.confirmMin.value = v;
  updateRangeBand('confirm');
  debugLog('[DEBUG confirmMin changed]', v);
  applyFilters();
});

els.confirmMax.addEventListener('input', e => {
  let v = Number(e.target.value);
  if (v < Number(filters.confirmMin)) v = Number(filters.confirmMin);
  filters.confirmMax = v;
  els.confirmMax.value = v;
  updateRangeBand('confirm');
  debugLog('[DEBUG confirmMax changed]', v);
  applyFilters();
});

els.termMin.addEventListener('input', e => {
  let v = Number(e.target.value);
  if (v > Number(filters.termMax)) v = Number(filters.termMax);
  filters.termMin = v;
  els.termMin.value = v;
  updateRangeBand('term');
  debugLog('[DEBUG termMin changed]', v);
  applyFilters();
});

els.termMax.addEventListener('input', e => {
  let v = Number(e.target.value);
  if (v < Number(filters.termMin)) v = Number(filters.termMin);
  filters.termMax = v;
  els.termMax.value = v;
  updateRangeBand('term');
  debugLog('[DEBUG termMax changed]', v);
  applyFilters();
});

window.addEventListener('resize', () => {
  updateRangeBand('confirm');
  updateRangeBand('term');
});

loadCsvFromUrl(CSV_URL, 'Hardwired CSV');