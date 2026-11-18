(() => {
  const t = window.facewallText;
  const get = id => document.getElementById(id);
  const format = new Intl.NumberFormat(t('th-TH', 'en-TH'), {maximumFractionDigits: 2});
  const money = value => format.format(value) + t(' บาท', ' THB');
  const squareMeters = value => format.format(value) + t(' ตร.ม.', ' m²');
  const clean = value => value.replace(/\s+/g, ' ').trim();
  const positive = value => Number.isFinite(value) && value > 0;
  const materials = new Map(window.FACEWALL_RATES.map(([id, name, rate, labor]) =>
    [id, {name, rate, labor, wallpaper: name.includes('Wallpaper')}]
  ));
  const catalogs = window.FACEWALL_CATALOGS.filter(item => item.category === 'wallpaper');
  const items = get('estimate-items');
  const container = get('estimate-rows');
  const quote = get('quote-dialog');
  const quoteForm = get('quote-form');
  const copy = get('estimate-copy');
  const line = window.FACEWALL_CONFIG;
  let estimate;

  function addRow(focus) {
    const row = get('estimate-row').content.firstElementChild.cloneNode(true);
    const select = row.querySelector('[name=material]');
    for (const [id, material] of materials) select.add(new Option(material.name, id));
    const catalogSelect = row.querySelector('[name=catalog]');
    for (const {title} of catalogs) catalogSelect.add(new Option(title, title));
    container.append(row);
    addArea(row, false);
    if (focus) select.focus();
  }

  function addArea(row, focus) {
    const part = get('estimate-area-template').content.firstElementChild.cloneNode(true);
    row.querySelector('[data-areas]').append(part);
    render();
    if (focus) part.querySelector('[name=mode]').focus();
  }

  function readArea(part, index, count, wallpaper) {
    const field = name => part.querySelector('[name=' + name + ']');
    const useArea = field('mode').value === 'area';
    const width = field('width');
    const length = field('length');
    const areaField = field('area');
    const areaName = field('areaName');
    const defaultName = t('พื้นที่ ', 'Area ') + (index + 1);
    const title = clean(areaName.value) || defaultName;
    part.querySelector('[data-area-title]').textContent = title;
    const edit = part.querySelector('.estimate-area-edit');
    edit.title = t('แก้ชื่อ ', 'Rename ') + title;
    edit.setAttribute('aria-label', edit.title);
    areaName.placeholder = defaultName;
    areaName.setAttribute('aria-label', t('ชื่อ', 'Name of ') + defaultName);
    part.querySelector('.estimate-area-remove').hidden = count < 2;
    part.querySelector('[data-length]').textContent = wallpaper ? t('สูง (เมตร)', 'Height (m)') : t('ยาว (เมตร)', 'Length (m)');
    part.querySelector('[data-area]').hidden = !useArea;
    part.querySelector('[data-dimensions]').hidden = useArea;
    width.disabled = length.disabled = useArea;
    areaField.disabled = !useArea;
    const area = useArea ? areaField.valueAsNumber : width.valueAsNumber * length.valueAsNumber;
    if (!positive(area) || (!useArea && (!positive(width.valueAsNumber) || !positive(length.valueAsNumber)))) return null;
    const dimensions = useArea ? squareMeters(area)
      : t('กว้าง ', 'W ') + format.format(width.valueAsNumber) + ' × ' +
        (wallpaper ? t('สูง ', 'H ') : t('ยาว ', 'L ')) + format.format(length.valueAsNumber) + t(' ม.', ' m');
    return {area, dimensions};
  }

  function readRow(row, index, count) {
    const field = name => row.querySelector('[name=' + name + ']');
    const material = materials.get(field('material').value);
    const wallpaper = material?.wallpaper === true;
    row.querySelector('summary').textContent = t('รายการ ', 'Item ') + (index + 1) +
      (material ? ' · ' + material.name : '');
    row.querySelector('.estimate-remove').hidden = count < 2;
    row.querySelector('[data-catalog]').hidden = !wallpaper;
    field('catalog').disabled = !wallpaper;
    const parts = Array.from(row.querySelector('[data-areas]').children);
    const areas = parts.map((part, i) => readArea(part, i, parts.length, wallpaper)).filter(Boolean);
    const area = areas.reduce((sum, part) => sum + part.area, 0);
    const subtotal = material ? area * material.rate : NaN;
    if (!material || !positive(area) || !Number.isFinite(subtotal)) return null;
    return {material, zone: clean(field('zone').value), area, areas, subtotal, catalog: wallpaper ? field('catalog').value : '', sku: clean(field('sku').value)};
  }

  function render() {
    const rows = Array.from(container.children);
    const entries = rows.map((row, index) => readRow(row, index, rows.length)).filter(Boolean);
    const material = entries.reduce((sum, entry) => sum + entry.subtotal, 0);
    const wall = entries.reduce((sum, entry) => sum + (entry.material.wallpaper ? entry.area : 0), 0);
    const floor = entries.reduce((sum, entry) => sum + (entry.material.wallpaper ? 0 : entry.area), 0);
    const labor = entries.length === 1 ? entries[0].material.labor : null;
    estimate = entries.length && [wall, floor, material + (labor ?? 0)].every(Number.isFinite)
      ? {entries, material, labor, wall, floor} : null;
    const dash = '—';
    get('estimate-total').textContent = estimate ? money(material + (labor ?? 0)) : dash;
    for (const [id, area] of [['estimate-wall-area', wall], ['estimate-floor-area', floor]]) {
      const value = get(id);
      const showArea = Boolean(estimate) && positive(area);
      value.parentElement.hidden = !showArea;
      value.textContent = showArea ? squareMeters(area) : dash;
    }
    get('estimate-material').textContent = estimate ? money(material) : dash;
    get('estimate-labor').textContent = estimate ? (labor === null ? t('รอทีมงานยืนยัน', 'Pending confirmation') : money(labor)) : dash;
    get('estimate-note').textContent = (entries.length > 1
      ? t('ยอดด้านบนเป็นค่าวัสดุรวม ค่าแรงสำหรับหลายรายการให้ทีมงานยืนยัน ', 'The total above covers materials. Our team will confirm labor for multiple items. ') : '') +
      t('ค่าปรับสภาพพื้นผิว ภาษี ค่าขนส่ง และวัสดุเผื่อเศษให้ทีมงานยืนยัน', 'Confirm surface preparation, tax, delivery, and extra material with our team.');
    get('estimate-status').textContent = '';
    get('estimate-breakdown').replaceChildren(...entries.map(entry => {
      const li = document.createElement('li');
      li.textContent = [entry.zone, entry.material.name, squareMeters(entry.area), money(entry.subtotal)].filter(Boolean).join(' · ');
      return li;
    }));
  }

  function ready() {
    render();
    if (estimate) return true;
    get('estimate-status').textContent = t('เลือกวัสดุและกรอกขนาดอย่างน้อยหนึ่งพื้นที่', 'Select a material and enter at least one valid area.');
    return false;
  }

  const optional = (label, value) => value ? [label + ': ' + value] : [];
  const thaiArea = value => format.format(value) + ' ตร.ม.';
  const thaiMoney = value => format.format(value) + ' บาท';

  function lines(structured) {
    return estimate.entries.flatMap((entry, index) => {
      const header = (structured ? '📋 รายการที่ ' : t('📋 รายการที่ ', '📋 Item ')) + (index + 1) +
        (entry.zone ? ' · ' + entry.zone : '');
      const dimensions = entry.areas.map((part, i) => {
        const suffix = entry.areas.length > 1 ? ' ' + (i + 1) : '';
        const label = structured ? 'ขนาด' : t('ขนาด', 'Size');
        return label + suffix + ': ' + part.dimensions;
      });
      return [
        '', header, (structured ? 'วัสดุ' : t('วัสดุ', 'Material')) + ': ' + entry.material.name,
        ...optional(structured ? 'ชื่อเล่ม' : t('ชื่อเล่ม', 'Catalog'), entry.catalog),
        ...optional(structured ? 'รหัสสินค้า/ลาย' : t('รหัสสินค้า/ลาย', 'Product/pattern code'), entry.sku),
        ...dimensions,
        structured ? 'พื้นที่ประเมิน: ' + thaiArea(entry.area) : t('พื้นที่: ', 'Area: ') + squareMeters(entry.area),
        ...(structured ? ['ค่าวัสดุประเมิน: ' + thaiMoney(entry.subtotal)] : [])
      ];
    });
  }

  function openLine(message) {
    const url = 'https://line.me/R/oaMessage/' + encodeURIComponent(line.lineId) + '/?' + encodeURIComponent(message);
    if (url.length <= 4000) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (quote.open) quote.close();
    get('estimate-copy-text').value = message;
    get('estimate-copy-status').textContent = '';
    copy.showModal();
  }

  items.addEventListener('input', render);
  items.addEventListener('change', render);
  items.addEventListener('submit', event => event.preventDefault());
  get('estimate-add').addEventListener('click', () => addRow(true));
  function finishAreaRename(input, restoreFocus) {
    const group = input.closest('.estimate-area-name');
    const edit = group.querySelector('.estimate-area-edit');
    input.hidden = true;
    group.querySelector('[data-area-title]').hidden = false;
    edit.hidden = false;
    render();
    if (restoreFocus) edit.focus();
  }

  container.addEventListener('focusout', event => {
    if (event.target.matches('[name=areaName]') && !event.target.hidden) {
      finishAreaRename(event.target, false);
    }
  });
  container.addEventListener('keydown', event => {
    const input = event.target;
    if (!input.matches('[name=areaName]') || event.isComposing) return;
    if (event.key !== 'Enter' && event.key !== 'Escape') return;
    event.preventDefault();
    if (event.key === 'Escape') input.value = input.defaultValue;
    finishAreaRename(input, true);
  });
  container.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const row = button.closest('.estimate-row');
    if (button.matches('.estimate-area-edit')) {
      const group = button.closest('.estimate-area-name');
      const input = group.querySelector('[name=areaName]');
      input.defaultValue = input.value;
      group.querySelector('[data-area-title]').hidden = true;
      button.hidden = true;
      input.hidden = false;
      input.focus();
      input.select();
    }
    if (button.matches('.estimate-area-add')) addArea(row, true);
    if (button.matches('.estimate-area-remove')) {
      button.closest('.estimate-area-part').remove();
      render();
      row.querySelector('.estimate-area-add').focus();
    }
    if (button.matches('.estimate-remove') && container.childElementCount > 1) {
      row.remove();
      render();
      get('estimate-add').focus();
    }
  });
  for (const dialog of [quote, copy]) {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  }
  const company = get('quote-company');
  function companyFields() {
    company.hidden = quoteForm.elements.customerType.value !== 'business';
    for (const field of company.querySelectorAll('input')) field.disabled = company.hidden;
  }
  quoteForm.elements.customerType.addEventListener('change', companyFields);
  get('estimate-quote').addEventListener('click', () => {
    if (ready()) quote.showModal();
  });
  get('estimate-inquire').addEventListener('click', () => {
    if (!ready()) return;
    openLine([t('สวัสดี ขอสอบถามเพิ่มเติมเกี่ยวกับวัสดุที่เลือกจากเว็บไซต์ FACEWALL', 'Hello, I’d like to ask about these FACEWALL materials.'), ...lines(false), '', t('💬 คำถาม: ', '💬 My question: ')].join('\n'));
  });
  quoteForm.addEventListener('input', event => {
    if (event.target.setCustomValidity) event.target.setCustomValidity('');
  });
  quoteForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!estimate) return;
    const data = new FormData(quoteForm);
    const value = key => clean(data.get(key) || '');
    const phone = value('phone');
    for (const key of ['contact', 'billingName']) {
      if (!value(key)) quoteForm.elements[key].setCustomValidity(t('กรุณากรอกชื่อ', 'Enter a name.'));
    }
    if (!/^[+\d\s()-]+$/.test(phone) || !/^\d{8,15}$/.test(phone.replace(/\D/g, ''))) {
      quoteForm.elements.phone.setCustomValidity(t('กรุณาตรวจสอบเบอร์โทร', 'Check the phone number.'));
    }
    if (!quoteForm.reportValidity()) return;
    const {material, labor, wall, floor} = estimate;
    const message = [
      'ขอใบเสนอราคา', '', '👤 ข้อมูลออกใบเสนอราคา',
      'ผู้ติดต่อ: ' + value('contact'), 'เบอร์โทร: ' + phone,
      'ประเภทลูกค้า: ' + (value('customerType') === 'business' ? 'บริษัท' : 'บุคคล'),
      'ชื่อออกเอกสาร: ' + value('billingName'),
      ...optional('ที่อยู่ออกเอกสาร', value('billingAddress')),
      ...optional('เลขผู้เสียภาษี', value('taxId')),
      ...optional('สำนักงานใหญ่/สาขา', value('branch')),
      ...lines(true), '', '💰 สรุปราคาประเมิน',
      ...optional('พื้นที่วอลเปเปอร์รวม', wall ? thaiArea(wall) : ''),
      ...optional('พื้นที่วัสดุปูพื้นรวม', floor ? thaiArea(floor) : ''),
      'ค่าวัสดุประเมินรวม: ' + thaiMoney(material),
      'ค่าแรงติดตั้ง: ' + (labor === null ? 'รอทีมงานยืนยัน' : thaiMoney(labor)),
      'ราคาประเมิน: ' + (labor === null ? 'รอยืนยันค่าแรง' : thaiMoney(material + labor))
    ].join('\n');
    openLine(message);
  });
  get('estimate-copy-button').addEventListener('click', async () => {
    const field = get('estimate-copy-text');
    try {
      await navigator.clipboard.writeText(field.value);
      get('estimate-copy-status').textContent = t('คัดลอกข้อความแล้ว', 'Message copied.');
    } catch {
      field.focus();
      field.select();
      get('estimate-copy-status').textContent = t('คัดลอกข้อความที่เลือกไว้', 'Copy the selected message.');
    }
  });
  companyFields();
  addRow(false);
})();
