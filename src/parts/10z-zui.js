/* ---------- Bộ thành phần chuẩn Zalo (ZaUI) · docs/zalo-ui.md ----------
   Mọi màn Mini App dựng bằng các mảnh này để cùng kích thước, khoảng cách, cách nhấn.
   zSec  khối trắng bo 8, có tiêu đề 16 + liên kết bên phải
   zRow  hàng danh sách: biểu tượng/ảnh/ô ngày · tên 16 + dòng phụ 14 · phần phải (nút nhỏ, ›)
   zTag  nhãn viên nền nhạt · zDate ô ngày · zIco biểu tượng nét mảnh · zPill nút nhỏ trong hàng */
const ZI={
  pin:'<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .5 3.2 2 3.8 5"/>',
  money:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  level:'<path d="M5 19v-4M10 19v-8M15 19v-11M20 19V5"/>',
  swap:'<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>',
  chev:'<path d="M9 6l6 6-6 6"/>',
  share:'<path d="M12 4v11M7 9l5-5 5 5"/><path d="M5 14v5h14v-5"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  trophy:'<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8"/>',
  ticket:'<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.5M3.5 12h.5M3.5 18h.5"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  doc:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
  out:'<path d="M14 4h6v16h-6M10 8l-4 4 4 4M6 12h10"/>',
  ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  live:'<circle cx="12" cy="12" r="3"/><path d="M7.5 7.5a6.5 6.5 0 0 0 0 9M16.5 7.5a6.5 6.5 0 0 1 0 9"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  hist:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'
};
const zIco=(k,s=24)=>`<svg class="zi" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ZI[k]||""}</svg>`;
const zDate=(t,on)=>{if(!t)return `<span class="zdate"><b>?</b></span>`;const d=new Date(t);return `<span class="zdate${on?" on":""}"><small>${["CN","T2","T3","T4","T5","T6","T7"][d.getDay()]}</small><b>${d.getDate()}</b></span>`};
const zTag=(t,k="b")=>`<span class="ztag ${k}">${esc(t)}</span>`;
const zPill=(t,k="")=>`<span class="zpill ${k}">${t}</span>`;
// Khối: tiêu đề (có thể trống) + nội dung; right: liên kết nhỏ bên phải tiêu đề
const zSec=(title,inner,right="",cls="")=>`<section class="zsec${cls?" "+cls:""}">${title||right?`<div class="zsh"><h3>${title||""}</h3>${right}</div>`:""}${inner}</section>`;
/* Hàng danh sách
   o.lead: html bên trái (zIco / ảnh / zDate) · o.t tên · o.s dòng phụ (xám) · o.m dòng thêm (đen) · o.top html trên tên (nhãn)
   o.right html bên phải · o.chev thêm › · o.attrs thuộc tính bấm (data-act… hoặc href… data-go…) · o.cls lớp thêm */
function zRow(o){
  const tag=o.attrs?(/^\s*href=/.test(o.attrs)?"a":"button"):"div";
  return `<${tag} class="zrow${o.cls?" "+o.cls:""}"${o.attrs?" "+o.attrs:""}>${o.lead||""}<span class="zt">${o.top||""}<b>${o.t}</b>${o.s?`<small>${o.s}</small>`:""}${o.m?`<span>${o.m}</span>`:""}${o.after||""}</span>${o.right||""}${o.chev?zIco("chev",20):""}</${tag}>`;
}
const zBar=p=>`<span class="zprog"><i style="width:${Math.max(0,Math.min(100,p))}%"></i></span>`;
