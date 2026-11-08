(() => {
  const center = document.getElementById('adminNotificationCenter');
  if (!center) return;

  const byId = (id) => document.getElementById(id);
  const api = '/api/admin/notifications';
  const filters = byId('adminNotificationSearch');
  const search = byId('adminNotificationQuery');
  const list = byId('adminNotificationList');
  const region = byId('adminNotificationListRegion');
  const state = byId('adminNotificationState');
  const previous = byId('adminNotificationPrevious');
  const next = byId('adminNotificationNext');
  const readAll = byId('adminNotificationsReadAll');
  const categoryButtons = [...center.querySelectorAll('[data-notify-category]')];
  const stateButtons = [...center.querySelectorAll('[data-notify-state]')];
  const numbers = new Intl.NumberFormat('en-US');
  const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const categoryDetails = new Map([
    ['ekyc', ['eKYC', 'shield-check']],
    ['owner-verification', ['Owner Verification', 'badge-check']],
    ['devices', ['Devices', 'package-check']],
  ]);
  const url = new URL(window.location.href);
  let category = url.searchParams.get('category') || 'all';
  if (!categoryButtons.some((button) => button.dataset.notifyCategory === category)) category = 'all';
  let unreadOnly = url.searchParams.get('unread') === 'true';
  let page = Math.max(1, parseInt(url.searchParams.get('page'), 10) || 1);
  let totalPages = 1;
  let appliedSearch = url.searchParams.get('search') || '';
  let unreadCount = 0;
  let fetching;
  let mutating = false;
  search.value = appliedSearch;

  function create(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function button(text, className = 'admin-btn admin-btn-outline') {
    const node = create('button', text, className);
    node.type = 'button';
    return node;
  }

  function icon(name) {
    const node = create('i');
    node.dataset.lucide = name;
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function configureMobileNavigation() {
    const shell = center.closest('.admin-hub-wrapper');
    const sidebar = shell.querySelector('.admin-sidebar');
    const main = shell.querySelector('.admin-main-wrap');
    const topbar = main.querySelector('.admin-topbar');
    const mobile = window.matchMedia('(max-width: 860px)');
    const toggle = button(undefined, 'admin-action-btn notify-nav-toggle');
    const close = button(undefined, 'admin-action-btn notify-nav-close');
    const backdrop = button(undefined, 'notify-nav-backdrop');
    sidebar.id = 'notificationAdminNavigation';
    toggle.setAttribute('aria-controls', sidebar.id);
    toggle.setAttribute('aria-label', 'Open admin navigation');
    toggle.setAttribute('aria-expanded', 'false');
    close.setAttribute('aria-label', 'Close admin navigation');
    backdrop.setAttribute('aria-label', 'Close admin navigation');
    backdrop.tabIndex = -1;
    toggle.append(icon('menu'));
    close.append(icon('x'));
    topbar.prepend(toggle);
    sidebar.prepend(close);
    shell.append(backdrop);

    function setOpen(open, restoreFocus = true) {
      shell.toggleAttribute('data-notify-nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      main.inert = open;
      if (open) close.focus();
      else if (restoreFocus) toggle.focus();
    }
    toggle.addEventListener('click', () => setOpen(true));
    close.addEventListener('click', () => setOpen(false));
    backdrop.addEventListener('click', () => setOpen(false));
    shell.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && shell.hasAttribute('data-notify-nav-open')) setOpen(false);
    });
    mobile.addEventListener('change', () => setOpen(false, false));
  }

  async function request(path, options) {
    const response = await fetch(api + path, options);
    if (response.status === 401) throw new Error('Sign in again to view admin notifications.');
    if (response.status === 403) throw new Error('A verified administrator account is required.');
    if (!response.ok) throw new Error('Notifications could not be updated. Please try again.');
    return response.json();
  }

  function updateControls() {
    stateButtons.forEach((control) => {
      control.setAttribute('aria-pressed', String((control.dataset.notifyState === 'unread') === unreadOnly));
    });
    categoryButtons.forEach((control) => {
      control.setAttribute('aria-pressed', String(control.dataset.notifyCategory === category));
    });
    previous.disabled = page <= 1;
    next.disabled = page >= totalPages;
    readAll.disabled = mutating || unreadCount === 0;
  }

  function timestamp(value) {
    const time = create('time');
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) {
      time.textContent = 'Time unavailable';
      return time;
    }
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const scales = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute'], [1, 'second']];
    const [scale, unit] = scales.find(([divisor]) => Math.abs(seconds) >= divisor) || scales.at(-1);
    time.textContent = relative.format(Math.trunc(seconds / scale), unit);
    time.dateTime = date.toISOString();
    time.title = date.toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' });
    return time;
  }

  function renderRow(record) {
    const item = create('li', undefined, 'notify-item' + (record.isRead ? '' : ' notify-item-unread'));
    item.dataset.notificationId = record._id;
    const [label, iconName] = categoryDetails.get(record.category) || ['Platform', 'bell'];
    const badgeIcon = create('span', undefined, 'notify-item-icon');
    badgeIcon.append(icon(iconName));
    const details = create('div');
    const meta = create('div', undefined, 'notify-item-meta');
    meta.append(create('span', label, 'notify-category'), timestamp(record.createdAt));
    if (!record.isRead) meta.append(create('span', '• Unread', 'notify-unread'));
    details.append(create('h3', record.title), create('p', record.body), meta);

    const actions = create('div', undefined, 'notify-item-actions');
    if (record.action) {
      const link = create('a', record.action.label, 'admin-btn notify-action');
      link.href = record.action.href;
      actions.append(link);
    } else {
      actions.append(create('span', 'Record unavailable', 'notify-missing'));
    }
    if (!record.isRead) {
      const mark = button('Mark as Read');
      mark.addEventListener('click', () => markRead(record._id, mark));
      actions.append(mark);
    }
    item.append(badgeIcon, details, actions);
    return item;
  }

  function params() {
    const query = new URLSearchParams();
    if (category !== 'all') query.set('category', category);
    if (unreadOnly) query.set('unread', 'true');
    if (appliedSearch) query.set('search', appliedSearch);
    if (page > 1) query.set('page', page);
    return query;
  }

  function showState(message, retry = false) {
    state.replaceChildren(create('p', message));
    if (retry) {
      const control = button('Try Again');
      control.addEventListener('click', () => load());
      state.append(control);
    }
    state.hidden = false;
  }

  function updateUnread(count) {
    unreadCount = count;
    center.querySelector('[data-notify-metric="unread"]').textContent = numbers.format(count);
    window.updateAdminNotificationBadges?.(count);
    readAll.disabled = mutating || count === 0;
  }

  async function load({ quiet = false } = {}) {
    fetching?.abort();
    fetching = new AbortController();
    const { signal } = fetching;
    if (!quiet) {
      region.setAttribute('aria-busy', 'true');
      previous.disabled = next.disabled = true;
      list.hidden = true;
      showState('Loading notifications…');
    }
    try {
      const result = await request('?' + params(), { signal });
      if (signal.aborted) return;
      page = result.pagination.page;
      totalPages = result.pagination.totalPages;
      center.querySelector('[data-notify-metric="total"]').textContent = numbers.format(result.summary.total);
      center.querySelector('[data-notify-metric="pending"]').textContent = numbers.format(result.summary.pending);
      updateUnread(result.summary.unread);
      const count = result.pagination.total;
      byId('adminNotificationResults').textContent = numbers.format(count) + (count === 1 ? ' result' : ' results');
      byId('adminNotificationPage').textContent = 'Page ' + page + ' of ' + totalPages;
      const query = params().toString();
      window.history.replaceState(null, '', url.pathname + (query ? '?' + query : ''));
      list.replaceChildren(...result.data.map(renderRow));
      list.hidden = result.data.length === 0;
      state.hidden = !list.hidden;
      if (list.hidden) showState('No notifications match the current filters.');
      updateControls();
      window.lucide?.createIcons();
    } catch (error) {
      if (!signal.aborted && !quiet) {
        byId('adminNotificationResults').textContent = '';
        byId('adminNotificationPage').textContent = '';
        showState(error.message, true);
      }
    } finally {
      if (!signal.aborted) region.setAttribute('aria-busy', 'false');
    }
  }

  async function markRead(id, control) {
    if (mutating) return;
    mutating = true;
    readAll.disabled = control.disabled = true;
    const feedback = byId('adminNotificationFeedback');
    try {
      const path = id ? '/' + encodeURIComponent(id) + '/read' : '/read-all';
      const result = await request(path, { method: 'PATCH' });
      updateUnread(result.unread);
      feedback.textContent = id ? 'Notification marked as read.' : 'All notifications marked as read.';
      await load();
      const item = id && [...list.children].find((row) => row.dataset.notificationId === id);
      const nextFocus = item?.querySelector?.('a') || stateButtons.find((button) => button.getAttribute('aria-pressed') === 'true');
      nextFocus?.focus();
    } catch (error) {
      feedback.textContent = error.message;
      window.showAdminToast?.('Could not mark as read', error.message, 'error');
    } finally {
      mutating = false;
      control.disabled = false;
      readAll.disabled = unreadCount === 0;
    }
  }

  function resetPage() {
    page = 1;
    updateControls();
    load();
  }

  stateButtons.forEach((control) => control.addEventListener('click', () => {
    unreadOnly = control.dataset.notifyState === 'unread';
    resetPage();
  }));
  categoryButtons.forEach((control) => control.addEventListener('click', () => {
    category = control.dataset.notifyCategory;
    resetPage();
  }));
  filters.addEventListener('submit', (event) => {
    event.preventDefault();
    appliedSearch = search.value.trim().slice(0, 120);
    resetPage();
  });
  const quickSearch = byId('globalAdminSearch');
  quickSearch.placeholder = 'Quick search admin notifications…';
  quickSearch.setAttribute('aria-label', 'Quick search admin notifications');
  quickSearch.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    search.value = quickSearch.value;
    filters.requestSubmit();
  });
  previous.addEventListener('click', () => { if (page > 1) { page -= 1; load(); } });
  next.addEventListener('click', () => { if (page < totalPages) { page += 1; load(); } });
  readAll.addEventListener('click', () => markRead(null, readAll));

  configureMobileNavigation();
  updateControls();
  load();
  window.setInterval(() => {
    if (!document.hidden && !mutating && region.getAttribute('aria-busy') === 'false' &&
        !list.contains(document.activeElement)) load({ quiet: true });
  }, 30000);
})();
