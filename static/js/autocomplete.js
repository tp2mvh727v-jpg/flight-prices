// ============================================================
// Autocomplete — 智能模糊联想输入框组件
// 支持：中文、拼音全拼、拼音简拼、IATA 三字码多维度匹配
// ============================================================

import { AIRPORT_DB, CODE_MAP } from './airports.js';

export function createAutocomplete(inputEl, { onSelect, placeholder } = {}) {
  let selectedCode = '';
  let isOpen = false;
  let highlightIdx = -1;
  let currentResults = [];

  // ——— Build DOM ———
  const wrapper = document.createElement('div');
  wrapper.className = 'ac-wrapper';
  inputEl.parentNode.insertBefore(wrapper, inputEl);
  wrapper.appendChild(inputEl);

  // M6: Clear button
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'ac-clear-btn';
  clearBtn.innerHTML = '&times;';
  clearBtn.title = '清除选择';
  clearBtn.style.display = 'none';
  clearBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    selectedCode = '';
    inputEl.value = '';
    hiddenInput.value = '';
    clearBtn.style.display = 'none';
    inputEl.focus();
    if (onSelect) onSelect({ code: '', city: '', name: '' });
  });
  wrapper.appendChild(clearBtn);

  // Hidden input to hold the actual airport code
  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.className = 'ac-hidden';
  wrapper.appendChild(hiddenInput);

  // Dropdown — appended to body to escape any ancestor overflow/backdrop-filter clipping
  const dropdown = document.createElement('ul');
  dropdown.className = 'ac-dropdown';
  dropdown.setAttribute('role', 'listbox');
  dropdown.setAttribute('aria-label', '搜索建议');
  document.body.appendChild(dropdown);

  // Apply autocomplete styling to input
  inputEl.classList.add('ac-input');
  inputEl.setAttribute('autocomplete', 'off');
  inputEl.setAttribute('aria-autocomplete', 'list');
  inputEl.setAttribute('role', 'combobox');
  if (placeholder) inputEl.placeholder = placeholder;

  // ——— Matching ———
  function matchAirport(query, apt) {
    const q = query.toLowerCase().replace(/\s+/g, '');
    if (!q) return false;

    // Multi-dimensional fuzzy match (case-insensitive)
    const targets = [
      apt.city,                    // 中文：上海
      apt.city.toLowerCase(),      // (冗余但安全)
      apt.cityPinyin,              // 全拼：shanghai
      apt.cityShort,               // 简拼：sh
      apt.code.toLowerCase(),      // 三字码：pvg
      apt.name,                    // 机场名
    ];

    // Direct includes match
    for (const t of targets) {
      if (t.includes(q)) return true;
    }

    // Abbreviation partial match: "sh" matches "shanghai" start
    if (q.length >= 2 && apt.cityPinyin.startsWith(q)) return true;

    return false;
  }

  // Deduplicate by code, preferring exact-code match first, then city-match
  function search(query) {
    if (!query || query.trim().length < 1) {
      // Show popular airports when empty
      const popular = ['PEK','PVG','CAN','SZX','CTU','HGH','HKG','SYD','NRT','SIN','BKK','LHR','LAX','JFK','CDG','DXB'];
      return popular.map(c => CODE_MAP[c]).filter(Boolean);
    }

    const results = [];
    const seen = new Set();

    for (const apt of AIRPORT_DB) {
      if (seen.has(apt.code)) continue;
      if (matchAirport(query, apt)) {
        seen.add(apt.code);
        results.push(apt);
      }
    }

    // Sort: exact code match first, then by match quality
    const q = query.toLowerCase().trim();
    results.sort((a, b) => {
      const aExact = a.code.toLowerCase() === q;
      const bExact = b.code.toLowerCase() === q;
      if (aExact !== bExact) return bExact - aExact;

      const aCity = a.city === query ? 1 : (a.cityPinyin.startsWith(q) ? 0.5 : 0);
      const bCity = b.city === query ? 1 : (b.cityPinyin.startsWith(q) ? 0.5 : 0);
      return bCity - aCity;
    });

    return results.slice(0, 12);
  }

  // ——— Dropdown rendering ———
  function renderDropdown(results) {
    dropdown.innerHTML = '';
    currentResults = results;
    highlightIdx = -1;

    if (!results.length) {
      const li = document.createElement('li');
      li.className = 'ac-item ac-no-result';
      li.textContent = '未找到匹配的机场，请尝试其他关键词';
      dropdown.appendChild(li);
      return;
    }

    results.forEach((apt, idx) => {
      const li = document.createElement('li');
      li.className = 'ac-item';
      li.setAttribute('role', 'option');
      li.dataset.index = idx;
      li.dataset.code = apt.code;

      // Highlight matching portions
      const q = inputEl.value.trim();
      const displayName = `${apt.city} · ${apt.name.split('国际').join('').split('机场').join('').trim()}`;
      li.innerHTML = `
        <span class="ac-city">${highlightMatch(apt.city, q)}</span>
        <span class="ac-airport-name">${escapeHtml(apt.name)}</span>
        <span class="ac-code">${apt.code}</span>
      `;

      li.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent blur before click
        selectItem(idx);
      });

      li.addEventListener('mouseenter', () => highlightItem(idx));

      dropdown.appendChild(li);
    });
  }

  function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const idx = text.indexOf(query);
    if (idx >= 0) {
      const before = escapeHtml(text.slice(0, idx));
      const match = escapeHtml(text.slice(idx, idx + query.length));
      const after = escapeHtml(text.slice(idx + query.length));
      return `${before}<mark>${match}</mark>${after}`;
    }
    return escapeHtml(text);
  }

  function highlightItem(idx) {
    const items = dropdown.querySelectorAll('.ac-item');
    items.forEach(it => it.classList.remove('ac-highlight'));
    if (idx >= 0 && idx < items.length && !items[idx].classList.contains('ac-no-result')) {
      items[idx].classList.add('ac-highlight');
      items[idx].scrollIntoView({ block: 'nearest' });
    }
    highlightIdx = idx;
  }

  function selectItem(idx) {
    if (idx < 0 || idx >= currentResults.length) return;
    const apt = currentResults[idx];
    selectedCode = apt.code;
    inputEl.value = `${apt.city} (${apt.code})`;
    hiddenInput.value = apt.code;
    clearBtn.style.display = '';
    closeDropdown();

    if (onSelect) onSelect(apt);
  }

  // ——— Open/Close ———
  function openDropdown() {
    if (isOpen) return;
    isOpen = true;
    dropdown.classList.add('ac-open');
    // Reposition
    updateDropdownPosition();
  }

  function closeDropdown() {
    if (!isOpen) return;
    isOpen = false;
    highlightIdx = -1;
    currentResults = [];
    dropdown.classList.remove('ac-open');
  }

  function updateDropdownPosition() {
    const rect = inputEl.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;
  }

  // ——— Event handlers ———
  function onInput(e) {
    const val = inputEl.value.trim();

    // If the user manually cleared, reset
    if (!val) {
      selectedCode = '';
      hiddenInput.value = '';
    }

    // If the displayed value matches a previous selection exactly, don't search
    if (selectedCode && val === `${CODE_MAP[selectedCode]?.city || ''} (${selectedCode})`) {
      closeDropdown();
      return;
    }

    const results = search(val);
    openDropdown();
    renderDropdown(results);
  }

  function onFocus() {
    // Show popular on focus if empty
    if (!inputEl.value.trim()) {
      currentResults = [];
      const results = search('');
      openDropdown();
      renderDropdown(results);
    } else if (!isOpen) {
      onInput();
    }
  }

  function onKeyDown(e) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        onFocus();
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        highlightIdx = Math.min(highlightIdx + 1, currentResults.length - 1);
        if (highlightIdx >= 0) highlightItem(highlightIdx);
        break;

      case 'ArrowUp':
        e.preventDefault();
        highlightIdx = Math.max(highlightIdx - 1, 0);
        if (highlightIdx >= 0) highlightItem(highlightIdx);
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < currentResults.length) {
          selectItem(highlightIdx);
        }
        break;

      case 'Escape':
        e.preventDefault();
        closeDropdown();
        // Restore previous selection display
        if (selectedCode) {
          const apt = CODE_MAP[selectedCode];
          if (apt) inputEl.value = `${apt.city} (${apt.code})`;
        }
        break;

      case 'Tab':
        closeDropdown();
        break;
    }
  }

  function onBlur(e) {
    // Delay to allow mousedown on dropdown items to fire first
    setTimeout(() => {
      if (isOpen) {
        closeDropdown();
        // Restore display if no selection was made
        if (selectedCode && inputEl.value !== `${CODE_MAP[selectedCode]?.city || ''} (${selectedCode})`) {
          const apt = CODE_MAP[selectedCode];
          if (apt) inputEl.value = `${apt.city} (${apt.code})`;
        }
        if (!selectedCode) {
          inputEl.value = '';
          hiddenInput.value = '';
        }
      }
    }, 150);
  }

  function onClickOutside(e) {
    if (!wrapper.contains(e.target) && !dropdown.contains(e.target)) {
      closeDropdown();
      if (selectedCode) {
        const apt = CODE_MAP[selectedCode];
        if (apt && inputEl.value !== `${apt.city} (${apt.code})`) {
          inputEl.value = `${apt.city} (${apt.code})`;
        }
      }
      if (!selectedCode) {
        inputEl.value = '';
        hiddenInput.value = '';
      }
    }
  }

  // Scroll/resize repositioning
  function onScrollOrResize() {
    if (isOpen) updateDropdownPosition();
  }

  // ——— Bind events ———
  inputEl.addEventListener('input', onInput);
  inputEl.addEventListener('focus', onFocus);
  inputEl.addEventListener('keydown', onKeyDown);
  inputEl.addEventListener('blur', onBlur);
  document.addEventListener('click', onClickOutside, true);
  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);

  // ——— Public API ———
  return {
    getCode() { return selectedCode; },
    setCode(code) {
      const apt = CODE_MAP[code];
      if (apt) {
        selectedCode = code;
        inputEl.value = `${apt.city} (${apt.code})`;
        hiddenInput.value = code;
        clearBtn.style.display = '';
      }
    },
    clear() {
      selectedCode = '';
      inputEl.value = '';
      hiddenInput.value = '';
      clearBtn.style.display = 'none';
    },
    getInput() { return inputEl; },
    destroy() {
      document.removeEventListener('click', onClickOutside, true);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      inputEl.removeEventListener('input', onInput);
      inputEl.removeEventListener('focus', onFocus);
      inputEl.removeEventListener('keydown', onKeyDown);
      inputEl.removeEventListener('blur', onBlur);
      if (dropdown.parentNode) dropdown.remove();
      wrapper.parentNode.insertBefore(inputEl, wrapper);
      wrapper.remove();
    }
  };
}

function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}
