/* ---------- Tạo nhanh kiểu trò chuyện (canvas trang chat) ----------
   Sau khi đọc câu, app hỏi lần lượt những gì còn thiếu. Mỗi câu có nút trả lời nhanh (★ là app khuyên dùng) và "Để app chọn".
   Câu hỏi do app đặt sẵn, không gọi AI; gõ chữ vào ô dưới thì đọc bằng luật + AI như "Sửa bằng lời".
   Hỏi mục bắt buộc còn thiếu trước (thể thức, số cặp, ngày giờ, sân, tiền, giải thưởng) → mục có sẵn cách phổ biến (tính điểm từng vòng, trọng tài…).
   Hỏi xong: thẻ tóm tắt trong khung chat, bấm dòng nào thì hỏi lại câu đó.
   Luật điểm từng vòng: tn.rG (vòng bảng / mọi trận), tn.rK (tứ kết, bán kết), tn.rF (chung kết) = {to, w2, cap, sets} như koFromX. */
const tcR=(to,w2,cap,sets)=>({to,w2,cap,sets});
const tcRDef=(t,X)=>X==="G"?tcR(+t.target||11,false,0,1):X==="K"?tcR(15,true,18,1):tcR(11,true,15,3);
const tcRu=(t,X)=>t["r"+X]||tcRDef(t,X);
const tcPart=r=>r.w2?`${r.to} điểm cách 2, ${r.cap>0?`tối đa ${r.cap}`:r.cap<0?"tối đa ?":"không giới hạn"}`:`Chạm ${r.to}`;
// Cách gọi: "chạm" chỉ dùng cho chạm là thắng; cách 2 thì ghi "15 điểm cách 2, tối đa 18"
const tcRTx=r=>r.sets>1?`Thắng ${Math.ceil(r.sets/2)}/${r.sets} ván · mỗi ván ${tcPart(r).replace(/^C/,"c")}`:`1 ván · ${tcPart(r).replace(/^C/,"c")}`;
const tcSet=(t,X,p)=>{t["r"+X]={...tcRu(t,X),...p};if(X==="G")t.target=t["r"+X].to};
// Số cặp vào vòng loại trực tiếp (lớn nhất nếu nhiều nội dung)
const tcQ=t=>t.fmt!=="bang"?0:t.nds?Math.max(...t.nds.map(n=>tnQ2(Math.min(+n.max||16,(+n.koN||1)*2)))):t.pairs?tnQ2(Math.min(t.pairs,(t.koN||1)*(t.lay||2))):8;
const tcRound=q=>q>=16?"vòng 1/8":q>=8?"tứ kết":q>=4?"bán kết":"chung kết";
const tcHm=x=>{const d=new Date(x);return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`};
const tcStar=(t,k)=>{const Q=TC_Q.find(x=>x.k===k);return Q&&Q.star?Q.star(t):null};
// Gợi ý chia bảng theo số cặp: mỗi bảng khoảng 4 cặp
const tcBestN=n=>Math.max(1,Math.min(8,Math.round(n/4)));
function tcFmtOpts(t){const n=+t.pairs||0;
  if(!n)return [["bang","Chia bảng rồi đánh loại"],["giai","Vòng tròn"],["xoay","Xoay cặp (giao lưu)"]];
  const L=[...new Set([tcBestN(n),Math.max(1,Math.round(n/8))])].filter(N=>N>=2&&n/N>=3).map(N=>[`b:${N}`,`${N} bảng → ${tcRound(tnQ2(Math.min(n,N*2)))}`]);
  return [...L,...(n<=10?[["giai","Vòng tròn"]]:[]),["xoay","Xoay cặp (giao lưu)"],["?","Giải thích giúp tôi"]]}
// Giải thích các cách bằng số của chính giải này
function tcExplain(t){const n=+t.pairs||0,c=+t.courts||0;
  const one=(l,p)=>{const x={...t,...p},m=tnCount(x.fmt,n,x.koN,(x.koN||1)*2,true),E=tnEst(x),per=x.fmt==="giai"?n-1:Math.max(1,Math.floor(n/(x.koN||1))-1);
    return `<b>${l}</b>: ${m} trận${E?`, xong khoảng ${tcHm(E.end)}`:""}. Cặp nào cũng đánh ít nhất ${per} trận.`};
  const L=tcFmtOpts(t).filter(([v])=>v.startsWith("b:")).map(([v,l])=>one(l,{fmt:"bang",koN:+v.slice(2),lay:2}));
  if(n&&n<=10)L.push(one("Vòng tròn",{fmt:"giai"}));else if(n)L.push(`<b>Vòng tròn</b>: ${n*(n-1)/2} trận, quá nhiều cho ${n} cặp nên app không gợi ý. Hợp khi từ 10 cặp trở xuống.`);
  L.push(`<b>Xoay cặp</b>: không cố định cặp, mỗi trận app tự ghép người cân trình. Hợp buổi giao lưu, không cần đăng ký theo cặp.`);
  const best=tcStar(t,"fmt"),bl=(tcFmtOpts(t).find(([v])=>v===best)||[])[1];
  return `${n?`Với ${n} cặp${c?`, ${c} sân`:""}:`:"Các cách đánh:"}<br><br>${L.join("<br><br>")}${bl?`<br><br>Lần đầu tổ chức thì nên chọn <b>${esc(bl)}</b>.`:""}`}
const TC_PK=[["same","Giống vòng bảng"],["1:15:18","1 ván · 15 điểm cách 2, tối đa 18"],["3:11:15","Thắng 2/3 ván · mỗi ván 11 điểm cách 2, tối đa 15"],["c:15","1 ván · chạm 15"],["more","Khác…"]];
const TC_PF=[["1:15:18","1 ván · 15 điểm cách 2, tối đa 18"],["3:11:15","Thắng 2/3 ván · mỗi ván 11 điểm cách 2, tối đa 15"],["5:11:15","Thắng 3/5 ván · mỗi ván 11 điểm cách 2, tối đa 15"],["more","Khác…"]];
/* Các câu hỏi theo thứ tự. on: câu này có áp dụng · need: bắt buộc trả lời (chưa có giá trị) · keys: mục trong câu tả, nói rồi thì không hỏi
   q: câu hỏi · o: nút trả lời [giá trị, chữ] · star: nút khuyên dùng · def: giá trị khi bấm "Để app chọn" · set: ghi câu trả lời */
const TC_Q=[
  {k:"fmt",need:t=>!t.fmt,keys:["fmt"],q:()=>"Giải đánh theo thể thức nào?",o:tcFmtOpts,star:t=>t.pairs?(t.pairs<=6?"giai":`b:${tcBestN(t.pairs)}`):null,
    set:(t,v)=>{if(v.startsWith("b:")){t.fmt="bang";t.koN=+v.slice(2);t.lay=2;t.ans.add("koN")}else t.fmt=v;if(t.fmt!=="xoay"){t.thu="phi";if(t.third==null)t.third=true;if(!t.pairReg)t.pairReg="pair"}}},
  {k:"n",on:t=>t.fmt&&!t.nds,need:t=>t.fmt==="xoay"?!t.people:!t.pairs,keys:["pairs","people"],q:t=>t.fmt==="xoay"?"Tối đa bao nhiêu người?":"Bao nhiêu cặp?",
    o:t=>t.fmt==="xoay"?[12,16,20,24,32].map(v=>[v,`${v} người`]):(t.fmt==="giai"?[4,6,8,10,12]:[8,12,16,24,32]).map(v=>[v,`${v} cặp`]),
    set:(t,v)=>{if(t.fmt==="xoay")t.people=+v;else{t.pairs=+v;if(t.fmt==="bang"&&!t.ans.has("koN")){t.koN=tcBestN(+v);t.lay=2}}}},
  {k:"koN",on:t=>t.fmt==="bang"&&!t.nds&&t.pairs,keys:["koN"],q:t=>`Chia ${t.pairs} cặp thành mấy bảng?`,
    o:t=>[2,3,4,6,8].filter(N=>t.pairs/N>=3).map(N=>[N,`${N} bảng → ${tcRound(tnQ2(Math.min(t.pairs,N*2)))}`]),star:t=>tcBestN(t.pairs),set:(t,v)=>{t.koN=+v;t.lay=t.lay||2}},
  {k:"dt",on:t=>t.fmt&&t.fmt!=="xoay"&&!t.nds,keys:["dt"],q:()=>"Nội dung đánh đôi gì?",o:()=>[["MM","Đôi nam"],["FF","Đôi nữ"],["mix","Đôi nam nữ"],["free","Đôi hỗn hợp"]],def:()=>"free",
    note:()=>"Đôi hỗn hợp: ai đánh với ai cũng được. Muốn giới hạn trình thì gõ, ví dụ “tổng trình 5.5”.",set:(t,v)=>{t.dt=v}},
  {k:"date",need:t=>t.date==null,keys:["date"],q:()=>"Đánh ngày nào?",o:()=>tnDateOpts(),set:(t,v)=>{t.date=+v}},
  {k:"time",need:t=>!t.time,keys:["time"],q:()=>"Mấy giờ bắt đầu?",o:()=>["06:30","07:00","08:00","17:00","18:30","19:00"].map(v=>[v,v]),set:(t,v)=>{t.time=v}},
  {k:"courts",need:t=>!t.courts,keys:["courts"],q:t=>`Dùng mấy sân?${t.courts&&t.guess.has("courts")?` (lần trước ${t.courts} sân)`:""}`,o:()=>[2,3,4,6,8].map(v=>[v,`${v} sân`]),star:t=>t.courts||null,set:(t,v)=>{t.courts=+v}},
  {k:"thu",on:t=>t.fmt==="xoay",need:t=>!t.thu,keys:["thu"],q:()=>"Thu tiền thế nào?",o:()=>[["phi","Lệ phí cố định"],["deu","Chia đều tiền sân"],["keo","Ai thua góp"]],star:t=>t.thu||null,set:(t,v)=>{t.thu=v}},
  {k:"fee",on:t=>!t.nds&&!(t.fmt==="xoay"&&(t.thu==="keo"||t.thu==="deu")),need:t=>t.fee==null||t.fee==="",keys:["fee"],q:()=>"Lệ phí mỗi người bao nhiêu?",
    o:()=>[[0,"Miễn phí"],[50,"50k"],[100,"100k"],[150,"150k"],[200,"200k"],[300,"300k"]],star:t=>t.fee!=null&&t.fee!==""?t.fee:null,note:()=>"Số khác thì gõ bên dưới, ví dụ “250k”.",set:(t,v)=>{t.fee=+v}},
  {k:"pay",need:t=>!t.pay,keys:["pay"],q:()=>"Có cần chuyển khoản khi đăng ký không?",o:()=>[["off","Không, trả tại sân"],["opt","Tuỳ chọn"],["req","Bắt buộc mới giữ chỗ"]],star:t=>t.pay||null,set:(t,v)=>{t.pay=v}},
  {k:"gton",need:t=>t.gton==null,keys:["gton","h1","gt"],q:()=>"Có giải thưởng không?",o:()=>[["1","Có"],["0","Không"]],star:t=>t.gton==null?null:t.gton?"1":"0",
    set:(t,v)=>{t.gton=v==="1";if(t.gton&&!t.gt)t.gt="hang"}},
  {k:"prize",on:t=>t.gton,need:t=>tnNeed(t,"thuong").length>0,keys:["h1","gtv"],q:()=>"Thưởng bao nhiêu?",
    o:t=>{const n=t.nds?t.nds.reduce((a,x)=>a+(+x.max||0)*2*(+x.fee||0),0):(t.fmt==="xoay"?+t.people||0:(+t.pairs||0)*2)*(+t.fee||0),r=x=>Math.max(50,Math.round(n*x/50)*50),L=[];
      if(n>=500)L.push([`h:${r(.2)}:${r(.12)}:${r(.08)}`,`Nhất ${tnK(r(.2))} · Nhì ${tnK(r(.12))} · Ba ${tnK(r(.08))}`]);
      if(+t.fee)L.push(["tr:20","Trích 20% lệ phí"],["tr:30","Trích 30% lệ phí"]);return L},
    note:()=>"Mức khác thì gõ bên dưới, ví dụ “nhất 1 triệu nhì 500 ba 200”.",
    set:(t,v)=>{const p=v.split(":");if(p[0]==="h"){t.gt="hang";t.h1=+p[1];t.h2=+p[2];t.h3=+p[3]}else{t.gt="trich";t.gtv=+p[1]}}},
  // Từ đây: mục có cách phổ biến, bỏ qua thì app chọn nút ★
  {k:"sG",on:t=>t.fmt,keys:["target","rG"],q:t=>t.fmt==="bang"?"Vòng bảng mỗi trận đánh thế nào?":"Mỗi trận đánh thế nào?",
    o:t=>[["1:11","1 ván 11 điểm"],["1:15","1 ván 15 điểm"],["1:21","1 ván 21 điểm"],...(t.fmt==="bang"?[["3:11","Thắng 2/3 ván, mỗi ván 11 điểm"]]:[])],star:()=>"1:11",
    set:(t,v)=>{const [s,to]=v.split(":").map(Number);tcSet(t,"G",{sets:s,to,cap:tcRu(t,"G").cap?Math.max(to+2,tcRu(t,"G").cap):0})}},
  {k:"wG",on:t=>t.fmt,keys:["rG"],q:t=>{const to=tcRu(t,"G").to;return `Tới ${to-1}–${to-1} thì sao?`},
    o:t=>{const to=tcRu(t,"G").to;return [["0",`Chạm ${to}, ai tới trước thắng`],[`c:${to+4}`,`${to} điểm cách 2, tối đa ${to+4}`],["c:0",`${to} điểm cách 2, không giới hạn`],["more","Cách 2, tối đa khác…"]]},star:()=>"0",
    note:t=>t.fmt==="bang"?"Vòng bảng nhiều trận nên chạm (ai tới trước thắng) cho nhanh.":"",set:(t,v)=>tcW(t,"G",v)},
  {k:"cG",on:t=>t.capAsk==="G",q:()=>"Tối đa mấy điểm?",o:t=>tcCapOpts(tcRu(t,"G").to),star:t=>String(tcRu(t,"G").to+4),set:(t,v)=>{tcSet(t,"G",{w2:true,cap:+v});t.capAsk=null}},
  {k:"pK",on:t=>t.fmt==="bang"&&tcQ(t)>=4,keys:["rK"],q:t=>tcQ(t)>=8?"Tứ kết và bán kết đánh thế nào?":"Bán kết đánh thế nào?",o:()=>TC_PK,star:()=>"1:15:18",set:(t,v)=>tcP(t,"K",v)},
  {k:"sK",on:t=>t.cust&&t.cust.has("K"),q:()=>"Mỗi trận vòng loại đánh mấy ván?",o:()=>[["1:11","1 ván 11 điểm"],["1:15","1 ván 15 điểm"],["3:11","Thắng 2/3 ván, mỗi ván 11 điểm"]],star:()=>"1:15",
    set:(t,v)=>{const [s,to]=v.split(":").map(Number);tcSet(t,"K",{sets:s,to})}},
  {k:"wK",on:t=>t.cust&&t.cust.has("K"),q:t=>{const to=tcRu(t,"K").to;return `Vòng loại tới ${to-1}–${to-1} thì sao?`},
    o:t=>{const to=tcRu(t,"K").to;return [["0",`Chạm ${to}, ai tới trước thắng`],[`c:${to+3}`,`${to} điểm cách 2, tối đa ${to+3}`],["c:0",`${to} điểm cách 2, không giới hạn`],["more","Cách 2, tối đa khác…"]]},star:t=>`c:${tcRu(t,"K").to+3}`,set:(t,v)=>tcW(t,"K",v)},
  {k:"cK",on:t=>t.capAsk==="K",q:()=>"Vòng loại tối đa mấy điểm?",o:t=>tcCapOpts(tcRu(t,"K").to),star:t=>String(tcRu(t,"K").to+4),set:(t,v)=>{tcSet(t,"K",{w2:true,cap:+v});t.capAsk=null}},
  {k:"pF",on:t=>t.fmt==="bang",keys:["rF"],q:()=>"Chung kết đánh thế nào?",o:()=>TC_PF,star:()=>"3:11:15",note:()=>"Chung kết thường đánh nhiều ván, mỗi ván cách 2 để công bằng.",set:(t,v)=>tcP(t,"F",v)},
  {k:"sF",on:t=>t.cust&&t.cust.has("F"),q:()=>"Chung kết đánh mấy ván?",o:()=>[["1:15","1 ván 15 điểm"],["3:11","Thắng 2/3 ván, mỗi ván 11 điểm"],["5:11","Thắng 3/5 ván, mỗi ván 11 điểm"],["1:21","1 ván 21 điểm"]],star:()=>"3:11",
    set:(t,v)=>{const [s,to]=v.split(":").map(Number);tcSet(t,"F",{sets:s,to})}},
  {k:"wF",on:t=>t.cust&&t.cust.has("F"),q:t=>{const to=tcRu(t,"F").to;return `Chung kết tới ${to-1}–${to-1} thì sao?`},
    o:t=>{const to=tcRu(t,"F").to;return [["0",`Chạm ${to}, ai tới trước thắng`],[`c:${to+4}`,`${to} điểm cách 2, tối đa ${to+4}`],["c:0",`${to} điểm cách 2, không giới hạn`],["more","Cách 2, tối đa khác…"]]},star:t=>`c:${tcRu(t,"F").to+4}`,set:(t,v)=>tcW(t,"F",v)},
  {k:"cF",on:t=>t.capAsk==="F",q:()=>"Chung kết tối đa mấy điểm?",o:t=>tcCapOpts(tcRu(t,"F").to),star:t=>String(tcRu(t,"F").to+4),set:(t,v)=>{tcSet(t,"F",{w2:true,cap:+v});t.capAsk=null}},
  {k:"third",on:t=>t.fmt==="bang"&&tcQ(t)>=4,keys:["third"],q:()=>"Có đánh tranh hạng ba không?",o:()=>[["1","Có"],["0","Không, đồng hạng ba"]],star:()=>"1",set:(t,v)=>{t.third=v==="1"}},
  {k:"pairReg",on:t=>t.fmt&&t.fmt!=="xoay",keys:["pairReg"],q:()=>"Người chơi đăng ký thế nào?",o:()=>[["pair","Theo cặp"],["solo","Từng người, BTC ghép"]],star:()=>"pair",set:(t,v)=>{t.pairReg=v}},
  {k:"ref",on:t=>t.fmt&&t.fmt!=="xoay",keys:["ref"],q:()=>"Ai nhập tỉ số?",o:()=>[["0","BTC nhập trên app"],["1","Mỗi sân 1 trọng tài (QR)"]],star:t=>t.fmt==="bang"&&(+t.courts||0)>=3?"1":"0",
    note:()=>"Trọng tài quét mã QR của sân, nhập từng pha, loa tự gọi điểm.",set:(t,v)=>{t.ref=v==="1"}},
  {k:"endX",on:t=>t.fmt==="xoay"&&t.time,keys:["end"],q:()=>"Đánh đến mấy giờ?",o:t=>{const [h,m]=t.time.split(":").map(Number);return [2,2.5,3].map(x=>{const a=h*60+m+x*60;return `${String(Math.floor(a/60)%24).padStart(2,"0")}:${String(a%60).padStart(2,"0")}`}).map(v=>[v,v]).concat([["","Không cố định"]])},
    star:()=>"",set:(t,v)=>{t.end=v}},
];
const tcCapOpts=to=>[2,4,6,8,10].map(x=>[String(to+x),`Tối đa ${to+x}`]);
function tcW(t,X,v){if(v==="more"){t.capAsk=X;t.ans.delete("c"+X);return}t.capAsk=null;if(v==="0")tcSet(t,X,{w2:false,cap:0});else tcSet(t,X,{w2:true,cap:+v.slice(2)||0})}
function tcP(t,X,v){t.cust=t.cust||new Set();if(v==="more"){t.cust.add(X);for(const k of ["s","w","c"])t.ans.delete(k+X);return}t.cust.delete(X);
  if(v==="same"){t["r"+X]={...tcRu(t,"G")};return}if(v.startsWith("c:")){t["r"+X]=tcR(+v.slice(2),false,0,1);return}const [s,to,cap]=v.split(":").map(Number);t["r"+X]=tcR(to,true,cap,s)}
const tcOn=(t,Q)=>!Q.on||!!Q.on(t);
const tcSaid=(t,Q)=>(Q.keys||[]).some(k=>t.said.has(k));
// Câu còn phải hỏi: chưa trả lời và (bắt buộc mà chưa có, hoặc chưa nói trong câu tả)
function tcPend(t){const nd=Q=>!!(Q.need&&Q.need(t)),A=TC_Q.filter(Q=>tcOn(t,Q)&&!t.ans.has(Q.k)&&(nd(Q)||!tcSaid(t,Q))),L=[...A.filter(nd),...A.filter(Q=>!nd(Q))];
  if(t.reAsk){const i=L.findIndex(Q=>Q.k===t.reAsk);if(i>0)L.unshift(L.splice(i,1)[0])}return L}
const tcReq=t=>tcPend(t).filter(Q=>Q.need&&Q.need(t));
// Bắt đầu trò chuyện từ bản nháp tn (sau khi đọc câu): mục nói trong câu (không phải ĐOÁN) coi như đã biết
function tcStart(t,txt,said){t.endBy="";t.said=new Set((said||[]).filter(k=>t[k]!=null&&t[k]!==""&&!t.guess.has(k)));t.ans=new Set();t.log=[];t.txt=txt||"";t.reAsk=null;t.capAsk=null;t.cust=new Set();
  if(t.rG)t.said.add("rG");else if(t.target&&t.said.has("target")){const r=tcRuleTxt({},"G",tnNorm(txt||""))||tcR(+t.target,false,0,1);t.rG=r.cap<0?{...r,w2:false,cap:0}:r;if(r.cap>=0)t.said.add("rG")}for(const X of ["rK","rF"])if(t[X])t.said.add(X);t.seenH=tcSeen(t);return t}
function tcAnswer(t,k,v){const Q=TC_Q.find(x=>x.k===k);if(!Q)return;
  if(k==="fmt"&&v==="?"){t.log.push({a:"Giải thích giúp tôi"},{b:tcExplain(t)});return}
  const def=v==="__def",val=def?(Q.def?Q.def(t):Q.star?Q.star(t):null):v;if(val==null)return;
  const lb=def?`Để app chọn: ${(Q.o(t).find(([x])=>String(x)===String(val))||[])[1]||""}`:(Q.o(t).find(([x])=>String(x)===String(v))||[])[1]||String(v);
  t.log.push({q:Q.q(t),a:lb});Q.set(t,String(val));t.ans.add(k);t.said.delete(k);for(const x of Q.keys||[])t.guess.delete(x);if(t.reAsk===k)t.reAsk=null}
// Bỏ qua hết: mục còn lại lấy nút ★
function tcSkipAll(t){for(const Q of tcPend(t)){if(Q.need&&Q.need(t))return false;const s=Q.def?Q.def(t):Q.star?Q.star(t):null;if(s!=null)Q.set(t,String(s));t.ans.add(Q.k)}t.log.push({a:"Bỏ qua hết, app tự chọn"});return true}
// Hỏi lại một câu (bấm dòng trên thẻ tóm tắt): bỏ câu trả lời của nó và các câu phụ
const TC_DEP={fmt:["fmt","koN","sG","wG","cG","pK","sK","wK","cK","pF","sF","wF","cF","third"],gton:["gton","prize"],sG:["sG","wG","cG"],pK:["pK","sK","wK","cK"],pF:["pF","sF","wF","cF"],n:["n","koN"]};
function tcRe(t,k){t.sumOn=false;const L=TC_DEP[k]||[k];for(const x of L){t.ans.delete(x);const Q=TC_Q.find(q=>q.k===x);for(const y of (Q&&Q.keys)||[])t.said.delete(y)}if(k==="fmt"){t.cust=new Set();t.capAsk=null}t.reAsk=k}
// Gõ chữ: các mục vừa đổi coi như đã trả lời câu tương ứng
function tcTyped(t,keys){for(const Q of TC_Q)if((Q.keys||[]).some(k=>keys.includes(k))){t.ans.add(Q.k);if(t.reAsk===Q.k)t.reAsk=null}if(keys.includes("target")&&!keys.includes("rG"))tcSet(t,"G",{to:+t.target,w2:false,cap:0})}

/* ----- Giao diện ----- */
const tcBot=(h,ex="")=>`<div class="tcb"><span class="tcav" aria-hidden="true">AI</span><div>${h}${ex}</div></div>`;
const tcMe=h=>`<div class="tcm"><div>${h}</div></div>`;
function tcSeen(t){const c=[],ok=l=>c.push(`<span class="tnk">✓ ${l}</span>`),S=t.said,at=tnAt(t);
  if(S.has("fmt")&&t.fmt)ok(t.fmt==="bang"&&t.koN&&S.has("koN")?`${t.koN} bảng → ${tcRound(tcQ(t))}`:TN_FMT[t.fmt]);if(t.nds)t.nds.forEach(n=>ok(`${esc(n.name)} · ${n.max} cặp`));
  if(S.has("pairs"))ok(`${t.pairs} cặp`);if(S.has("people"))ok(`${t.people} người`);if(S.has("dt")&&t.dt)ok(TN_DT[t.dt]+(t.cap?` ${t.cap}`:""));
  if(S.has("date")&&S.has("time"))ok(`${tnDow(at)} ${tnDm(at)} · ${t.time}`);else if(S.has("date"))ok(`${tnDow(t.date)} ${tnDm(t.date)}`);else if(S.has("time"))ok(t.time);
  if(S.has("courts"))ok(`${t.courts} sân`);if(S.has("target"))ok(`Chạm ${t.target}`);if(S.has("fee")&&!t.nds)ok(+t.fee?`${fmtK(+t.fee)}/người`:"Miễn phí");
  if(S.has("pay"))ok({off:"Trả tại sân",opt:"Chuyển khoản tuỳ chọn",req:"Chuyển khoản trước"}[t.pay]);
  if(S.has("gton")&&t.gton===false)ok("Không giải thưởng");else if(S.has("h1")&&t.h1)ok(`Nhất ${tnK(+t.h1)}`);
  return c.length?`<div class="tcok">${c.join("")}</div>`:""}
// Dòng tóm tắt: [nhãn, giá trị, câu hỏi để hỏi lại]
function tcRows(t){const R=[],at=tnAt(t),E=tnEst(t);
  R.push(["Thể thức",t.fmt==="bang"&&!t.nds?`${t.koN} bảng → ${tcRound(tcQ(t))}${tcQ(t)>=4?(t.third===false?" · đồng hạng 3":" · tranh hạng 3"):""}`:TN_FMT[t.fmt]||"—","fmt"]);
  if(t.nds)t.nds.forEach(n=>R.push(["Nội dung",`${esc(n.name)} · ${n.max} cặp · ${n.fee?fmtK(+n.fee):"miễn phí"}`,"nds"]));
  else if(t.fmt==="xoay")R.push(["Số người",t.people?`Tối đa ${t.people} người`:"—","n"]);
  else{R.push(["Nội dung",`${TN_DT[t.dt||"free"]}${t.cap?` · tổng trình ≤ ${t.cap}`:""}`,"dt"]);R.push(["Số cặp",t.pairs?`${t.pairs} cặp`:"—","n"])}
  R.push([t.fmt==="bang"?"Vòng bảng":"Mỗi trận",tcRTx(tcRu(t,"G")),"sG"]);
  if(t.fmt==="bang"&&tcQ(t)>=4)R.push([tcQ(t)>=8?"TK, BK":"Bán kết",tcRTx(tcRu(t,"K")),"pK"]);
  if(t.fmt==="bang")R.push(["Chung kết",tcRTx(tcRu(t,"F")),"pF"]);
  if(t.fmt!=="xoay")R.push(["Trọng tài",t.ref?"Mỗi sân 1 trọng tài (QR)":"BTC nhập trên app","ref"],["Đăng ký",t.pairReg==="solo"?"Từng người, BTC ghép":"Theo cặp","pairReg"]);
  R.push(["Ngày",t.date!=null?`${tnDow(at)} ${tnDm(at)}`:"—","date"],["Giờ",`${t.time||"—"}${t.fmt==="xoay"?(t.end?`–${t.end}`:""):E?` · dự kiến xong ~${tcHm(E.end)}`:""}`,"time"]);
  R.push(["Sân",`${t.courts||"—"} sân${t.place?` · ${esc(t.place)}`:""}`,"courts"]);
  if(t.fmt==="xoay")R.push(["Cách thu",{phi:"Lệ phí cố định",deu:"Chia đều tiền sân",keo:"Ai thua góp"}[t.thu]||"—","thu"]);
  if(!t.nds&&!(t.fmt==="xoay"&&(t.thu==="keo"||t.thu==="deu")))R.push(["Lệ phí",t.fee==null||t.fee===""?"—":+t.fee?`${fmtK(+t.fee)}/người`:"Miễn phí","fee"]);
  R.push(["Chuyển khoản",{off:"Không, trả tại sân",opt:"Tuỳ chọn",req:"Bắt buộc mới giữ chỗ"}[t.pay]||"—","pay"]);
  R.push(["Giải thưởng",t.gton==null?"—":!t.gton?"Không":(t.gt||"hang")==="hang"?[t.h1&&`Nhất ${tnK(+t.h1)}`,t.h2&&`Nhì ${tnK(+t.h2)}`,t.h3&&`Ba ${tnK(+t.h3)}`].filter(Boolean).join(" · ")||"—":t.gt==="trich"?`Trích ${t.gtv}% lệ phí`:t.gt==="gop"?`Mỗi người góp ${fmtK(+t.gtv||0)}`:`CLB bỏ ra ${fmtK(+t.gtv||0)}`,"gton"]);
  R.push(["Ảnh bìa",xfPoster&&!xfPoster.del&&(xfPoster.out||xfPoster.src)?(xfPoster.out?"Đã chọn ảnh":"Đang xử lý ảnh…"):"Chưa có · app tự vẽ khi chia sẻ","poster"]);
  return R}
/* ----- Sửa ngay trên thẻ tóm tắt: bấm dòng → mở nút chọn ngay dưới dòng đó, chọn là đổi, không hỏi lại từ đầu ----- */
const TC_CV={fmt:t=>t.fmt==="bang"?`b:${t.koN}`:t.fmt,n:t=>t.fmt==="xoay"?t.people:t.pairs,dt:t=>t.dt||"free",date:t=>t.date,time:t=>t.time,courts:t=>t.courts,thu:t=>t.thu,fee:t=>t.fee,pay:t=>t.pay,
  gton:t=>t.gton==null?"":t.gton?"1":"0",guests:t=>t.guests?"1":"0",ref:t=>t.ref?"1":"0",pairReg:t=>t.pairReg||"pair",endBy:t=>t.endBy||"",koN:t=>t.koN,third:t=>t.third===false?"0":"1"};
const tcChips=(t,k,act="tce")=>{const Q=TC_Q.find(x=>x.k===k),cv=String(TC_CV[k]?TC_CV[k](t):"");return `<div class="tcq">${Q.o(t).filter(([v])=>v!=="?").map(([v,l])=>`<button class="tcbtn${String(v)===cv?" on":""}" data-act="${act}" data-k="${k}" data-v="${esc(String(v))}">${esc(l)}</button>`).join("")}</div>`};
// Luật điểm một vòng: số ván · chạm · tới sát nút thì sao
function tcRuleEd(t,X){const r=tcRu(t,X),c=(f,v,l,on)=>`<button class="tcbtn${on?" on":""}" data-act="tcr" data-x="${X}" data-f="${f}" data-v="${v}">${l}</button>`;
  return `<span class="tcel">Số ván</span><div class="tcq">${c("sets",1,"1 ván",r.sets===1)}${c("sets",3,"Thắng 2/3",r.sets===3)}${X==="F"?c("sets",5,"Thắng 3/5",r.sets===5):""}</div>`
    +`<span class="tcel">Mỗi ván mấy điểm</span><div class="tcq">${[7,11,15,21].map(v=>c("to",v,`${v} điểm`,r.to===v)).join("")}</div>`
    +`<span class="tcel">Tới ${r.to-1}–${r.to-1} thì sao</span><div class="tcq">${c("w","0",`Chạm ${r.to}, ai tới trước thắng`,!r.w2)}${c("w","c",`Cách 2, có tối đa`,r.w2&&r.cap!==0)}${c("w","n","Cách 2, không giới hạn",r.w2&&r.cap===0)}</div>`
    +(r.w2&&r.cap!==0?`<span class="tcel">Tối đa</span><div class="tcq">${[2,3,4,6,10].map(x=>c("cap",r.to+x,`${r.to+x}`,r.cap===r.to+x)).join("")}</div>`:"")
    +`<div class="tcq"><button class="ball go tcok" data-act="tced" data-v="">✓ Xong</button></div>`}
// Ảnh bìa (không bắt buộc): dùng chung phần poster của form tạo giải (xfPoster), lưu khi bấm Tạo giải
function tcPosterEd(){const P=xfPoster,cur=P&&!P.del?P.out:null,busy=P&&P.src&&!P.out;
  return (cur?`<img class="xpimg" src="${esc(cur)}" alt="Ảnh bìa giải">`:`<div class="xpnone">${busy?"Đang xử lý ảnh…":"Chưa có ảnh: khi chia sẻ qua Zalo, app tự vẽ ảnh từ tên giải, ngày và sân."}</div>`)
    +(P&&P.src?`<div class="tcq">${[["fit","Vừa khung"],["fill","Cắt ngang"]].map(([v,l])=>`<button class="tcbtn${P.mode===v?" on":""}" data-act="tcpm" data-v="${v}">${l}</button>`).join("")}</div>`
      +(P.mode==="fill"?`<div class="tcq">${[["0","Phần trên"],["0.5","Giữa"],["1","Phần dưới"]].map(([v,l])=>`<button class="tcbtn${String(P.pos)===v?" on":""}" data-act="tcpp" data-v="${v}">${l}</button>`).join("")}</div>`:""):"")
    +`<div class="tcq"><label class="tcbtn">${cur?"Đổi ảnh":"Chọn ảnh"}<input type="file" accept="image/*" data-xposter="1" class="sr"></label>${cur?`<button class="tcbtn" data-act="tcpdel">Bỏ ảnh</button>`:""}<button class="ball go tcok" data-act="tced" data-v="">✓ Xong</button></div>`
    +`<small class="tcel">Hiện khi chia sẻ giải qua Zalo và trên đầu trang giải. Khung ngang 1200×630: ảnh dọc chọn “Vừa khung” để giữ trọn ảnh.</small>`}
function tcEdBody(t,k){
  if(k==="poster")return tcPosterEd();
  if(k==="sG")return tcRuleEd(t,"G");if(k==="pK")return tcRuleEd(t,"K");if(k==="pF")return tcRuleEd(t,"F");
  if(k==="fmt")return tcChips(t,"fmt")+(t.fmt==="bang"&&t.pairs?`<span class="tcel">Số bảng</span>${tcChips(t,"koN")}`:"")+(t.fmt==="bang"&&tcQ(t)>=4?`<span class="tcel">Tranh hạng ba</span>${tcChips(t,"third")}`:"");
  if(k==="gton")return tcChips(t,"gton")+(t.gton?`<span class="tcel">Mức thưởng</span>${tcChips(t,"prize")}<small class="tcel">Mức khác thì gõ ở ô dưới, ví dụ “nhất 1 triệu nhì 500 ba 200”.</small>`:"");
  const Q=TC_Q.find(x=>x.k===k);if(!Q)return "";
  return tcChips(t,k)+(["n","fee","courts","time","date"].includes(k)?`<small class="tcel">Số khác thì gõ ở ô dưới, ví dụ ${{n:"“20 cặp”",fee:"“250k”",courts:"“5 sân”",time:"“6h30”",date:"“15/11”"}[k]}.</small>`:"")}
// Sau khi sửa: câu mới phát sinh mà có cách phổ biến thì lấy nút ★; còn thiếu mục bắt buộc thì mở dòng đó
const TC_ROWK={prize:"gton",koN:"fmt",cG:"sG",wG:"sG",sK:"pK",wK:"pK",cK:"pK",sF:"pF",wF:"pF",cF:"pF",third:"fmt",endX:"time"};
function tcSettle(t){t.capAsk=null;for(const Q of tcPend(t)){if(Q.need&&Q.need(t))continue;const s=Q.def?Q.def(t):Q.star?Q.star(t):null;if(s!=null)Q.set(t,String(s));t.ans.add(Q.k)}
  const r=tcReq(t)[0];return r?TC_ROWK[r.k]||r.k:null}
function tcEdit(t,k,v){const Q=TC_Q.find(x=>x.k===k);if(!Q)return;Q.set(t,String(v));t.ans.add(k);for(const x of Q.keys||[])t.guess.delete(x);
  if(k==="fmt"&&!String(v).startsWith("b:")&&t.fmt==="bang"&&t.pairs&&!t.koN)t.koN=tcBestN(t.pairs);
  const nx=tcSettle(t),stay=["fmt","gton"].includes(TC_ROWK[k]||k)&&(k==="fmt"?t.fmt==="bang":t.gton);t.edit=nx||(stay?TC_ROWK[k]||k:null)}
function tcRuleSet(t,X,f,v){const r={...tcRu(t,X)};if(f==="sets")r.sets=+v;else if(f==="to"){r.to=+v;if(r.cap&&r.cap<=r.to)r.cap=r.to+4}else if(f==="cap")r.cap=+v;
  else if(f==="w"){r.w2=v!=="0";r.cap=v==="c"?(r.cap>r.to?r.cap:r.to+4):0}t["r"+X]=r;if(X==="G")t.target=r.to}
function tcSum(t){const E=tnEst(t);
  let h=`<div class="tcsum"><button class="tcrow" data-act="tned" data-v="name"><span>Tên giải</span><b>${esc(tnName(t))}</b><i>›</i></button>`
    +tcRows(t).map(([l,v,k])=>{const on=t.edit===k;return `<button class="tcrow${on?" on":""}" data-act="${k==="nds"?"tngrp":"tced"}" data-v="${k==="nds"?"nguoi":on?"":k}" aria-expanded="${on}"><span>${l}</span><b>${v}</b><i>${on?"⌃":"›"}</i></button>${on?`<div class="tced">${tcEdBody(t,k)}</div>`:""}`}).join("")+`</div>`;
  if(E&&E.late){h+=`<div class="tnbad"><b>⚠ Không kịp · dự kiến xong ${tcHm(E.end)}</b><small>${E.m} trận trên ${t.courts} sân cần khoảng ${dur(E.mins)}, giải phải xong trước ${t.endBy}</small></div>`;
    const fx=[],tryE=p=>{const x=tnEst({...t,...p});return x?x.end:0};
    if(tcRu(t,"G").to>7)fx.push(["t7",`Vòng bảng chạm 7 thay vì ${tcRu(t,"G").to}`,tryE({rG:{...tcRu(t,"G"),to:7,cap:0,w2:false},target:7})]);
    fx.push(["c2",`Thêm 2 sân (${(t.courts||1)+2} sân)`,tryE({courts:(t.courts||1)+2})]);
    if(!t.nds&&t.pairs>4)fx.push(["half",`Giảm còn ${Math.max(4,Math.round(t.pairs/2))} cặp`,tryE({pairs:Math.max(4,Math.round(t.pairs/2)),koN:Math.max(1,Math.round((t.koN||2)/2))})]);
    fx.push(["noend","Bỏ giờ phải xong",0]);
    h+=`<div class="tnfix"><span class="cap">Chạm một cách để sửa</span>${fx.map(([k,l,e])=>`<button data-act="tnfix" data-v="${k}"><b>${l}</b><span>${e?`xong ${tcHm(e)}${E.by&&e<=E.by?" ✓":""}`:""} ›</span></button>`).join("")}</div>`}
  return h}
/* ----- Gõ sai, hỏi luật, thể thức chưa có, số vô lý (canvas trang er) -----
   Thứ tự: lọc trên máy (vô nghĩa, thể thức chưa có, hỏi luật) → AI (nếu còn lượt) → đọc bằng luật.
   AI chỉ phân loại câu; câu trả lời do app viết sẵn. Sau mỗi câu trả lời luôn hỏi lại câu đang dở. */
const TC_GL={
  cach2:[/cach (biet )?2|cach hai|win by/,"<b>Cách 2</b>: tới 10–10 thì phải thắng cách 2 điểm, ví dụ 12–10, chứ không phải ai chạm 11 trước là thắng."],
  toida:[/toi da|diem tran|tran diem/,"<b>Điểm tối đa</b>: khi phải thắng cách 2, trận có thể kéo dài. Tối đa 15 nghĩa là tới 14–14 thì ai được 15 trước là thắng, để trận không quá lâu."],
  bo:[/\bbo ?[135]\b|2\/3|3\/5|thang 2 van|thang 3 van|best of/,"<b>Thắng 2/3 (BO3)</b>: đánh tối đa 3 ván, ai thắng 2 ván trước là thắng trận. <b>Thắng 3/5 (BO5)</b> tương tự, thường chỉ dùng cho chung kết vì lâu."],
  rally:[/rally|truyen thong|tinh diem kieu/,"<b>Rally</b>: pha nào cũng tính điểm, trận nhanh và dễ đoán giờ. <b>Truyền thống</b>: chỉ bên giao bóng mới được điểm, trận lâu hơn khoảng 1,5 lần."],
  hatgiong:[/hat giong|\bseed/,"<b>Hạt giống</b>: các cặp mạnh nhất được xếp mỗi cặp một bảng, để không gặp nhau ngay vòng bảng. Số hạt giống bằng số bảng."],
  ko:[/knock ?out|\bko\b|danh loai|tu ket|ban ket|vong trong/,"<b>Đánh loại (knockout)</b>: sau vòng bảng, các cặp đứng đầu vào nhánh đấu, thua là dừng: tứ kết → bán kết → chung kết."],
  vongtron:[/vong tron|round robin/,"<b>Vòng tròn</b>: cặp nào cũng gặp tất cả cặp còn lại một lần, xếp hạng theo số trận thắng. Hợp khi ít cặp (từ 10 cặp trở xuống)."],
  xoay:[/xoay cap|giao luu/,"<b>Xoay cặp</b>: không cố định cặp, mỗi trận app tự ghép người cân trình. Hợp buổi giao lưu của CLB."],
  hang3:[/hang (ba|3)|tranh ba/,"<b>Tranh hạng ba</b>: 2 cặp thua bán kết đánh thêm một trận để chọn hạng ba. Không đánh thì cả hai cùng đồng hạng ba."],
  trongtai:[/trong tai|\bqr\b/,"<b>Trọng tài (QR)</b>: mỗi sân một người quét mã QR của sân, nhập điểm từng pha, loa tự gọi điểm. Không có trọng tài thì BTC nhập tỉ số trên app."],
  honhop:[/hon hop|\bopen\b/,"<b>Đôi hỗn hợp</b>: ai đánh với ai cũng được, nam nam, nữ nữ hay nam nữ."],
  cham:[/cham (\d+|la thang|bao nhieu)|cham la gi/,"<b>Chạm 11</b>: bên nào được 11 điểm trước là thắng ván. Chạm 15, 21 thì trận dài hơn."]};
const tcAskQ=n=>/la gi|la sao|nghia la|the nao|sao vay|giai thich|khac gi|\?|la cai gi|hieu sao/.test(n);
// Thể thức app chưa có: k (ghi lại), dò chữ, tên, gần nhất
const TC_NO=[
  ["loai",n=>/loai truc tiep|thua (la )?(ve|nghi|out)|single elim/.test(n)&&!/bang/.test(n),"loại trực tiếp riêng"],
  ["don",n=>/\bdon (nam|nu)\b|danh don|\bsingles?\b|\b1 vs 1\b|1 ?- ?1\b/.test(n),"đánh đơn"],
  ["vua",n=>/vua san|king/.test(n),"vua sân"],
  ["nhanh2",n=>/nhanh (thang|thua)|double elim|thua 2 (lan|tran) (moi|thi)/.test(n),"nhánh thắng nhánh thua"],
  ["swiss",n=>/thuy si|swiss/.test(n),"hệ Thuỵ Sĩ"],
  ["doi",n=>/dong doi|\bteam\b|doi tuyen|giai doi khang/.test(n),"đánh đồng đội"]];
const TC_NOL={loai:"loại trực tiếp riêng",don:"đánh đơn",vua:"vua sân",nhanh2:"nhánh thắng nhánh thua",swiss:"hệ Thuỵ Sĩ",doi:"đánh đồng đội",khac:"thể thức này"};
// Câu trả lời cho thể thức chưa có: gợi ý cách gần nhất bằng số của giải này
function tcNoAsk(t,k){const n=+t.pairs||16,N=Math.max(2,Math.round(n/3)),L=TC_NOL[k]||TC_NOL.khac;
  if(k==="don")return {q:`Nội dung <b>đánh đơn</b> app đang làm, <b>sắp có</b>. Hiện app chạy các nội dung đánh đôi.`,o:[["MM","Đôi nam"],["FF","Đôi nữ"],["mix","Đôi nam nữ"],["free","Đôi hỗn hợp"]].map(([v,l])=>({l,p:{dt:v,fmt:t.fmt&&t.fmt!=="xoay"?t.fmt:"bang"},a:"dt"}))};
  const near=k==="vua"?["xoay","Xoay cặp","mỗi trận đổi bạn, app ghép cân trình, ai cũng được đánh liên tục."]:k==="swiss"&&n<=10?["giai","Vòng tròn","cặp nào cũng gặp nhau, xếp hạng theo số trận thắng."]
    :["bang","Chia bảng + knockout",k==="loai"?`với bảng nhỏ: ${N} bảng ${Math.floor(n/N)}–${Math.ceil(n/N)} cặp, mỗi cặp đánh 2–3 trận rồi vào loại. Không ai phải về sau 1 trận.`:"chia bảng đánh vòng tròn, các cặp đứng đầu vào nhánh đấu loại."];
  return {q:`App chưa có <b>${L}</b>.<br><br>Gần nhất là <b>${near[1]}</b>: ${near[2]}`,o:[{l:`Dùng ${near[1].toLowerCase()}`,p:{fmt:near[0],...(near[0]==="bang"&&k==="loai"?{koN:N,lay:2}:{})},a:"fmt",star:1},{l:"Chọn thể thức khác",act:"tcre",v:"fmt"}]}}
// Ghi lại thể thức người dùng muốn có (chỉ tên thể thức, CLB, ngày): chủ app xem ở trang Quản trị
function tcWant(k){if(!k||!CID)return;if(!TC_NOL[k])k="khac";const d=ymdIso(Date.now());
  try{FB.setDoc(FB.doc(FB.fs,`yeucau/${d}_${CID}_${k}`),{tt:k,cid:CID,day:d,at:Date.now()}).catch(()=>{})}catch(e){}}
// Từ chối tên tục, xúc phạm (tên giải hiện công khai)
const TC_BAD=/(^|[^\p{L}])(địt|đụ|đéo|lồn|cặc|buồi|đĩ|đmm?|dmm?|đcm|dcm|vcl|vkl|clgt|cl|cc|óc chó|chó đẻ|mẹ mày|đm mày|fuck|shit|bitch)(?![\p{L}])/iu;
const tcBadName=x=>TC_BAD.test(String(x||"").toLowerCase());
// Câu không có số, không có từ khoá nào → vô nghĩa, không gọi AI
const TC_KW=/san|cap|bang|gio|nguoi|phi|thuong|giai|nhat|nhi|ngay|thu|chu nhat|\bcn\b|mai|chuyen khoan|\bck\b|doi|nam|nu|vong|xoay|cham|cach|toi da|tien|k\b|trieu|lit|xi|canh|clb|thanh vien|khach|tran|danh|loai|ket|ten|dang ky|trong tai|ghep|sang|chieu|toi|tuan|bo\d|hang/;
const tcJunk=n=>!/\d/.test(n)&&!TC_KW.test(n);
// Số vô lý, câu mâu thuẫn: hỏi lại bằng nút, không tự sửa
function tcOdd(t){const d0=tnDay0(Date.now());
  if(t.perG&&t.koN&&t.pairs&&t.koN*t.perG!==t.pairs){const p=t.pairs,N=t.koN,g=t.perG,b=tcBestN(p);delete t.perG;
    return {q:`${p} cặp mà ${N} bảng × ${g} cặp chỉ có ${N*g} cặp. Bạn muốn sao?`,o:[{l:`${p} cặp, ${b} bảng`,p:{koN:b},star:1},...(b!==N?[{l:`${p} cặp, ${N} bảng ${Math.ceil(p/N)} cặp`,p:{koN:N}}]:[]),{l:`${N*g} cặp, ${N} bảng`,p:{pairs:N*g}}]}}
  delete t.perG;
  const big=(k,x,mx,u,f)=>({q:`<b>${x} ${u}</b> ${f} Bạn chắc chứ?`,o:[{l:`Ý mình là ${Math.max(2,Math.round(x/10))} ${u}`,p:{[k]:Math.max(2,Math.round(x/10))},star:1},{l:x>mx?`${mx} ${u} (tối đa)`:`Đúng ${x} ${u}`,p:{[k]:Math.min(x,mx)}}]});
  if(t.pairs>40&&!t.ok40){t.ok40=1;return big("pairs",t.pairs,64,"cặp",`là rất nhiều${t.courts?` cho ${t.courts} sân`:""}, đánh cả ngày chưa chắc xong.`)}
  if(t.people>80&&!t.ok80){t.ok80=1;return big("people",t.people,120,"người","là rất đông cho một buổi.")}
  if(t.courts>16&&!t.ok16){t.ok16=1;return big("courts",t.courts,30,"sân","là rất nhiều sân.")}
  if(+t.fee>2000&&!t.okFee){t.okFee=1;const a=Math.round(+t.fee/100);return {q:`Lệ phí <b>${tnK(+t.fee)}</b> mỗi người, bạn chắc chứ?`,o:[{l:`Ý mình là ${fmtK(a)}`,p:{fee:a},star:1},{l:`Đúng ${tnK(+t.fee)}`,p:{}}]}}
  if(t.date!=null&&t.date<d0){const n=d0+((new Date(t.date).getDay()-new Date(d0).getDay()+7)%7||7)*864e5;t.date=null;
    return {q:`Ngày đó đã qua rồi. Bạn muốn đánh ngày nào?`,o:[{l:`${tnDow(n)} ${tnDm(n)} (gần nhất)`,p:{date:n},star:1},{l:`${tnDow(n+7*864e5)} ${tnDm(n+7*864e5)}`,p:{date:n+7*864e5}}]}}
  if(t.name&&tcBadName(t.name)){t.name="";return {q:`Tên này không dùng được vì tên giải hiện công khai cho mọi người. Mình đặt tạm <b>${esc(tnAutoName(t))}</b> nhé?`,o:[{l:"Dùng tên này",p:{},star:1},{l:"Gõ tên khác",act:"tned",v:"name"}]}}
  return null}
// Đọc câu đầu (sau Soạn giải): thể thức chưa có thì hỏi trước, rồi số vô lý
function tcFirst(t,txt){const n=tnNorm(txt),no=TC_NO.find(([,f])=>f(n));
  if(no){tcWant(no[0]);if(no[0]!=="don"){t.fmt=null;t.said.delete("fmt")}t.ask=tcNoAsk(t,no[0]);return}
  if(tnAIM.loai==="chuaco"&&tnAIM.tt){tcWant(tnAIM.tt);t.fmt=null;t.said.delete("fmt");t.ask=tcNoAsk(t,tnAIM.tt);return}
  t.ask=tcOdd(t)}
// Người dùng gõ trong khung trò chuyện
async function tcSay(s){const t=tn,n=tnNorm(s),cur=t.ask||t.sumOn?null:tcPend(t)[0];delete drafts["tn-say"];
  // Câu đang hỏi giữ lại trong khung trò chuyện, trả lời xong thì hỏi lại
  if(t.ask)t.log.push({b:t.ask.q});else if(cur)t.log.push({q:cur.q(t)});t.log.push({a:s});t.ask=null;
  const miss=()=>{t.miss=(t.miss||0)+1;t.log.push({b:t.miss>=2?"Có vẻ gõ hơi khó. Bấm một nút là nhanh nhất, hoặc chuyển sang form đầy đủ để tự điền.":"Mình chưa hiểu 😅 Bạn bấm nút bên dưới, hoặc gõ kiểu <b>“4 sân”</b>, <b>“250k”</b>, <b>“nhất 1 triệu”</b>."})};
  const merge=o=>{const k=Object.keys(o).filter(x=>x!=="wd");if(!k.length)return false;tnMerge(o);tcTyped(t,k);t.miss=0;t.ask=tcOdd(t);return true};
  const rules=()=>{const p=tnParse(s);delete p.wd;const k=Object.keys(p).filter(x=>!["date","time"].includes(x)||/ngay|gio|\dh|thu|chu nhat|mai|\//.test(n)),o={};for(const x of k)o[x]=p[x];return o};
  t.wasDone=!cur&&!t.ask;
  // 0. Đang hỏi (hoặc đang sửa) luật điểm một vòng: đọc "1 ván chạm 15", "thắng 2/3", "cách 2 tối đa 18" cho đúng vòng đó
  {const RX={sG:"G",wG:"G",cG:"G",pK:"K",sK:"K",wK:"K",cK:"K",pF:"F",sF:"F",wF:"F",cF:"F"},X=RX[t.edit]||(cur&&RX[cur.k]);
    if(X&&!tcAskQ(n)){const r=tcRuleTxt(t,X,n);if(r){t["r"+X]=r;if(X==="G")t.target=r.to;for(const k of Object.keys(RX))if(RX[k]===X)t.ans.add(k);if(t.cust)t.cust.delete(X);t.capAsk=null;t.miss=0;
      t.log.push({b:`Đã ghi <b>${X==="G"?(t.fmt==="bang"?"vòng bảng":"mỗi trận"):X==="K"?(tcQ(t)>=8?"tứ kết, bán kết":"bán kết"):"chung kết"}</b>: ${esc(tcRTx(r))}.`});if(r.cap<0)t.ask=tcCapAsk(t,X);return}}}
  // 1. Thể thức chưa có
  const no=TC_NO.find(([,f])=>f(n));
  if(no){tcWant(no[0]);const o=rules();delete o.fmt;if(Object.keys(o).length){tnMerge(o);tcTyped(t,Object.keys(o))}t.miss=0;t.ask=tcNoAsk(t,no[0]);return}
  // 2. Hỏi luật
  if(tcAskQ(n)){const g=Object.values(TC_GL).find(([re])=>re.test(n));if(g){t.miss=0;t.log.push({b:g[1]});return}}
  // 3. Vô nghĩa: không gọi AI
  if(tcJunk(n)){miss();return}
  // 4. AI (còn lượt), rồi đọc bằng luật
  tnBusy=true;tcWait=Infinity;render();tcDown();const a=await tnAI(s,tnCur(t));tnBusy=false;const M=tnAIM;
  if(M.lim&&!t.noAI){t.noAI=1;t.log.push({b:"Hôm nay CLB đã dùng hết lượt AI. App vẫn đọc được số, ngày giờ, tiền; phần còn lại bạn bấm nút nhé."})}
  if(M.loai==="chuaco"&&M.tt){tcWant(M.tt);if(a){delete a.fmt;if(Object.keys(a).length){tnMerge(a);tcTyped(t,Object.keys(a))}}t.miss=0;t.ask=tcNoAsk(t,M.tt);return}
  if(M.loai==="hoi"){t.miss=0;t.log.push({b:(TC_GL[M.hoi]||[])[1]||"Câu này mình chưa giải thích được. Mình chỉ rành các luật dùng khi tạo giải: cách 2, điểm tối đa, thắng 2/3, hạt giống, tranh hạng ba…"});return}
  if(M.loai==="ngoai"){t.miss=0;t.log.push({b:"Việc này app chưa làm, bạn tự lo giúp mình nhé. Mình tiếp tục tạo giải:"});return}
  if(a&&merge(a))return;
  if(merge(rules()))return;
  miss()}
// Đọc luật điểm gõ tay cho một vòng; không có gì thì trả null.
// "chạm 15" (không nói "cách") = chạm là thắng; có "cách" mới là cách 2; "cách 2" mà chưa nói tối đa thì cap = -1 (hỏi lại)
function tcRuleTxt(t,X,n){const r={...tcRu(t,X)};let m,hit=false,toHit=false;
  if(/giong vong bang/.test(n)&&X!=="G")return {...tcRu(t,"G")};
  if(/3\/5|bo ?5|thang 3 van|\b5 van/.test(n)){r.sets=5;hit=true}else if(/2\/3|bo ?3|thang 2 van|\b[23] van/.test(n)){r.sets=3;hit=true}else if(/\b1 van|mot van|bo ?1\b|1 game|1 set/.test(n)){r.sets=1;hit=true}
  if(r.sets===5&&X!=="F")r.sets=3;
  const s2=n.replace(/\b\d\/\d\b|\bbo ?\d\b|\b\d (van|game|set)\b/g," ").replace(/(toi da|tran|max)\s*\d+/g," ");
  if(m=s2.match(/(?:cham|toi|den|danh)\s*(\d{1,2})\b/)||s2.match(/\b(\d{1,2})\s*(?:diem|cach|an\b|la thang)/)||s2.match(/\b(\d{1,2})\b/)){const v=+m[1];if(v>=5&&v<=31){r.to=v;hit=toHit=true}}
  const cm=n.match(/(?:toi da|tran|max)\s*(\d{1,2})/);
  if(cm){r.w2=true;r.cap=Math.max(r.to+1,+cm[1]);hit=true}
  else if(/khong gioi han/.test(n)){r.w2=true;r.cap=0;hit=true}
  else if(/\bcach\b/.test(n)&&!/khong (can )?cach/.test(n)){r.w2=true;r.cap=-1;hit=true}
  else if(toHit||/la thang|an luon|ai toi truoc|khong (can )?cach/.test(n)){r.w2=false;r.cap=0;hit=true}
  return hit?r:null}
// Cách 2 mà chưa nói tối đa: hỏi bằng nút
function tcCapAsk(t,X){const r=tcRu(t,X),L=[2,3,4,6].map(x=>r.to+x);
  return {q:`Cách 2 thì tối đa mấy điểm?`,o:[...L.map(v=>({l:`Tối đa ${v}`,p:{["r"+X]:{...r,cap:v}}})),{l:"Không giới hạn",p:{["r"+X]:{...r,cap:0}}}]}}
// Chọn nút của câu hỏi phụ (thể thức chưa có, số vô lý, mâu thuẫn, tên)
function tcAskAns(t,i){const A=t.ask,o=A&&A.o[+i];if(!o)return;t.log.push({q:A.q.replace(/<br>/g," ").replace(/<[^>]+>/g,""),a:o.l});t.ask=null;
  for(const [k,v] of Object.entries(o.p||{})){t[k]=v;t.guess.delete(k)}
  if(o.p&&o.p.fmt){t.ans.add("fmt");if(o.p.koN)t.ans.add("koN");if(o.p.fmt!=="xoay"){t.thu="phi";if(t.third==null)t.third=true;if(!t.pairReg)t.pairReg="pair"}}
  if(o.a)t.ans.add(o.a);if(o.p&&"dt" in o.p)t.ans.add("dt");if(o.p&&"date" in o.p)t.ans.add("date");if(o.p&&("pairs" in o.p||"koN" in o.p))t.ans.add("koN");
  t.ask=tcOdd(t)}

/* ----- Giao diện: hiệu ứng đang gõ -----
   Sau mỗi câu trả lời, lời app hiện sau một nhịp ngắn (chấm "đang gõ") tuỳ độ dài, rồi hiện dần. Test thì không chờ. */
let tcWait=0,tcTm=null;
function tcParts(t){const P=[],cur=t.ask||t.sumOn?null:tcPend(t)[0],req=tcReq(t).length,me=h=>P.push({me:1,h:tcMe(h)}),bot=(h,ex)=>P.push({h:tcBot(h,ex),n:(h+(ex||"")).replace(/<[^>]+>/g,"").length});
  if(t.from)bot(`Mình lấy lại cài đặt của <b>${esc(t.fromName||"")}</b>, ngày chuyển sang tuần gần nhất.`);
  else if(t.pick){me(esc(t.pick));bot("Được. Mình hỏi vài câu để soạn giải nhé, câu nào chưa biết thì bấm “Để app chọn”.")}
  else{me(esc(t.txt));const s=t.seenH;bot(s?"Mình đã hiểu:":"Mình chưa đọc được nhiều từ câu này, mình hỏi từng mục nhé.",s);
    if(cur||t.log.length||t.ask)bot(`Còn vài câu nữa cho giải chạy trơn tru.${req?"":" Câu nào bỏ qua thì app chọn theo cách phổ biến."}`)}
  for(const x of t.log){if(x.q)bot(`<b>${esc(x.q)}</b>`);if(x.a)me(esc(x.a));if(x.b)bot(x.b)}
  if(t.ask){const A=t.ask;bot(A.q);P.push({h:`<div class="tcq">${A.o.map((o,i)=>`<button class="tcbtn${o.star?" star":""}" data-act="${o.act||"tcx"}" data-v="${esc(o.act?o.v:String(i))}">${esc(o.l)}${o.star?" ★":""}</button>`).join("")}${(t.miss||0)>=2?`<button class="lnk tcdef" data-act="tnfull">Tạo bằng form đầy đủ ›</button>`:""}</div>`})}
  else if(cur){const st=cur.star?cur.star(t):null,nt=cur.note?cur.note(t):"",canDef=cur.def||st!=null;
    bot(`<b>${esc(cur.q(t))}</b>`,nt?`<small>${esc(nt)}</small>`:"");
    P.push({h:`<div class="tcq">${cur.o(t).map(([v,l])=>`<button class="tcbtn${String(v)===String(st)?" star":""}" data-act="tca" data-k="${cur.k}" data-v="${esc(String(v))}">${esc(l)}${String(v)===String(st)?" ★":""}</button>`).join("")}${canDef?`<button class="lnk tcdef" data-act="tca" data-k="${cur.k}" data-v="__def">Để app chọn</button>`:""}${req?"":`<button class="lnk tcdef" data-act="tcskip">Bỏ qua các câu còn lại</button>`}${(t.miss||0)>=2?`<button class="lnk tcdef" data-act="tnfull">Tạo bằng form đầy đủ ›</button>`:""}</div>`})}
  else{bot("Xong rồi! Bạn kiểm tra lại nhé. Muốn đổi dòng nào thì bấm vào dòng đó để chọn lại ngay.",tcSum(t));
    t.sumOn=true;const E=tnEst(t),R=tcReq(t);
    if(R.length)P.push({h:`<div class="tcq end"><button class="btn-line" data-act="tced" data-v="${TC_ROWK[R[0].k]||R[0].k}">Còn thiếu: ${esc(R[0].q(t).replace(/\?$/,""))}</button></div>`});
    else P.push({h:`<div class="tcq end">${E&&E.late?`<button class="btn-line" data-act="tnmk" data-v="late">Tạo giải dù không kịp</button>`:`<button class="ball go" data-act="tnmk">✓ Tạo giải</button>`}</div>`})}
  return P}
// Lời app mới (sau câu của người dùng) chờ một nhịp rồi mới hiện
function tcBeat(){const P=tcParts(tn);let i=P.length;while(i>0&&!P[i-1].me)i--;const n=P.slice(i).reduce((a,x)=>a+(x.n||0),0);
  const ms=typeof window!=="undefined"&&window.__PBTEST?0:Math.min(1500,500+n*9);clearTimeout(tcTm);
  if(!ms){tcWait=0;return}tcWait=Date.now()+ms;tcTm=setTimeout(()=>{tcWait=0;render();tcDown()},ms)}
function tcPage(D){const t=tn,P=tcParts(t),wait=tcWait>Date.now();
  mxDr({t:"Tạo nhanh",back:"tnback",sub:t.from?"Như giải lần trước":"Trò chuyện với AI tạo giải"});
  let L=P;if(wait){let i=P.length;while(i>0&&!P[i-1].me)i--;L=P.slice(0,i)}
  const seen=t.seenN||0;
  let h=`<div class="tcchat">${L.map((x,i)=>i>=seen&&!x.me?x.h.replace(/^<div class="(tcb|tcq)([^"]*)"/,`<div class="$1$2 tcnew" style="animation-delay:${Math.min(4,i-seen)*110}ms"`):x.h).join("")}${wait?`<div class="tcb tctyping"><span class="tcav" aria-hidden="true">AI</span><div aria-label="AI đang trả lời"><i></i><i></i><i></i></div></div>`:""}`;
  if(!wait)t.seenN=P.length;
  if(errs.xf)h+=`<p class="err">${esc(errs.xf)}</p>`;
  h+=`</div><div class="hqcta tcbar"><div class="tnsay"><input id="tn-say" data-draft="tn-say" maxlength="200" placeholder="Hoặc gõ câu trả lời, yêu cầu khác…" value="${esc(val("tn-say",""))}"><button class="ball go" data-act="tnsay" aria-label="Gửi"${tnBusy||wait?" disabled":""}>Gửi</button></div></div>`;
  return h+tnEdSheet()}
// Cuộn xuống cuối khung chat sau khi trả lời
const tcDown=()=>{try{requestAnimationFrame(()=>{try{scrollTo({top:document.body.scrollHeight})}catch(e){}})}catch(e){}};
const tcGo=()=>{tcBeat();render();tcDown()};
async function tcAct(act,b){if(!tn||!tn.ans)return false;
  if(tcWait>Date.now())return true;
  if(act==="tca"){tcAnswer(tn,b.dataset.k,b.dataset.v);tn.ask=tcOdd(tn);tcGo();return true}
  if(act==="tcx"){tcAskAns(tn,b.dataset.v);tcGo();return true}
  if(act==="tcskip"){tcSkipAll(tn);tcGo();return true}
  if(act==="tcre"){tn.ask=null;tn.edit=null;tcRe(tn,b.dataset.v);tcGo();return true}
  if(act==="tced"){tn.edit=b.dataset.v||null;render();return true}
  if(act==="tce"){tcEdit(tn,b.dataset.k,b.dataset.v);render();return true}
  if(act==="tcpm"){if(xfPoster){xfPoster.mode=b.dataset.v==="fill"?"fill":"fit";xPosterRedo()}return true}
  if(act==="tcpp"){if(xfPoster){xfPoster.pos=Math.max(0,Math.min(1,+b.dataset.v||0));xPosterRedo()}return true}
  if(act==="tcpdel"){xfPoster=null;render();return true}
  if(act==="tcr"){tcRuleSet(tn,b.dataset.x,b.dataset.f,b.dataset.v);render();return true}
  return false}
