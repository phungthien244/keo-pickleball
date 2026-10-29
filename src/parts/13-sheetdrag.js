/* ----- Bảng trượt: nút ✕ và kéo xuống để đóng · Danh sách kéo thả (giữ ≡) ----- */
// Gắn nút ✕ vào mọi bảng trượt có lớp mờ phía trước (bấm ✕ = bấm ra ngoài)
function sheetX(html){
  return String(html).replace(/(<div class="mxdim[^"]*" data-act="([^"]+)"[^>]*><\/div>\s*<div class="mxsheet[^"]*"[^>]*>)/g,(m,a,act)=>`${a}<button class="mxx" data-act="${act}" aria-label="Đóng">✕</button>`);
}
const SRT_CB={};
(function(){
  if(typeof document==="undefined"||!document.addEventListener||typeof window==="undefined"||window.__PBTEST)return;
  let S0=null,D0=null;
  document.addEventListener("touchstart",e=>{const t=e.target,sh=t&&t.closest&&t.closest(".mxsheet");if(!sh||(t.closest&&t.closest(".drh")))return;
    const r=sh.getBoundingClientRect(),y=e.touches[0].clientY;if(!(t.closest(".grab")||(y-r.top<56&&sh.scrollTop<=0)))return;S0={sh,y0:y,dy:0}},{passive:true});
  document.addEventListener("touchmove",e=>{if(!S0)return;S0.dy=Math.max(0,e.touches[0].clientY-S0.y0);S0.sh.style.transition="none";S0.sh.style.transform=`translateY(${S0.dy}px)`},{passive:true});
  document.addEventListener("touchend",()=>{if(!S0)return;const {sh,dy}=S0;S0=null;sh.style.transition="transform .18s ease-out";
    if(dy>80){sh.style.transform="translateY(110%)";const d=sh.previousElementSibling;setTimeout(()=>{if(d&&d.classList&&d.classList.contains("mxdim"))d.click();else sh.style.transform=""},160)}else sh.style.transform=""});
  // Kéo thả: giữ ≡ của một dòng .srt trong danh sách [data-srt]
  const pt=e=>e.touches?e.touches[0]:e;
  const down=e=>{const h=e.target&&e.target.closest&&e.target.closest(".drh");if(!h)return;const row=h.closest(".srt"),list=row&&row.closest("[data-srt]");if(!list)return;
    if(e.cancelable)e.preventDefault();D0={row,list,y0:pt(e).clientY};row.classList.add("lift")};
  const move=e=>{if(!D0)return;if(e.cancelable)e.preventDefault();const y=pt(e).clientY,{row,list}=D0;
    const rows=[...list.querySelectorAll(".srt")].filter(r=>r!==row);let before=null;
    for(const r of rows){const b=r.getBoundingClientRect();if(y<b.top+b.height/2){before=r;break}}
    if(before){if(before!==row.nextSibling)list.insertBefore(row,before)}else if(list.lastElementChild!==row)list.appendChild(row)};
  const up=()=>{if(!D0)return;const {row,list}=D0;D0=null;row.classList.remove("lift");const cb=SRT_CB[list.dataset.srt];
    if(cb)cb([...list.querySelectorAll(".srt")].map(r=>r.dataset.k))};
  document.addEventListener("touchstart",down,{passive:false});document.addEventListener("touchmove",move,{passive:false});document.addEventListener("touchend",up);
  document.addEventListener("mousedown",down);document.addEventListener("mousemove",move);document.addEventListener("mouseup",up);
})();
