(() => {
  const form = document.getElementById('qt-form');
  const result = document.getElementById('qt-result');
  const status = document.getElementById('qt-status');
  const customerFields = new Set(['ผู้ติดต่อ', 'เบอร์โทร', 'ประเภทลูกค้า', 'ชื่อออกเอกสาร', 'ที่อยู่ออกเอกสาร', 'เลขผู้เสียภาษี', 'สำนักงานใหญ่/สาขา']);
  const itemFields = new Set(['วัสดุ', 'ชื่อเล่ม', 'รหัสสินค้า/ลาย', 'พื้นที่ประเมิน', 'ค่าวัสดุประเมิน']);
  const totalsFields = new Set(['พื้นที่วอลเปเปอร์รวม', 'พื้นที่วัสดุปูพื้นรวม', 'ค่าวัสดุประเมินรวม', 'ค่าแรงติดตั้ง', 'ราคาประเมิน']);
  function parse(message) {
    const [title, ...lines] = message.trim().split(/\r?\n/);
    if (title.trim() !== 'ขอใบเสนอราคา') return null;
    const customer = new Map();
    const items = [];
    const totals = new Map();
    let fields = customer;
    for (const raw of lines) {
      const line = raw.trim();
      const item = /^(?:📋\s*)?รายการที่ (\d+)(?:\s+·\s+(.+))?$/.exec(line);
      if (item) {
        fields = new Map();
        if (item[2]) fields.set('จุดติดตั้ง', item[2]);
        items.push(fields);
        continue;
      }
      if (/^(?:💰\s*)?สรุปราคาประเมิน$/.test(line)) {
        fields = totals;
        continue;
      }
      const separator = line.indexOf(':');
      if (separator < 0) continue;
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      const allowed = fields === customer ? customerFields.has(key)
        : fields === totals ? totalsFields.has(key) : itemFields.has(key) || /^ขนาด(?: \d+)?$/.test(key);
      if (allowed && value) fields.set(key, value);
    }
    if (!customer.get('ผู้ติดต่อ') || !customer.get('เบอร์โทร') || !items.length ||
        items.some(item => !item.get('วัสดุ') || !item.get('พื้นที่ประเมิน'))) return null;
    return {customer, items, totals};
  }

  function section(title, fields) {
    const group = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = title;
    const list = document.createElement('dl');
    for (const [label, value] of fields) {
      const term = document.createElement('dt');
      term.textContent = label;
      const detail = document.createElement('dd');
      detail.textContent = value;
      list.append(term, detail);
    }
    group.append(heading, list);
    return group;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const quote = parse(document.getElementById('qt-message').value);
    if (!quote) {
      result.replaceChildren();
      status.textContent = 'อ่านข้อมูลไม่ได้ กรุณาคัดลอกข้อความขอใบเสนอราคาจาก LINE ให้ครบ';
      return;
    }
    result.replaceChildren(
      section('ข้อมูลออกใบเสนอราคา', quote.customer),
      ...quote.items.map((fields, index) => section('รายการที่ ' + (index + 1), fields)),
      section('สรุปราคาประเมิน', quote.totals)
    );
    status.textContent = 'อ่านข้อมูลแล้ว ' + quote.items.length + ' รายการ';
  });
})();
