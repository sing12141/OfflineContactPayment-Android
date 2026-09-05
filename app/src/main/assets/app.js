const KEY='offline_contact_payment_v2';

let contacts=[];
let headers=[];
let years=[];
let searchQuery='';
let activeView='total';

const $=id=>document.getElementById(id);


/* =========================
   SAVE / LOAD
   ========================= */

function save(){
  localStorage.setItem(
    KEY,
    JSON.stringify({
      contacts,
      headers,
      years
    })
  );
}

function load(){

  try{

    const x=
      JSON.parse(
        localStorage.getItem(KEY)||'{}'
      );

    contacts=x.contacts||[];

    contacts.forEach(c=>{

      if(!Array.isArray(c.remarksHistory)){

        c.remarksHistory=
          c.remarks
            ?[c.remarks]
            :[];

      }

      c.remarks='';
      c.draftRemark='';

      if(
        c.calledAt &&
        /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/
          .test(c.calledAt)
      ){

        const m=
          String(c.calledAt).match(
            /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/
          );

        c.calledAt=
          String(m[1]).padStart(2,'0')+
          '/' +
          String(m[2]).padStart(2,'0')+
          '/' +
          m[3];

      }

    });

    headers=x.headers||[];
    years=x.years||[];

  }catch(e){}

}


/* =========================
   HELPERS
   ========================= */

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

  return /^(19|20)\d{2}$/.test(
    String(h).trim()
  );

}

function unpaid(c){

  return years.filter(
    y=>String(c.data[y]??'').trim()===''
  );

}


/* =========================
   REMARKS
   ========================= */

function setRemark(i,v){

  const c=contacts[i];

  if(!c)return;

  c.draftRemark=v;

}

function saveRemark(i){

  const el=
    document.querySelector(
      '[data-remark="'+i+'"]'
    );

  if(!el)return;

  const text=
    el.value.trim();

  if(!text)return;

  const c=contacts[i];

  c.remarksHistory=
    Array.isArray(c.remarksHistory)
      ?c.remarksHistory
      :((c.remarks||'')
        ?[c.remarks]
        :[]);

  c.remarksHistory.push(text);

  c.remarks='';
  c.draftRemark='';

  save();
  render();

  setTimeout(()=>{

    const card=
      document.querySelector(
        '[data-card="'+i+'"]'
      );

    if(card){

      card.scrollIntoView({
        block:'nearest'
      });

    }

  },0);

}


/* =========================
   EDIT / DELETE REMARKS
   ========================= */

function closeRemarkModal(){

  const m=$('remarkModal');

  if(m){
    m.remove();
  }

}

function showRemarkModal(type,i,n){

  const c=contacts[i];

  if(!c)return;

  if(!Array.isArray(c.remarksHistory))return;

  const oldText=c.remarksHistory[n];

  if(oldText===undefined)return;

  closeRemarkModal();

  const modal=document.createElement('div');

  modal.id='remarkModal';
  modal.className='remarkModal';

  if(type==='edit'){

    modal.innerHTML=`

      <div class="remarkModalBox">

        <div class="remarkModalTitle">
          Edit Remark
        </div>

        <textarea
          id="editRemarkText"
          class="remarkModalInput"
        >${esc(oldText)}</textarea>

        <div class="remarkModalActions">

          <button
            type="button"
            class="remarkCancelBtn"
            onclick="closeRemarkModal()"
          >
            Cancel
          </button>

          <button
            type="button"
            class="remarkSaveBtn"
            onclick="saveEditedRemark(${i},${n})"
          >
            Save
          </button>

        </div>

      </div>

    `;

  }else{

    modal.innerHTML=`

      <div class="remarkModalBox">

        <div class="remarkModalTitle">
          Delete Remark
        </div>

        <div class="remarkDeleteText">
          Delete this remark?
        </div>

        <div class="remarkDeletePreview">
          ${esc(oldText)}
        </div>

        <div class="remarkModalActions">

          <button
            type="button"
            class="remarkCancelBtn"
            onclick="closeRemarkModal()"
          >
            Cancel
          </button>

          <button
            type="button"
            class="remarkDeleteConfirmBtn"
            onclick="confirmDeleteRemark(${i},${n})"
          >
            Delete
          </button>

        </div>

      </div>

    `;

  }

  document.body.appendChild(modal);

  if(type==='edit'){

    const input=$('editRemarkText');

    if(input){

      input.focus();

      input.setSelectionRange(
        input.value.length,
        input.value.length
      );

    }

  }

}

function editRemark(i,n){

  showRemarkModal(
    'edit',
    i,
    n
  );

}

function saveEditedRemark(i,n){

  const c=contacts[i];

  if(!c)return;

  if(!Array.isArray(c.remarksHistory))return;

  const input=$('editRemarkText');

  if(!input)return;

  const text=input.value.trim();

  if(!text)return;

  if(c.remarksHistory[n]===undefined)return;

  c.remarksHistory[n]=text;

  save();

  closeRemarkModal();

  render();

}

function deleteRemark(i,n){

  showRemarkModal(
    'delete',
    i,
    n
  );

}

function confirmDeleteRemark(i,n){

  const c=contacts[i];

  if(!c)return;

  if(!Array.isArray(c.remarksHistory))return;

  if(c.remarksHistory[n]===undefined)return;

  c.remarksHistory.splice(
    n,
    1
  );

  save();

  closeRemarkModal();

  render();

}


/* =========================
   DASHBOARD
   ========================= */

function stats(){

  const total=
    contacts.length;

  const full=
    contacts.filter(
      c=>unpaid(c).length===0
    ).length;

  const notCalled=
    contacts.filter(
      c=>!c.called
    ).length;

  const called=
    total-notCalled;

  $('stats').innerHTML=

    `<button
      class="stat statBtn ${activeView==='total'?'active':''}"
      onclick="setView('total')"
    >
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

    <button
      class="stat statBtn ${activeView==='notCalled'?'active':''}"
      onclick="setView('notCalled')"
    >
      <b>${notCalled}</b>
      <span>Not Called</span>
    </button>

    <button
      class="stat statBtn ${activeView==='called'?'active':''}"
      onclick="setView('called')"
    >
      <b>${called}</b>
      <span>Total Called</span>
    </button>`;

}

function setView(v){

  activeView=v;

  render();

}


/* =========================
   GO TO TOP
   ========================= */

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


/* =========================
   RENDER CONTACTS
   ========================= */

function render(){

  const q=searchQuery;

  let arr=
    contacts.filter(c=>

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

      const u=
        unpaid(c);

      const p=
        u.length===0;

      const i=
        contacts.indexOf(c);

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

            const ok=
              !u.includes(y);

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

            ${
              paidYears.length
                ?paidYears.join(', ')
                :'None'
            }

          </span>


          <span class="unpaidText">

            <b>Unpaid years:</b>

            ${
              u.length
                ?u.join(', ')
                :'None'
            }

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

                <span class="savedRemarkText">
                  <b>${n+1}.</b> ${esc(r)}
                </span>

                <div class="remarkActions">

                  <button
                    class="remarkEditBtn"
                    onclick="editRemark(${i},${n})"
                    type="button"
                  >
                    Edit
                  </button>

                  <button
                    class="remarkDeleteBtn"
                    onclick="deleteRemark(${i},${n})"
                    type="button"
                  >
                    Delete
                  </button>

                </div>

              </div>

            `).join('')}

          </div>

          `

          :

          ''
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
            ${
              c.called
                ?'✓ CALLED'
                :'Mark Called'
            }
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

          :

          ''
        }


      </article>

      `;

    }).join('');

}


/* =========================
   CALL
   ========================= */

function callNumber(p){

  location.href=
    'tel:'+
    String(p).replace(
      /[^\d+]/g,
      ''
    );

}


/* =========================
   DATE
   ========================= */

function formatDate(d){

  const dd=
    String(
      d.getDate()
    ).padStart(2,'0');

  const mm=
    String(
      d.getMonth()+1
    ).padStart(2,'0');

  const yyyy=
    d.getFullYear();

  return(
    dd+'/'+mm+'/'+yyyy
  );

}


/* =========================
   MARK CALLED
   ========================= */

function toggleCalled(ep){

  const p=
    decodeURIComponent(ep);

  const c=
    contacts.find(
      x=>x.phone===p
    );

  if(c){

    c.called=
      !c.called;

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

  const btn=
    $('searchBtn');

  const input=
    $('search');

  if(btn&&input){

    btn.disabled=
      input.value.trim()==='';

  }

}


function runSearch(){

  const raw=
    $('search').value.trim();


  /* Empty search does nothing */

  if(!raw){

    return;

  }


  const digits=
    raw.replace(/\D/g,'');


  /*
    Numeric search must be
    complete 10-digit number.
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

    msg(
      'No Data Match'
    );

  }else{

    msg('');

  }

}


/* =========================
   XLSX IMPORT - ZIP READER
   ========================= */

async function readZip(buf){

  const b=
    new Uint8Array(buf);

  const dv=
    new DataView(buf);

  let eocd=-1;


  for(
    let i=b.length-22;
    i>=Math.max(
      0,
      b.length-65557
    );
    i--
  ){

    if(
      dv.getUint32(i,true)===
      0x06054b50
    ){

      eocd=i;

      break;

    }

  }


  if(eocd<0){

    throw Error(
      'Invalid XLSX/ZIP file'
    );

  }


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
      dv.getUint32(p,true)!==
      0x02014b50
    ){

      break;

    }


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


    p+=
      46+
      nl+
      el+
      cl;

  }


  async function get(name){

    const f=
      files[name];

    if(!f){

      throw Error(
        'Missing '+name
      );

    }


    const q=
      f.off;

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


    if(f.method===0){

      return raw;

    }


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


  return{
    files,
    get
  };

}


/* =========================
   XML
   ========================= */

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

  return(
    els(root,name)[0]||null
  );

}


/* =========================
   XLSX PARSER
   ========================= */

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
      .forEach(si=>{

        shared.push(

          els(si,'t')
            .map(
              x=>x.textContent
            )
            .join('')

        );

      });

  }


  let sheet=
    'xl/worksheets/sheet1.xml';


  if(!z.files[sheet]){

    const names=
      Object.keys(z.files)
        .filter(
          x=>
            /^xl\/worksheets\/sheet\d+\.xml$/
              .test(x)
        );


    if(!names.length){

      throw Error(
        'No worksheet found'
      );

    }


    sheet=
      names[0];

  }


  const d=
    xmlDoc(
      await z.get(sheet)
    );


  const rows=[];


  els(d,'row')
    .forEach(r=>{

      const vals=[];


      els(r,'c')
        .forEach(c=>{

          const ref=
            c.getAttribute('r')||'';


          const m=
            ref.match(
              /([A-Z]+)\d+/
            );


          if(!m)return;


          let col=0;


          for(
            const ch of m[1]
          ){

            col=
              col*26+
              ch.charCodeAt(0)-64;

          }


          col--;


          while(
            vals.length<col
          ){

            vals.push('');

          }


          const ve=
            firstEl(c,'v');


          let v=
            ve?.textContent??'';


          if(
            c.getAttribute('t')==='s'
          ){

            v=
              shared[
                Number(v)
              ]??'';

          }


          else if(
            c.getAttribute('t')===
            'inlineStr'
          ){

            v=
              els(c,'t')
                .map(
                  x=>x.textContent
                )
                .join('');

          }


          vals[col]=v;

        });


      rows.push(vals);

    });


  return rows;

}


/* =========================
   IMPORT EXCEL
   ========================= */

async function importFile(file){

  if(!file){

    throw Error(
      'Please select an Excel file.'
    );

  }


  const rows=
    await parseXlsx(
      await file.arrayBuffer()
    );


  if(!rows.length){

    throw Error(
      'Empty worksheet'
    );

  }


  headers=
    rows[0].map(
      x=>String(x).trim()
    );


  const lower=
    headers.map(
      x=>String(x).toLowerCase()
    );


  const ni=
    lower.findIndex(
      x=>
        [
          'name',
          'full name',
          'candidate name'
        ].includes(x)
    );


  const pi=
    lower.findIndex(
      x=>
        [
          'contact',
          'phone',
          'mobile',
          'mobile no',
          'phone number',
          'contact number'
        ].includes(x)
    );


  if(pi<0){

    throw Error(
      'Contact/Phone/Mobile column not found'
    );

  }


  years=
    headers.filter(isYear);


  if(!years.length){

    throw Error(
      'No year columns found, e.g. 2022, 2023, 2024, 2025'
    );

  }


  contacts=
    rows
      .slice(1)
      .filter(
        r=>
          r.some(
            v=>
              String(v??'').trim()!==''
          )
      )
      .map(r=>{

        const data={};


        headers.forEach(
          (h,i)=>{

            data[h]=
              String(
                r[i]??''
              ).trim();

          }
        );


        return{

          name:
            ni>=0
              ?String(
                r[ni]??''
              ).trim()
              :'',

          phone:
            String(
              r[pi]??''
            ).trim(),

          data,

          remarks:'',

          remarksHistory:[],

          draftRemark:'',

          called:false,

          calledAt:''

        };

      });


  /* Clear any previous search after new import */

  searchQuery='';


  save();

  render();

  updateSearchButton();

}


/* =========================
   MESSAGE
   ========================= */

function msg(t){

  const m=
    $('message');

  if(!m)return;

  m.textContent=
    t||'';

  m.classList.toggle(
    'show',
    !!t
  );

}


/* =========================
   BUTTONS
   ========================= */

$('importBtn').onclick=()=>
  $('file').click();


$('exportBtn').onclick=
  exportExcel;


/* =========================
   FILE IMPORT BUTTON
   ========================= */

$('file').onchange=
  async e=>{

    try{

      msg(
        'Reading Excel…'
      );


      await importFile(
        e.target.files[0]
      );


      msg(
        `Imported ${contacts.length} contacts successfully.`
      );


      setTimeout(
        ()=>msg(''),
        2500
      );


    }catch(err){

      console.error(err);


      msg(
        'Import failed: '+
        (
          err&&err.message
            ?err.message
            :String(err)
        )
      );


      alert(
        'Import failed: '+
        (
          err&&err.message
            ?err.message
            :String(err)
        )
      );

    }


    e.target.value='';

  };


/* =========================
   SEARCH INPUT
   ========================= */

$('search').oninput=()=>{

  const value=
    $('search').value.trim();


  /*
    Update only the button.
    DO NOT search while typing.
  */

  updateSearchButton();


  /*
    When the search box is completely
    cleared, remove the previous search
    and immediately show ALL contacts.
  */

  if(value===''){

    searchQuery='';

    msg('');

    render();

  }

};


$('searchBtn').onclick=
  runSearch;


$('search').addEventListener(
  'keydown',
  e=>{

    if(
      e.key==='Enter' &&
      $('search').value.trim()!==''
    ){

      runSearch();

    }

  }
);


/* =========================
   CLEAR ALL DATA
   ========================= */

$('clearBtn').onclick=()=>{

  if(
    confirm(
      'Delete all imported data from this phone?'
    )
  ){

    localStorage.removeItem(KEY);

    contacts=[];

    headers=[];

    years=[];

    searchQuery='';

    activeView='total';

    render();

    updateSearchButton();

  }

};


/* =========================
   INITIAL LOAD
   ========================= */

load();

render();

updateSearchButton();


if(
  'serviceWorker' in navigator
){

  navigator.serviceWorker
    .register('sw.js')
    .catch(()=>{});

}


/* =========================
   XLSX EXPORT
   ========================= */

function colName(n){

  let s='';


  while(n>0){

    let r=
      (n-1)%26;


    s=
      String.fromCharCode(
        65+r
      )+
      s;


    n=
      Math.floor(
        (n-1)/26
      );

  }


  return s;

}


function crc32(bytes){

  let c=
    0xffffffff;


  for(
    const b of bytes
  ){

    c^=b;


    for(
      let k=0;
      k<8;
      k++
    ){

      c=
        (c>>>1)^
        (
          (c&1)
            ?0xedb88320
            :0
        );

    }

  }


  return(
    c^0xffffffff
  )>>>0;

}


function u16(v){

  return new Uint8Array([

    v&255,

    (v>>>8)&255

  ]);

}


function u32(v){

  return new Uint8Array([

    v&255,

    (v>>>8)&255,

    (v>>>16)&255,

    (v>>>24)&255

  ]);

}


function joinBytes(a){

  let n=
    a.reduce(
      (s,x)=>s+x.length,
      0
    );


  let o=
    new Uint8Array(n);


  let p=0;


  for(
    const x of a
  ){

    o.set(
      x,
      p
    );


    p+=x.length;

  }


  return o;

}


function zipStored(entries){

  const enc=
    new TextEncoder();


  const lo=[];

  const ce=[];

  let off=0;


  for(
    const e of entries
  ){

    const name=
      enc.encode(
        e.name
      );


    const data=
      typeof e.data==='string'
        ?enc.encode(e.data)
        :e.data;


    const crc=
      crc32(data);


    const h=
      joinBytes([

        u32(0x04034b50),

        u16(20),

        u16(0),

        u16(0),

        u16(0),

        u16(0),

        u32(crc),

        u32(data.length),

        u32(data.length),

        u16(name.length),

        u16(0),

        name

      ]);


    lo.push(
      h,
      data
    );


    const ch=
      joinBytes([

        u32(0x02014b50),

        u16(20),

        u16(20),

        u16(0),

        u16(0),

        u16(0),

        u16(0),

        u32(crc),

        u32(data.length),

        u32(data.length),

        u16(name.length),

        u16(0),

        u16(0),

        u16(0),

        u16(0),

        u32(0),

        u32(off),

        name

      ]);


    ce.push(ch);


    off+=
      h.length+
      data.length;

  }


  const l=
    joinBytes(lo);


  const c=
    joinBytes(ce);


  const e=
    joinBytes([

      u32(0x06054b50),

      u16(0),

      u16(0),

      u16(entries.length),

      u16(entries.length),

      u32(c.length),

      u32(l.length),

      u16(0)

    ]);


  return new Blob(
    [l,c,e],
    {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  );

}


function makeSheet(){

  const hs=[

    ...headers.filter(
      h=>
        ![
          'Remarks',
          'Called',
          'Called At'
        ].includes(h)
    ),

    'Remarks',
    'Called',
    'Called At'

  ];


  const rows=[

    hs,

    ...contacts.map(c=>[

      ...headers
        .filter(
          h=>
            ![
              'Remarks',
              'Called',
              'Called At'
            ].includes(h)
        )
        .map(
          h=>c.data[h]??''
        ),


      (
        Array.isArray(
          c.remarksHistory
        )

        ?

        c.remarksHistory
          .map(
            (r,n)=>
              (n+1)+'. '+r
          )
          .join('\n')

        :

        c.remarks||''
      ),


      c.called
        ?'YES'
        :'NO',


      c.calledAt||''

    ])

  ];


  let x=
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<sheetData>';


  rows.forEach(
    (r,ri)=>{

      x+=
        `<row r="${ri+1}">`;


      r.forEach(
        (v,ci)=>{

          x+=
            `<c r="${colName(ci+1)}${ri+1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;

        }
      );


      x+='</row>';

    }
  );


  return(
    x+
    '</sheetData></worksheet>'
  );

}


function exportExcel(){

  if(!contacts.length){

    alert(
      'No data to export.'
    );

    return;

  }


  const entries=[

    {

      name:
        '[Content_Types].xml',

      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
        '<Default Extension="xml" ContentType="application/xml"/>'+
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'+
        '</Types>'

    },


    {

      name:
        '_rels/.rels',

      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'+
        '</Relationships>'

    },


    {

      name:
        'xl/workbook.xml',

      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
        '<sheets>'+
        '<sheet name="Payments" sheetId="1" r:id="rId1"/>'+
        '</sheets>'+
        '</workbook>'

    },


    {

      name:
        'xl/_rels/workbook.xml.rels',

      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'+
        '</Relationships>'

    },


    {

      name:
        'xl/worksheets/sheet1.xml',

      data:
        makeSheet()

    }

  ];


  const blob=
    zipStored(entries);


  if(
    window.AndroidBridge &&
    AndroidBridge.saveXlsx
  ){

    const fr=
      new FileReader();


    fr.onload=()=>{

      AndroidBridge.saveXlsx(

        String(fr.result)
          .split(',')[1],

        'Contact_Payment_Updated.xlsx'

      );

    };


    fr.readAsDataURL(blob);

  }


  else{

    const a=
      document.createElement('a');


    a.href=
      URL.createObjectURL(blob);


    a.download=
      'Contact_Payment_Updated.xlsx';


    a.click();


    setTimeout(
      ()=>URL.revokeObjectURL(a.href),
      1000
    );

  }

}
