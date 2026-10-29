/* ----- Loa riêng từng giải: tắt đọc tự động (mặc định tắt) và câu đọc sửa được -----
   Lưu ở sched/{id}.loa = {on:{auto,calls,rules,draw}, tpl:{inv,res,call,draw,ck,award}}; giải đánh nhanh (không có lịch) lưu ở app/config.loa */
const LT_KEYS=["inv","res","call","draw","ck","award"];
const LT_LB={inv:"Mời vào sân",res:"Kết quả trận",call:"Trọng tài nhờ gọi tên",draw:"Bốc chia bảng",ck:"Gọi check-in",award:"Trao giải"};
const LT_DEF={inv:"Mời {đội 1}, {đội 2} vào sân {sân} chuẩn bị thi đấu",res:"Sân {sân} kết thúc. Cặp {đội thắng} chiến thắng, tỉ số là {điểm}.",call:"Mời vận động viên {tên}, đội {đội}, ra sân {sân} thi đấu.",
  draw:"{đội}, vào bảng {bảng}",ck:"Mời các vận động viên {danh sách} tới bàn ban tổ chức để check-in.",award:"{giải}, xin chúc mừng {đội}. Xin mời lên nhận giải."};
const LT_DEMO={"đội 1":"Tuấn và Hà","đội 2":"Minh và Lan","sân":"1","đội thắng":"Tuấn và Hà","đội thua":"Minh và Lan","điểm":"11, 7","tên":"Lan","đội":"Minh và Lan","bảng":"A","danh sách":"Tuấn, Hà","giải":"Giải nhất"};
const LO_SW=[["auto","Đọc tự động","Nghỉ giữa giờ, đánh tiếp… Tắt: chỉ đọc khi BTC bấm nút đọc"],["calls","Đọc yêu cầu gọi tên của trọng tài","Tắt: hiện ở Việc cần xử lý, BTC bấm Đọc"],["rules","Đọc thể thức khi bắt đầu",""],["draw","Đọc từng cặp khi bốc chia bảng",""]];
const loaSX=()=>xCur()||(typeof ckSched==="function"?ckSched():null);
const loaX=()=>{const X=loaSX();return (X?X.loa:cfg().loa)||{}};
const loaOpt=k=>((loaX().on)||{})[k]===true;
const loaAutoCalls=()=>{const on=(loaX().on)||{};return on.calls!=null?on.calls===true:cfg().loaMode==="auto"};
// Câu đọc: BTC đã sửa thì dùng câu của giải, chưa sửa thì dùng câu mặc định của app
function ltx(k,vars,def){const t=((loaX().tpl)||{})[k];if(!t||!String(t).trim())return def;return String(t).replace(/\{([^}]+)\}/g,(m,n)=>vars[n.trim()]!=null?String(vars[n.trim()]):"")}
let loaPgOn=false,loaEd=null;
async function loaSave(X,patch){const cur={...loaX(),...patch};
  if(X)await write(()=>db.collection("sched").doc(X.id).update({loa:cur}),"Đã lưu");else await write(()=>saveCfg({loa:cur}),"Đã lưu")}
function loaPg(D,X){
  mxDr({t:"Loa",back:"lpgx",sub:esc(X?xName(X):(D.c.sname||"Giải đánh nhanh"))});
  const L=loaX(),on=L.on||{},tp=L.tpl||{};
  let h=`<section class="gsbox lo"><span class="cap">Tự đọc khi có việc</span>${LO_SW.map(([k,l,s])=>`<div class="gssw"><span><b>${l}</b>${s?`<small>${s}</small>`:""}</span><button class="xsw${on[k]?" on":""}" data-act="lsw" data-v="${k}" role="switch" aria-checked="${!!on[k]}"><i></i></button></div>`).join("")}</section>`;
  h+=`<section class="gsbox lo"><span class="cap">Câu đọc · bấm Sửa để đổi · chèn {sân}, {đội 1}… để app tự điền</span>${LT_KEYS.map(k=>{const t=tp[k]||LT_DEF[k];
    return `<div class="lorow"><div class="h"><b>${LT_LB[k]}</b><span><button class="lnk" data-act="lplay" data-v="${k}">▶ Nghe</button>${loaEd===k?"":`<button class="lnk" data-act="led" data-v="${k}">✎ Sửa</button>`}</span></div>
      ${loaEd===k?`<textarea id="lt-${k}" data-draft="lt-${k}" rows="3">${esc(val("lt-"+k,t))}</textarea><div class="two"><button class="btn-line" data-act="ledx">Huỷ</button><button class="ball go" data-act="lok" data-v="${k}">✓ Lưu câu này</button></div>`:`<p class="${tp[k]?"":"def"}">${esc(t)}</p>`}</div>`}).join("")}</section>`;
  return h+`<div class="hqcta"><button class="btn-line wide" data-act="lreset">${armed("lreset:x")?"Bấm lần nữa để khôi phục":"Khôi phục câu mặc định"}</button></div>`;
}
async function loaAct(act,b){
  const v=b.dataset.v,X=loaSX();
  if(act==="lpg"){loaPgOn=true;loaEd=null;gmMore=false;kSh=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="lpgx"){loaPgOn=false;loaEd=null;render();return true}
  if(act==="lsw"){const on={...(loaX().on||{})};on[v]=!on[v];await loaSave(X,{on});return true}
  if(act==="led"){loaEd=v;delete drafts["lt-"+v];render();return true}
  if(act==="ledx"){loaEd=null;render();return true}
  if(act==="lok"){const t=String(val("lt-"+v,"")).trim().slice(0,300),tpl={...(loaX().tpl||{})};if(t&&t!==LT_DEF[v])tpl[v]=t;else delete tpl[v];loaEd=null;delete drafts["lt-"+v];await loaSave(X,{tpl});return true}
  if(act==="lplay"){const t=loaEd===v?String(val("lt-"+v,"")):((loaX().tpl||{})[v]||LT_DEF[v]);speak(t.replace(/\{([^}]+)\}/g,(m,n)=>LT_DEMO[n.trim()]||""),"","lt:"+v,true);return true}
  if(act==="lreset"){if(!armOr("lreset:x"))return true;loaEd=null;await loaSave(X,{tpl:{}});return true}
  return false;
}
