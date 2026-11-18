(() => {
  'use strict';
  const t = window.facewallText;
  const form = document.getElementById('inquiry-form');
  if (!form) return;
  const config = window.FACEWALL_CONFIG || {};
  const endpoint = (config.leadWebAppUrl || '').trim();
  const productsNode = document.getElementById('product-choices');
  const addButton = document.getElementById('add-product');
  const result = document.getElementById('inquiry-result');
  const status = document.getElementById('lead-status');
  const lineButton = document.getElementById('lead-line-link');
  const preview = document.getElementById('inquiry-preview');
  const submitButton = document.getElementById('lead-submit');
  const itemChoices = ['Wallpaper','SPC','Vinyl / LVT','Carpet'];
  let processing = false;
  const ARROW = '<svg class="ui-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11"/></svg>';
  function makeProductRow(index) {
    const row = document.createElement('div');
    row.className = 'lead-product-row';
    const select = document.createElement('select');
    select.name = 'product[]'; select.required = true;
    select.setAttribute('aria-label',t('ประเภทงานที่สนใจ ', 'Service of interest ')+(index+1));
    select.append(new Option(t('เลือกวัสดุที่สนใจ', 'Choose a material'),''));
    itemChoices.forEach(item => select.append(new Option(item,item)));
    row.append(select);
    if (index > 0) {
      const remove = document.createElement('button');
      remove.type='button';remove.className='lead-remove';remove.textContent=t('นำออก', 'Remove');
      remove.addEventListener('click',()=>{row.remove();addButton.disabled=false;});
      row.append(remove);
    }
    return row;
  }
  productsNode.append(makeProductRow(0));
  addButton.addEventListener('click',()=>{
    if (productsNode.children.length>=itemChoices.length) return;
    productsNode.append(makeProductRow(productsNode.children.length));
    addButton.disabled=productsNode.children.length>=itemChoices.length;
  });
  function collect() {
    const data = new FormData(form);
    const val = key => (data.get(key)||'').toString().trim();
    const products = [...new Set(data.getAll('product[]').map(x=>x.toString().trim()).filter(Boolean))];
    return {name:val('name'),phone:val('phone'),products,place:val('place'),area:val('area'),detail:val('message'),consent:data.get('consent')==='yes'};
  }
  function formatLine(v,leadId) {
    return [
      t('FACEWALL | ขอคำปรึกษางานผนังและพื้น', 'FACEWALL | Wall and flooring inquiry'),
      t('รหัสคำขอ: ', 'Inquiry reference: ')+(leadId || t('ส่งจากเว็บไซต์ (ยังไม่มีเลขอ้างอิง)', 'From the website (reference pending)')),
      t('ชื่อ: ', 'Name: ')+v.name,
      t('โทร: ', 'Phone: ')+v.phone,
      t('ประเภทงาน: ', 'Services: ')+v.products.join(' + '),
      t('พื้นที่ติดตั้ง: ', 'Location: ')+(v.place||t('ยังไม่ระบุ', 'Not specified')),
      t('ขนาดพื้นที่: ', 'Area: ')+(v.area||t('ยังไม่ระบุ', 'Not specified')),
      t('รายละเอียด: ', 'Details: ')+(v.detail||t('ยังไม่ระบุ', 'Not specified')),
      t('รบกวนทีมงาน FACEWALL ติดต่อกลับด้วยครับ/ค่ะ', 'Please contact me about this project.')
    ].join('\n');
  }
  function lineUrl(message) {
    return 'https://line.me/R/oaMessage/%40112rjeke/?'+encodeURIComponent(message);
  }
  function showLine(v,id,caption) {
    const msg = formatLine(v,id);
    preview.value = msg;
    lineButton.href = lineUrl(msg);
    status.textContent = caption;
    result.hidden = false;
    result.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  document.getElementById('copy-inquiry')?.addEventListener('click',async()=>{
    try {await navigator.clipboard.writeText(preview.value);status.textContent=t('คัดลอกข้อความแล้ว กรุณาเปิด LINE และกดส่ง', 'Message copied. Open LINE and send it.');}
    catch {preview.focus();preview.select();status.textContent=t('กรุณาคัดลอกข้อความที่เลือกด้วยตนเอง', 'Please copy the selected text manually.');}
  });
  form.addEventListener('submit',(event)=>{
    event.preventDefault();
    if (processing || !form.reportValidity()) return;
    const v=collect();
    if (v.products.length===0) return;
    const phone=v.phone.replace(/\s/g,'');
    if (!/^[0-9+()\-]{8,30}$/.test(phone)) {status.textContent=t('กรุณาตรวจสอบเบอร์โทร', 'Check your phone number.');result.hidden=false;return;}
    const nonce=(self.crypto&&crypto.randomUUID)?crypto.randomUUID():'fw'+Date.now()+Math.random().toString(36).slice(2);
    if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(endpoint)) {
      showLine(v,'',t('ยังไม่ได้เชื่อม Google Sheets: สามารถส่งข้อความผ่าน LINE ได้ก่อน แต่ข้อมูลยังไม่ถูกบันทึกลง Sheets', 'Google Sheets is unavailable. You can still send your inquiry via LINE.'));
      return;
    }
    processing=true;submitButton.disabled=true;submitButton.textContent=t('กำลังบันทึกข้อมูล...', 'Saving your details…');
    let timer;
    const frame=document.createElement('iframe');
    frame.name='fw_lead_'+Date.now();frame.title='Lead submission status';frame.style.display='none';
    document.body.append(frame);
    const pending=document.createElement('form');
    pending.method='POST';pending.action=endpoint;pending.target=frame.name;pending.style.display='none';
    const fields={...v,request_id:nonce,products:v.products.join('|'),website:'',consent:'yes',detail:v.detail};
    Object.entries(fields).forEach(([key,value])=>{
      if (Array.isArray(value) || typeof value==='boolean')return;
      const input=document.createElement('input');input.type='hidden';input.name=key;input.value=String(value);
      pending.append(input);
    });
    document.body.append(pending);
    const cleanup=()=>{
      clearTimeout(timer);window.removeEventListener('message',onMessage);
      setTimeout(()=>{frame.remove();pending.remove();},800);
      processing=false;submitButton.disabled=false;submitButton.innerHTML=t('บันทึกข้อมูลและดำเนินการต่อใน LINE ', 'Save details and continue in LINE ')+ARROW;
    };
    const onMessage=event=>{
      const p=event.data||{};
      if (p.channel!=='FACEWALL_LEADS'||p.nonce!==nonce) return;
      // Only Google Apps Script HTML responses should be accepted.
      const origin=new URL(event.origin).hostname;
      if (origin!=='script.google.com' && !origin.endsWith('.googleusercontent.com') && origin!=='script.googleusercontent.com') return;
      cleanup();
      if(p.ok){
        showLine(v,p.leadId,t('บันทึกลง Google Sheets แล้ว เลขอ้างอิง ', 'Saved in Google Sheets. Reference ')+p.leadId+t(' — โปรดกดเปิด LINE และกดส่งข้อความอีกครั้ง', ' — Open LINE and send the prepared message.'));
      } else {
        showLine(v,'',t('ยังยืนยันการบันทึก Google Sheets ไม่สำเร็จ: ', 'Google Sheets could not confirm the save: ')+t(p.error || 'กรุณาลองใหม่', 'Please try again.')+t(' — สามารถส่ง LINE ได้', ' — You can still send it via LINE.'));
      }
    };
    window.addEventListener('message',onMessage);
    timer=setTimeout(()=>{
      cleanup();showLine(v,'',t('ยังไม่ได้รับการยืนยันจาก Google Sheets โปรดตรวจสอบ Sheet ก่อนส่งซ้ำ — คุณยังสามารถส่ง LINE ได้', 'Google Sheets has not confirmed the save. Check before resubmitting. You can still send the message via LINE.'));
    },18000);
    try{pending.submit();}catch(err){cleanup();showLine(v,'',t('เกิดข้อผิดพลาดในการเชื่อม Google Sheets กรุณาส่งผ่าน LINE', 'Could not connect to Google Sheets. Send your inquiry via LINE.'));}
  });
})();
