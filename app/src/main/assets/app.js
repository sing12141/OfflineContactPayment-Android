const KEY='offline_contact_payment_v2';
let contacts=[];
let headers=[];
let years=[];
let searchQuery='';

const $=id=>document.getElementById(id);

function save(){
  localStorage.setItem(KEY,JSON.stringify({contacts,headers,years}));
}

function load(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY)||'{}');

    contacts=x.contacts||[];

    contacts.forEach(c=>{
      if(!Array.isArray(c.remarksHistory)){
        c.remarksHistory=c.remarks?[c.remarks]:[];
      }

      c.remarks='';
      c.draftRemark='';

      if(c.calledAt&&/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(c.calledAt)){
        const m=String(c.calledAt).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);

        c.calledAt=
          String(m[1]).padStart(2,'0')+
          String(m[2]).padStart(2,'0')+
          m[3];
      }
    });

    headers=x.headers||[];
    years=x.years||[];

  }catch(e){}
}

function esc(s){
  return String(s??'').replace(
    /[&<>"']/g,
    m=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[m])
  );
}

function isYear(h){
  return /^(19|20)\d{2}$/.test(String(h).trim());
}

function unpaid(c){
  return years.filter(
    y=>String(c.data[y]??'').trim()===''
  );
}

function renderFilters(){
  const yf=$('yearFilter');

  if(!yf)return;

  yf.innerHTML=
    '<option value="all">All contacts</option>'+
    years.map(y=>`<option value="${y}">${y}</option>`).join('');
}

function setRemark(i,v){
  const c=contacts[i];

  if(!c)return;

  c.draftRemark=v;
}

function saveRemark(i){
  const el=document.querySelector(
    '[data-remark="'+i+'"]'
  );

  if(!el)return;

  const text=el.value.trim();

  if(!text)return;

  const c=contacts[i];

  c.remarksHistory=
    Array.isArray(c.remarksHistory)
      ?c.remarksHistory
      :((c.remarks||'')?[c.remarks]:[]);

  c.remarksHistory.push(text);

  c.remarks='';
  c.draftRemark='';

  save();
  render();

  setTimeout(()=>{
    const card=document.querySelector(
      '[data-card="'+i+'"]'
    );

    if(card){
      card.scrollIntoView({
        block:'nearest'
      });
    }
  },0);
}

function stats(){
  const total=contacts.length;

  const full=contacts.filter(
    c=>unpaid(c).length===0
  ).length;

  const notCalled=contacts.filter(
    c=>!c.called
  ).length;

  const called=total-notCalled;

  const yf=$('yearFilter');

  const y=yf?yf.value:'all';

  let extra='';

  if(y!=='all'){
    const py=contacts.filter(
      c=>String(c.data[y]??'').trim()!==''
    ).length;

    extra=
      `<div class="stat">
        <b>${py}</b>
        <span>Paid ${y}</span>
      </div>
      <div class="stat bad">
        <b>${total-py}</b>
        <span>Unpaid ${y}</span>
      </div>`;
  }

  $('stats').innerHTML=
    `<button class="stat statBtn ${activeView==='total'?'active':''}" onclick="setView('total')">
      <b>${total}</b>
      <span>Total</span>
    </button>

    <div class="stat ok">
      <b>${full}</b>
      <span>Fully Paid</span>
    </div>

    <div class="stat bad">
      <b>${total-full}</b>
      <span>Has Unpaid</span>
    </div>

    <button class="stat statBtn ${activeView==='notCalled'?'active':''}" onclick="setView('notCalled')">
      <b>${notCalled}</b>
      <span>Not Called</span>
    </button>

    <button class="stat statBtn ${activeView==='called'?'active':''}" onclick="setView('called')">
      <b>${called}</b>
      <span>Total Called</span>
    </button>

    ${extra}`;
}

let activeView='total';

function setView(v){
  activeView=v;
  render();
}

function goTop(){
  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
}

function updateTopButton(){
  const b=$('topBtn');

  if(!b)return;

  const y=Math.max(
    window.scrollY||0,
    document.documentElement.scrollTop||0,
    document.body.scrollTop||0
  );

  b.classList.toggle(
    'show',
    y>250
  );
}

window.addEventListener(
  'scroll',
  updateTopButton,
  {
    passive:true,
    capture:true
  }
);

document.addEventListener(
  'scroll',
  updateTopButton,
  {
    passive:true,
    capture:true
  }
);

window.addEventListener(
  'touchmove',
  updateTopButton,
  {
    passive:true
  }
);

window.addEventListener(
  'resize',
  updateTopButton
);

setInterval(
  updateTopButton,
  500
);

function render(){

  const q=searchQuery;

  const yf=$('yearFilter');
  const yearFilter=yf?yf.value:'all';

  let arr=contacts.filter(c=>

    (
      activeView==='total' ||

      (
        activeView==='notCalled' &&
        !c.called
      ) ||

      (
        activeView==='called' &&
        c.called
      )
    )

    &&

    (
      !q ||

      c.name
        .toLowerCase()
        .includes(q)

      ||

      c.phone
        .toLowerCase()
        .includes(q)

      ||

      String(c.remarks||'')
        .toLowerCase()
        .includes(q)

      ||

      (
        (c.remarksHistory||[])
          .join(' ')
      )
      .toLowerCase()
      .includes(q)
    )

    &&

    (
      yearFilter==='all' ||
      unpaid(c).includes(yearFilter)
    )
  );

  stats();

  $('summary').textContent=
    `${arr.length} shown • ${contacts.length} total`;

  if(!arr.length){

    $('list').innerHTML=
      '<div class="empty">'+
      'No contacts found.<br>'+
      'Import an Excel file to begin.'+
      '</div>';

    return;
  }

  $('list').innerHTML=
    arr.map(c=>{

      const u=unpaid(c);

      const p=u.length===0;

      const i=contacts.indexOf(c);

      const paidYears=
        years.filter(
          y=>!u.includes(y)
        );

      const history=
        Array.isArray(c.remarksHistory)
          ?c.remarksHistory
          :((c.remarks||'')
            ?[c.remarks]
            :[]);

      return `
      <article
        class="card ${c.called?'called':''}"
        data-card="${i}"
      >

        <div class="top">

          <div>

            <div class="name">
              ${esc(c.name||'Unnamed')}
            </div>

            <div class="phone">
              ${esc(c.phone)}
            </div>

          </div>

          <div class="status ${p?'paid':'unpaid'}">
            ${p?'FULLY PAID':'HAS UNPAID'}
          </div>

        </div>

        <div class="yearsTitle">
          Payment by Year
        </div>

        <div class="years">

          ${years.map(y=>{

            const ok=!u.includes(y);

            return `
            <span
              class="year ${ok?'yearPaid':'yearUnpaid'}"
            >
              <b>${esc(y)}</b>:
              ${ok?'PAID':'NOT PAID'}
            </span>
            `;

          }).join('')}

        </div>

        <div class="yearSummary">

          <span class="paidText">
            <b>Paid years:</b>
            ${paidYears.length
              ?paidYears.join(', ')
              :'None'}
          </span>

          <span class="unpaidText">
            <b>Unpaid years:</b>
            ${u.length
              ?u.join(', ')
              :'None'}
          </span>

        </div>

        ${
          history.length
          ?
          `
          <div class="savedRemarks">

            <div class="savedRemarksTitle">
              Saved Remarks
            </div>

            ${history.map((r,n)=>`

              <div class="savedRemarkItem">

                <span>
                  <b>${n+1}.</b>
                  ${esc(r)}
                </span>

              </div>

            `).join('')}

          </div>
          `
          :''
        }

        <label class="remarksLabel">
          Add New Remark
        </label>

        <textarea
          class="remarks"
          data-remark="${i}"
          placeholder="Type a new remark after calling..."
          oninput="setRemark(${i},this.value)"
        ></textarea>

        <button
          class="saveRemark"
          data-save-remark="${i}"
          onclick="saveRemark(${i})"
        >
          SAVE REMARK
        </button>

        <div class="actions">

          <button
            class="call"
            onclick="callNumber('${esc(c.phone)}')"
          >
            📞 CALL
          </button>

          <button
            onclick="toggleCalled('${encodeURIComponent(c.phone)}')"
          >
            ${c.called?'✓ CALLED':'Mark Called'}
          </button>

        </div>

        ${
          c.calledAt
          ?
          `
          <div class="calledAt">
            Called: ${esc(c.calledAt)}
          </div>
          `
          :''
        }

      </article>
      `;

    }).join('');
}

function callNumber(p){
  location.href=
    'tel:'+
    String(p).replace(
      /[^\d+]/g,
      ''
    );
}

function formatDate(d){

  const dd=
    String(d.getDate())
      .padStart(2,'0');

  const mm=
    String(d.getMonth()+1)
      .padStart(2,'0');

  const yyyy=
    d.getFullYear();

  return dd+'/'+mm+'/'+yyyy;
}

function toggleCalled(ep){

  const p=decodeURIComponent(ep);

  const c=contacts.find(
    x=>x.phone===p
  );

  if(c){

    c.called=!c.called;

    c.calledAt=
      c.called
      ?formatDate(new Date())
      :'';

    save();
    render();
  }
}


/* =========================
   SEARCH
   ========================= */

function updateSearchButton(){

  const btn=$('searchBtn');

  const input=$('search');

  if(btn&&input){

    btn.disabled=
      input.value.trim()==='';

  }
}

function runSearch(){

  const raw=
    $('search').value.trim();

  /* Do nothing if search box is empty */
  if(!raw){
    return;
  }

  const digits=
    raw.replace(/\D/g,'');

  /*
    If the search contains only numbers,
    require complete 10-digit number.
  */
  if(
    /^\d+$/.test(raw) &&
    digits.length!==10
  ){

    msg(
      'Enter the complete 10-digit contact number, then press SEARCH.'
    );

    return;
  }

  searchQuery=
    raw.toLowerCase();

  render();

  const found=
    contacts.some(c=>

      c.name
        .toLowerCase()
        .includes(searchQuery)

      ||

      c.phone
        .toLowerCase()
        .includes(searchQuery)

      ||

      String(c.remarks||'')
        .toLowerCase()
        .includes(searchQuery)

      ||

      (
        (c.remarksHistory||[])
          .join(' ')
      )
      .toLowerCase()
      .includes(searchQuery)

    );

  if(!found){

    msg('No Data Match');

  }else{

    msg('');

  }
}


/* =========================
   XLSX IMPORT
   ========================= */

async function readZip(buf){

  const b=new Uint8Array(buf);

  const dv=new DataView(buf);

  let eocd=-1;

  for(
    let i=b.length-22;
    i>=Math.max(0,b.length-65557);
    i--
  ){

    if(
      dv.getUint32(i,true)===0x06054b50
    ){

      eocd=i;
      break;

    }

  }

  if(eocd<0)
    throw Error(
      'Invalid XLSX/ZIP file'
    );

  const cdSize=
    dv.getUint32(
      eocd+12,
      true
    );

  const cdOff=
    dv.getUint32(
      eocd+16,
      true
    );

  let p=cdOff;

  let files={};

  while(
    p<cdOff+cdSize
  ){

    if(
      dv.getUint32(p,true)!==0x02014b50
    )
      break;

    const method=
      dv.getUint16(
        p+10,
        true
      );

    const cs=
      dv.getUint32(
        p+20,
        true
      );

    const us=
      dv.getUint32(
        p+24,
        true
      );

    const nl=
      dv.getUint16(
        p+28,
        true
      );

    const el=
      dv.getUint16(
        p+30,
        true
      );

    const cl=
      dv.getUint16(
        p+32,
        true
      );

    const off=
      dv.getUint32(
        p+42,
        true
      );

    const name=
      new TextDecoder()
        .decode(
          b.slice(
            p+46,
            p+46+nl
          )
        );

    files[name]={
      method,
      cs,
      us,
      off
    };

    p+=46+nl+el+cl;
  }

  async function get(name){

    const f=files[name];

    if(!f)
      throw Error(
        'Missing '+name
      );

    const q=f.off;

    const n=
      dv.getUint16(
        q+26,
        true
      );

    const m=
      dv.getUint16(
        q+28,
        true
      );

    const start=
      q+30+n+m;

    const raw=
      b.slice(
        start,
        start+f.cs
      );

    if(f.method===0)
      return raw;

    if(f.method===8){

      const ds=
        new DecompressionStream(
          'deflate-raw'
        );

      return new Uint8Array(
        await new Response(
          new Blob([raw])
            .stream()
            .pipeThrough(ds)
        ).arrayBuffer()
      );

    }

    throw Error(
      'Unsupported compression'
    );
  }

  return {
    files,
    get
  };
}

function xmlDoc(bytes){

  return new DOMParser()
    .parseFromString(
      new TextDecoder()
        .decode(bytes),
      'application/xml'
    );
}

function els(root,name){

  return Array.from(
    root.getElementsByTagNameNS(
      '*',
      name
    )
  );
}

function firstEl(root,name){

  return els(root,name)[0]||null;
}

async function parseXlsx(buf){

  const z=
    await readZip(buf);

  const shared=[];

  if(
    z.files['xl/sharedStrings.xml']
  ){

    const d=
      xmlDoc(
        await z.get(
          'xl/sharedStrings.xml'
        )
      );

    els(d,'si')
      .forEach(si=>

        shared.push(
          els(si,'t')
            .map(
              x=>x.textContent
            )
            .join('')
        )

      );
  }

  let sheet=
    'xl/worksheetsconst KEY='offline_contact_payment_v2';
let contacts=[];
let headers=[];
let years=[];
let searchQuery='';

const $=id=>document.getElementById(id);

function save(){
  localStorage.setItem(KEY,JSON.stringify({contacts,headers,years}));
}

function load(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY)||'{}');

    contacts=x.contacts||[];

    contacts.forEach(c=>{
      if(!Array.isArray(c.remarksHistory)){
        c.remarksHistory=c.remarks?[c.remarks]:[];
      }

      c.remarks='';
      c.draftRemark='';

      if(c.calledAt&&/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(c.calledAt)){
        const m=String(c.calledAt).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);

        c.calledAt=
          String(m[1]).padStart(2,'0')+
          String(m[2]).padStart(2,'0')+
          m[3];
      }
    });

    headers=x.headers||[];
    years=x.years||[];

  }catch(e){}
}

function esc(s){
  return String(s??'').replace(
    /[&<>"']/g,
    m=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[m])
  );
}

function isYear(h){
  return /^(19|20)\d{2}$/.test(String(h).trim());
}

function unpaid(c){
  return years.filter(
    y=>String(c.data[y]??'').trim()===''
  );
}

function renderFilters(){
  const yf=$('yearFilter');

  if(!yf)return;

  yf.innerHTML=
    '<option value="all">All contacts</option>'+
    years.map(y=>`<option value="${y}">${y}</option>`).join('');
}

function setRemark(i,v){
  const c=contacts[i];

  if(!c)return;

  c.draftRemark=v;
}

function saveRemark(i){
  const el=document.querySelector(
    '[data-remark="'+i+'"]'
  );

  if(!el)return;

  const text=el.value.trim();

  if(!text)return;

  const c=contacts[i];

  c.remarksHistory=
    Array.isArray(c.remarksHistory)
      ?c.remarksHistory
      :((c.remarks||'')?[c.remarks]:[]);

  c.remarksHistory.push(text);

  c.remarks='';
  c.draftRemark='';

  save();
  render();

  setTimeout(()=>{
    const card=document.querySelector(
      '[data-card="'+i+'"]'
    );

    if(card){
      card.scrollIntoView({
        block:'nearest'
      });
    }
  },0);
}

function stats(){
  const total=contacts.length;

  const full=contacts.filter(
    c=>unpaid(c).length===0
  ).length;

  const notCalled=contacts.filter(
    c=>!c.called
  ).length;

  const called=total-notCalled;

  const yf=$('yearFilter');

  const y=yf?yf.value:'all';

  let extra='';

  if(y!=='all'){
    const py=contacts.filter(
      c=>String(c.data[y]??'').trim()!==''
    ).length;

    extra=
      `<div class="stat">
        <b>${py}</b>
        <span>Paid ${y}</span>
      </div>
      <div class="stat bad">
        <b>${total-py}</b>
        <span>Unpaid ${y}</span>
      </div>`;
  }

  $('stats').innerHTML=
    `<button class="stat statBtn ${activeView==='total'?'active':''}" onclick="setView('total')">
      <b>${total}</b>
      <span>Total</span>
    </button>

    <div class="stat ok">
      <b>${full}</b>
      <span>Fully Paid</span>
    </div>

    <div class="stat bad">
      <b>${total-full}</b>
      <span>Has Unpaid</span>
    </div>

    <button class="stat statBtn ${activeView==='notCalled'?'active':''}" onclick="setView('notCalled')">
      <b>${notCalled}</b>
      <span>Not Called</span>
    </button>

    <button class="stat statBtn ${activeView==='called'?'active':''}" onclick="setView('called')">
      <b>${called}</b>
      <span>Total Called</span>
    </button>

    ${extra}`;
}

let activeView='total';

function setView(v){
  activeView=v;
  render();
}

function goTop(){
  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
}

function updateTopButton(){
  const b=$('topBtn');

  if(!b)return;

  const y=Math.max(
    window.scrollY||0,
    document.documentElement.scrollTop||0,
    document.body.scrollTop||0
  );

  b.classList.toggle(
    'show',
    y>250
  );
}

window.addEventListener(
  'scroll',
  updateTopButton,
  {
    passive:true,
    capture:true
  }
);

document.addEventListener(
  'scroll',
  updateTopButton,
  {
    passive:true,
    capture:true
  }
);

window.addEventListener(
  'touchmove',
  updateTopButton,
  {
    passive:true
  }
);

window.addEventListener(
  'resize',
  updateTopButton
);

setInterval(
  updateTopButton,
  500
);

function render(){

  const q=searchQuery;

  const yf=$('yearFilter');
  const yearFilter=yf?yf.value:'all';

  let arr=contacts.filter(c=>

    (
      activeView==='total' ||

      (
        activeView==='notCalled' &&
        !c.called
      ) ||

      (
        activeView==='called' &&
        c.called
      )
    )

    &&

    (
      !q ||

      c.name
        .toLowerCase()
        .includes(q)

      ||

      c.phone
        .toLowerCase()
        .includes(q)

      ||

      String(c.remarks||'')
        .toLowerCase()
        .includes(q)

      ||

      (
        (c.remarksHistory||[])
          .join(' ')
      )
      .toLowerCase()
      .includes(q)
    )

    &&

    (
      yearFilter==='all' ||
      unpaid(c).includes(yearFilter)
    )
  );

  stats();

  $('summary').textContent=
    `${arr.length} shown • ${contacts.length} total`;

  if(!arr.length){

    $('list').innerHTML=
      '<div class="empty">'+
      'No contacts found.<br>'+
      'Import an Excel file to begin.'+
      '</div>';

    return;
  }

  $('list').innerHTML=
    arr.map(c=>{

      const u=unpaid(c);

      const p=u.length===0;

      const i=contacts.indexOf(c);

      const paidYears=
        years.filter(
          y=>!u.includes(y)
        );

      const history=
        Array.isArray(c.remarksHistory)
          ?c.remarksHistory
          :((c.remarks||'')
            ?[c.remarks]
            :[]);

      return `
      <article
        class="card ${c.called?'called':''}"
        data-card="${i}"
      >

        <div class="top">

          <div>

            <div class="name">
              ${esc(c.name||'Unnamed')}
            </div>

            <div class="phone">
              ${esc(c.phone)}
            </div>

          </div>

          <div class="status ${p?'paid':'unpaid'}">
            ${p?'FULLY PAID':'HAS UNPAID'}
          </div>

        </div>

        <div class="yearsTitle">
          Payment by Year
        </div>

        <div class="years">

          ${years.map(y=>{

            const ok=!u.includes(y);

            return `
            <span
              class="year ${ok?'yearPaid':'yearUnpaid'}"
            >
              <b>${esc(y)}</b>:
              ${ok?'PAID':'NOT PAID'}
            </span>
            `;

          }).join('')}

        </div>

        <div class="yearSummary">

          <span class="paidText">
            <b>Paid years:</b>
            ${paidYears.length
              ?paidYears.join(', ')
              :'None'}
          </span>

          <span class="unpaidText">
            <b>Unpaid years:</b>
            ${u.length
              ?u.join(', ')
              :'None'}
          </span>

        </div>

        ${
          history.length
          ?
          `
          <div class="savedRemarks">

            <div class="savedRemarksTitle">
              Saved Remarks
            </div>

            ${history.map((r,n)=>`

              <div class="savedRemarkItem">

                <span>
                  <b>${n+1}.</b>
                  ${esc(r)}
                </span>

              </div>

            `).join('')}

          </div>
          `
          :''
        }

        <label class="remarksLabel">
          Add New Remark
        </label>

        <textarea
          class="remarks"
          data-remark="${i}"
          placeholder="Type a new remark after calling..."
          oninput="setRemark(${i},this.value)"
        ></textarea>

        <button
          class="saveRemark"
          data-save-remark="${i}"
          onclick="saveRemark(${i})"
        >
          SAVE REMARK
        </button>

        <div class="actions">

          <button
            class="call"
            onclick="callNumber('${esc(c.phone)}')"
          >
            📞 CALL
          </button>

          <button
            onclick="toggleCalled('${encodeURIComponent(c.phone)}')"
          >
            ${c.called?'✓ CALLED':'Mark Called'}
          </button>

        </div>

        ${
          c.calledAt
          ?
          `
          <div class="calledAt">
            Called: ${esc(c.calledAt)}
          </div>
          `
          :''
        }

      </article>
      `;

    }).join('');
}

function callNumber(p){
  location.href=
    'tel:'+
    String(p).replace(
      /[^\d+]/g,
      ''
    );
}

function formatDate(d){

  const dd=
    String(d.getDate())
      .padStart(2,'0');

  const mm=
    String(d.getMonth()+1)
      .padStart(2,'0');

  const yyyy=
    d.getFullYear();

  return dd+'/'+mm+'/'+yyyy;
}

function toggleCalled(ep){

  const p=decodeURIComponent(ep);

  const c=contacts.find(
    x=>x.phone===p
  );

  if(c){

    c.called=!c.called;

    c.calledAt=
      c.called
      ?formatDate(new Date())
      :'';

    save();
    render();
  }
}


/* =========================
   SEARCH
   ========================= */

function updateSearchButton(){

  const btn=$('searchBtn');

  const input=$('search');

  if(btn&&input){

    btn.disabled=
      input.value.trim()==='';

  }
}

function runSearch(){

  const raw=
    $('search').value.trim();

  /* Do nothing if search box is empty */
  if(!raw){
    return;
  }

  const digits=
    raw.replace(/\D/g,'');

  /*
    If the search contains only numbers,
    require complete 10-digit number.
  */
  if(
    /^\d+$/.test(raw) &&
    digits.length!==10
  ){

    msg(
      'Enter the complete 10-digit contact number, then press SEARCH.'
    );

    return;
  }

  searchQuery=
    raw.toLowerCase();

  render();

  const found=
    contacts.some(c=>

      c.name
        .toLowerCase()
        .includes(searchQuery)

      ||

      c.phone
        .toLowerCase()
        .includes(searchQuery)

      ||

      String(c.remarks||'')
        .toLowerCase()
        .includes(searchQuery)

      ||

      (
        (c.remarksHistory||[])
          .join(' ')
      )
      .toLowerCase()
      .includes(searchQuery)

    );

  if(!found){

    msg('No Data Match');

  }else{

    msg('');

  }
}


/* =========================
   XLSX IMPORT
   ========================= */

async function readZip(buf){

  const b=new Uint8Array(buf);

  const dv=new DataView(buf);

  let eocd=-1;

  for(
    let i=b.length-22;
    i>=Math.max(0,b.length-65557);
    i--
  ){

    if(
      dv.getUint32(i,true)===0x06054b50
    ){

      eocd=i;
      break;

    }

  }

  if(eocd<0)
    throw Error(
      'Invalid XLSX/ZIP file'
    );

  const cdSize=
    dv.getUint32(
      eocd+12,
      true
    );

  const cdOff=
    dv.getUint32(
      eocd+16,
      true
    );

  let p=cdOff;

  let files={};

  while(
    p<cdOff+cdSize
  ){

    if(
      dv.getUint32(p,true)!==0x02014b50
    )
      break;

    const method=
      dv.getUint16(
        p+10,
        true
      );

    const cs=
      dv.getUint32(
        p+20,
        true
      );

    const us=
      dv.getUint32(
        p+24,
        true
      );

    const nl=
      dv.getUint16(
        p+28,
        true
      );

    const el=
      dv.getUint16(
        p+30,
        true
      );

    const cl=
      dv.getUint16(
        p+32,
        true
      );

    const off=
      dv.getUint32(
        p+42,
        true
      );

    const name=
      new TextDecoder()
        .decode(
          b.slice(
            p+46,
            p+46+nl
          )
        );

    files[name]={
      method,
      cs,
      us,
      off
    };

    p+=46+nl+el+cl;
  }

  async function get(name){

    const f=files[name];

    if(!f)
      throw Error(
        'Missing '+name
      );

    const q=f.off;

    const n=
      dv.getUint16(
        q+26,
        true
      );

    const m=
      dv.getUint16(
        q+28,
        true
      );

    const start=
      q+30+n+m;

    const raw=
      b.slice(
        start,
        start+f.cs
      );

    if(f.method===0)
      return raw;

    if(f.method===8){

      const ds=
        new DecompressionStream(
          'deflate-raw'
        );

      return new Uint8Array(
        await new Response(
          new Blob([raw])
            .stream()
            .pipeThrough(ds)
        ).arrayBuffer()
      );

    }

    throw Error(
      'Unsupported compression'
    );
  }

  return {
    files,
    get
  };
}

function xmlDoc(bytes){

  return new DOMParser()
    .parseFromString(
      new TextDecoder()
        .decode(bytes),
      'application/xml'
    );
}

function els(root,name){

  return Array.from(
    root.getElementsByTagNameNS(
      '*',
      name
    )
  );
}

function firstEl(root,name){

  return els(root,name)[0]||null;
}

async function parseXlsx(buf){

  const z=
    await readZip(buf);

  const shared=[];

  if(
    z.files['xl/sharedStrings.xml']
  ){

    const d=
      xmlDoc(
        await z.get(
          'xl/sharedStrings.xml'
        )
      );

    els(d,'si')
      .forEach(si=>

        shared.push(
          els(si,'t')
            .map(
              x=>x.textContent
            )
            .join('')
        )

      );
  }

  let sheet=
    'xl/worksheetsconst KEY='offline_contact_payment_v2';
let contacts=[];
let headers=[];
let years=[];
let searchQuery='';

const $=id=>document.getElementById(id);

function save(){
  localStorage.setItem(KEY,JSON.stringify({contacts,headers,years}));
}

function load(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY)||'{}');

    contacts=x.contacts||[];

    contacts.forEach(c=>{
      if(!Array.isArray(c.remarksHistory)){
        c.remarksHistory=c.remarks?[c.remarks]:[];
      }

      c.remarks='';
      c.draftRemark='';

      if(c.calledAt&&/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(c.calledAt)){
        const m=String(c.calledAt).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);

        c.calledAt=
          String(m[1]).padStart(2,'0')+
          String(m[2]).padStart(2,'0')+
          m[3];
      }
    });

    headers=x.headers||[];
    years=x.years||[];

  }catch(e){}
}

function esc(s){
  return String(s??'').replace(
    /[&<>"']/g,
    m=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[m])
  );
}

function isYear(h){
  return /^(19|20)\d{2}$/.test(String(h).trim());
}

function unpaid(c){
  return years.filter(
    y=>String(c.data[y]??'').trim()===''
  );
}

function renderFilters(){
  const yf=$('yearFilter');

  if(!yf)return;

  yf.innerHTML=
    '<option value="all">All contacts</option>'+
    years.map(y=>`<option value="${y}">${y}</option>`).join('');
}

function setRemark(i,v){
  const c=contacts[i];

  if(!c)return;

  c.draftRemark=v;
}

function saveRemark(i){
  const el=document.querySelector(
    '[data-remark="'+i+'"]'
  );

  if(!el)return;

  const text=el.value.trim();

  if(!text)return;

  const c=contacts[i];

  c.remarksHistory=
    Array.isArray(c.remarksHistory)
      ?c.remarksHistory
      :((c.remarks||'')?[c.remarks]:[]);

  c.remarksHistory.push(text);

  c.remarks='';
  c.draftRemark='';

  save();
  render();

  setTimeout(()=>{
    const card=document.querySelector(
      '[data-card="'+i+'"]'
    );

    if(card){
      card.scrollIntoView({
        block:'nearest'
      });
    }
  },0);
}

function stats(){
  const total=contacts.length;

  const full=contacts.filter(
    c=>unpaid(c).length===0
  ).length;

  const notCalled=contacts.filter(
    c=>!c.called
  ).length;

  const called=total-notCalled;

  const yf=$('yearFilter');

  const y=yf?yf.value:'all';

  let extra='';

  if(y!=='all'){
    const py=contacts.filter(
      c=>String(c.data[y]??'').trim()!==''
    ).length;

    extra=
      `<div class="stat">
        <b>${py}</b>
        <span>Paid ${y}</span>
      </div>
      <div class="stat bad">
        <b>${total-py}</b>
        <span>Unpaid ${y}</span>
      </div>`;
  }

  $('stats').innerHTML=
    `<button class="stat statBtn ${activeView==='total'?'active':''}" onclick="setView('total')">
      <b>${total}</b>
      <span>Total</span>
    </button>

    <div class="stat ok">
      <b>${full}</b>
      <span>Fully Paid</span>
    </div>

    <div class="stat bad">
      <b>${total-full}</b>
      <span>Has Unpaid</span>
    </div>

    <button class="stat statBtn ${activeView==='notCalled'?'active':''}" onclick="setView('notCalled')">
      <b>${notCalled}</b>
      <span>Not Called</span>
    </button>

    <button class="stat statBtn ${activeView==='called'?'active':''}" onclick="setView('called')">
      <b>${called}</b>
      <span>Total Called</span>
    </button>

    ${extra}`;
}

let activeView='total';

function setView(v){
  activeView=v;
  render();
}

function goTop(){
  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
}

function updateTopButton(){
  const b=$('topBtn');

  if(!b)return;

  const y=Math.max(
    window.scrollY||0,
    document.documentElement.scrollTop||0,
    document.body.scrollTop||0
  );

  b.classList.toggle(
    'show',
    y>250
  );
}

window.addEventListener(
  'scroll',
  updateTopButton,
  {
    passive:true,
    capture:true
  }
);

document.addEventListener(
  'scroll',
  updateTopButton,
  {
    passive:true,
    capture:true
  }
);

window.addEventListener(
  'touchmove',
  updateTopButton,
  {
    passive:true
  }
);

window.addEventListener(
  'resize',
  updateTopButton
);

setInterval(
  updateTopButton,
  500
);

function render(){

  const q=searchQuery;

  const yf=$('yearFilter');
  const yearFilter=yf?yf.value:'all';

  let arr=contacts.filter(c=>

    (
      activeView==='total' ||

      (
        activeView==='notCalled' &&
        !c.called
      ) ||

      (
        activeView==='called' &&
        c.called
      )
    )

    &&

    (
      !q ||

      c.name
        .toLowerCase()
        .includes(q)

      ||

      c.phone
        .toLowerCase()
        .includes(q)

      ||

      String(c.remarks||'')
        .toLowerCase()
        .includes(q)

      ||

      (
        (c.remarksHistory||[])
          .join(' ')
      )
      .toLowerCase()
      .includes(q)
    )

    &&

    (
      yearFilter==='all' ||
      unpaid(c).includes(yearFilter)
    )
  );

  stats();

  $('summary').textContent=
    `${arr.length} shown • ${contacts.length} total`;

  if(!arr.length){

    $('list').innerHTML=
      '<div class="empty">'+
      'No contacts found.<br>'+
      'Import an Excel file to begin.'+
      '</div>';

    return;
  }

  $('list').innerHTML=
    arr.map(c=>{

      const u=unpaid(c);

      const p=u.length===0;

      const i=contacts.indexOf(c);

      const paidYears=
        years.filter(
          y=>!u.includes(y)
        );

      const history=
        Array.isArray(c.remarksHistory)
          ?c.remarksHistory
          :((c.remarks||'')
            ?[c.remarks]
            :[]);

      return `
      <article
        class="card ${c.called?'called':''}"
        data-card="${i}"
      >

        <div class="top">

          <div>

            <div class="name">
              ${esc(c.name||'Unnamed')}
            </div>

            <div class="phone">
              ${esc(c.phone)}
            </div>

          </div>

          <div class="status ${p?'paid':'unpaid'}">
            ${p?'FULLY PAID':'HAS UNPAID'}
          </div>

        </div>

        <div class="yearsTitle">
          Payment by Year
        </div>

        <div class="years">

          ${years.map(y=>{

            const ok=!u.includes(y);

            return `
            <span
              class="year ${ok?'yearPaid':'yearUnpaid'}"
            >
              <b>${esc(y)}</b>:
              ${ok?'PAID':'NOT PAID'}
            </span>
            `;

          }).join('')}

        </div>

        <div class="yearSummary">

          <span class="paidText">
            <b>Paid years:</b>
            ${paidYears.length
              ?paidYears.join(', ')
              :'None'}
          </span>

          <span class="unpaidText">
            <b>Unpaid years:</b>
            ${u.length
              ?u.join(', ')
              :'None'}
          </span>

        </div>

        ${
          history.length
          ?
          `
          <div class="savedRemarks">

            <div class="savedRemarksTitle">
              Saved Remarks
            </div>

            ${history.map((r,n)=>`

              <div class="savedRemarkItem">

                <span>
                  <b>${n+1}.</b>
                  ${esc(r)}
                </span>

              </div>

            `).join('')}

          </div>
          `
          :''
        }

        <label class="remarksLabel">
          Add New Remark
        </label>

        <textarea
          class="remarks"
          data-remark="${i}"
          placeholder="Type a new remark after calling..."
          oninput="setRemark(${i},this.value)"
        ></textarea>

        <button
          class="saveRemark"
          data-save-remark="${i}"
          onclick="saveRemark(${i})"
        >
          SAVE REMARK
        </button>

        <div class="actions">

          <button
            class="call"
            onclick="callNumber('${esc(c.phone)}')"
          >
            📞 CALL
          </button>

          <button
            onclick="toggleCalled('${encodeURIComponent(c.phone)}')"
          >
            ${c.called?'✓ CALLED':'Mark Called'}
          </button>

        </div>

        ${
          c.calledAt
          ?
          `
          <div class="calledAt">
            Called: ${esc(c.calledAt)}
          </div>
          `
          :''
        }

      </article>
      `;

    }).join('');
}

function callNumber(p){
  location.href=
    'tel:'+
    String(p).replace(
      /[^\d+]/g,
      ''
    );
}

function formatDate(d){

  const dd=
    String(d.getDate())
      .padStart(2,'0');

  const mm=
    String(d.getMonth()+1)
      .padStart(2,'0');

  const yyyy=
    d.getFullYear();

  return dd+'/'+mm+'/'+yyyy;
}

function toggleCalled(ep){

  const p=decodeURIComponent(ep);

  const c=contacts.find(
    x=>x.phone===p
  );

  if(c){

    c.called=!c.called;

    c.calledAt=
      c.called
      ?formatDate(new Date())
      :'';

    save();
    render();
  }
}


/* =========================
   SEARCH
   ========================= */

function updateSearchButton(){

  const btn=$('searchBtn');

  const input=$('search');

  if(btn&&input){

    btn.disabled=
      input.value.trim()==='';

  }
}

function runSearch(){

  const raw=
    $('search').value.trim();

  /* Do nothing if search box is empty */
  if(!raw){
    return;
  }

  const digits=
    raw.replace(/\D/g,'');

  /*
    If the search contains only numbers,
    require complete 10-digit number.
  */
  if(
    /^\d+$/.test(raw) &&
    digits.length!==10
  ){

    msg(
      'Enter the complete 10-digit contact number, then press SEARCH.'
    );

    return;
  }

  searchQuery=
    raw.toLowerCase();

  render();

  const found=
    contacts.some(c=>

      c.name
        .toLowerCase()
        .includes(searchQuery)

      ||

      c.phone
        .toLowerCase()
        .includes(searchQuery)

      ||

      String(c.remarks||'')
        .toLowerCase()
        .includes(searchQuery)

      ||

      (
        (c.remarksHistory||[])
          .join(' ')
      )
      .toLowerCase()
      .includes(searchQuery)

    );

  if(!found){

    msg('No Data Match');

  }else{

    msg('');

  }
}


/* =========================
   XLSX IMPORT
   ========================= */

async function readZip(buf){

  const b=new Uint8Array(buf);

  const dv=new DataView(buf);

  let eocd=-1;

  for(
    let i=b.length-22;
    i>=Math.max(0,b.length-65557);
    i--
  ){

    if(
      dv.getUint32(i,true)===0x06054b50
    ){

      eocd=i;
      break;

    }

  }

  if(eocd<0)
    throw Error(
      'Invalid XLSX/ZIP file'
    );

  const cdSize=
    dv.getUint32(
      eocd+12,
      true
    );

  const cdOff=
    dv.getUint32(
      eocd+16,
      true
    );

  let p=cdOff;

  let files={};

  while(
    p<cdOff+cdSize
  ){

    if(
      dv.getUint32(p,true)!==0x02014b50
    )
      break;

    const method=
      dv.getUint16(
        p+10,
        true
      );

    const cs=
      dv.getUint32(
        p+20,
        true
      );

    const us=
      dv.getUint32(
        p+24,
        true
      );

    const nl=
      dv.getUint16(
        p+28,
        true
      );

    const el=
      dv.getUint16(
        p+30,
        true
      );

    const cl=
      dv.getUint16(
        p+32,
        true
      );

    const off=
      dv.getUint32(
        p+42,
        true
      );

    const name=
      new TextDecoder()
        .decode(
          b.slice(
            p+46,
            p+46+nl
          )
        );

    files[name]={
      method,
      cs,
      us,
      off
    };

    p+=46+nl+el+cl;
  }

  async function get(name){

    const f=files[name];

    if(!f)
      throw Error(
        'Missing '+name
      );

    const q=f.off;

    const n=
      dv.getUint16(
        q+26,
        true
      );

    const m=
      dv.getUint16(
        q+28,
        true
      );

    const start=
      q+30+n+m;

    const raw=
      b.slice(
        start,
        start+f.cs
      );

    if(f.method===0)
      return raw;

    if(f.method===8){

      const ds=
        new DecompressionStream(
          'deflate-raw'
        );

      return new Uint8Array(
        await new Response(
          new Blob([raw])
            .stream()
            .pipeThrough(ds)
        ).arrayBuffer()
      );

    }

    throw Error(
      'Unsupported compression'
    );
  }

  return {
    files,
    get
  };
}

function xmlDoc(bytes){

  return new DOMParser()
    .parseFromString(
      new TextDecoder()
        .decode(bytes),
      'application/xml'
    );
}

function els(root,name){

  return Array.from(
    root.getElementsByTagNameNS(
      '*',
      name
    )
  );
}

function firstEl(root,name){

  return els(root,name)[0]||null;
}

async function parseXlsx(buf){

  const z=
    await readZip(buf);

  const shared=[];

  if(
    z.files['xl/sharedStrings.xml']
  ){

    const d=
      xmlDoc(
        await z.get(
          'xl/sharedStrings.xml'
        )
      );

    els(d,'si')
      .forEach(si=>

        shared.push(
          els(si,'t')
            .map(
              x=>x.textContent
            )
            .join('')
        )

      );
  }

  let sheet=
    'xl/worksheets
