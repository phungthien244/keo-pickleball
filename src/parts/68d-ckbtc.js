/* ----- BTC check-in giùm (⋯ ở chặng Ngày đánh): danh sách người đăng ký, tích chọn là check-in ----- */
let ckBtc=null;
function ckBtcPg(D,X){
  const L=ckList(D,X).slice().sort((a,b)=>String(ckName(D,a)).localeCompare(String(ckName(D,b)),"vi")),n=L.filter(r=>r.arrived).length;
  mxDr({t:"BTC check-in giùm",back:"ckbtcx",sub:xName(X)});
  return `<small class="rule">Chạm tên người đã tới sân để check-in giùm. Bỏ tích phải bấm 2 lần.</small>
    <span class="gmlb">Đã tới ${n}/${L.length}</span>
    <div class="g2list">${L.map(r=>{const p=r.pid&&D.pmap.get(r.pid),m=capMate(r),ar=!!r.arrived,arm=armed("ckbtc:"+r.id);
      return `<button class="g2p ckbtc${ar?" on":""}" data-act="ckbtct" data-id="${esc(r.id)}" role="checkbox" aria-checked="${ar}">${av(p||{name:ckName(D,r)},"sm",1)}<span class="t"><b>${esc(ckName(D,r))}</b><small>${ar?`đã tới ${r.arrivedAt?hm(r.arrivedAt):""} · ${r.arrBy==="btc"?"BTC check-in":"quét mã"}`:r.ci?"vừa quét · chờ duyệt":"chưa tới"}${m?` · cặp với ${esc(ckName(D,m))}`:""}</small></span>${arm?`<b class="g2on">BẤM LẦN NỮA ĐỂ BỎ</b>`:`<span class="ckbox" aria-hidden="true">${ar?"✓":""}</span>`}</button>`}).join("")||`<p class="rule">Chưa có ai đăng ký.</p>`}</div>
    <div class="hqcta"><button class="ball go" data-act="ckbtcx">✓ Xong · ${n}/${L.length} đã tới</button></div>`;
}
async function ckBtcAct(act,b){
  if(act==="ckbtc"){ckBtc=b.dataset.id||null;gmMore=false;kSh=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="ckbtcx"){ckBtc=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act!=="ckbtct")return false;
  const D=derive(),r=(S.regs||[]).find(x=>x.id===b.dataset.id);if(!r)return true;
  if(r.arrived){if(!armOr("ckbtc:"+r.id))return true;const pid=r.pid;
    if(pid&&D.playing.some(m=>[...m.a,...m.b].includes(pid))){toast("Người này đang trên sân, lưu tỉ số trước.");return true}
    await write(()=>db.collection("regs").doc(r.id).update({arrived:false,ci:0,ciCode:""}),`Đã bỏ check-in ${ckName(D,r)}`);return true}
  const cur=ckSched();
  await write(async()=>{await db.collection("regs").doc(r.id).update({arrived:true,arrBy:"btc",arrivedAt:Date.now()});if(cur&&cur.id===r.sid)await ckAttend(D,r)},`Đã check-in ${ckName(D,r)}`);
  return true;
}
