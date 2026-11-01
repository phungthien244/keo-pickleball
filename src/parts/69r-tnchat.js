/* ---------- Tạo nhanh kiểu trò chuyện (canvas trang chat) ----------
   Sau khi đọc câu, app hỏi lần lượt những gì còn thiếu. Mỗi câu có nút trả lời nhanh (★ là app khuyên dùng) và "Để app chọn".
   Câu hỏi do app đặt sẵn, không gọi AI; gõ chữ vào ô dưới thì đọc bằng luật + AI như "Sửa bằng lời".
   Hỏi mục bắt buộc còn thiếu trước (thể thức, số cặp, ngày giờ, sân, tiền, giải thưởng) → mục có sẵn cách phổ biến (tính điểm từng vòng, trọng tài…).
   Hỏi xong: thẻ tóm tắt trong khung chat, bấm dòng nào thì hỏi lại câu đó.
   Luật điểm từng vòng: tn.rG (vòng bảng / mọi trận), tn.rK (tứ kết, bán kết), tn.rF (chung kết) = {to, w2, cap, sets} như koFromX. */
const tcR=(to,w2,cap,sets)=>({to,w2,cap,sets});
const tcRDef=(t,X)=>X==="G"?tcR(+t.target||11,false,0,1):X==="K"?tcR(15,true,18,1):tcR(11,true,15,3);
const tcRu=(t,X)=>t["r"+X]||tcRDef(t,X);
const tcRTx=r=>`${r.sets>1?`Thắng ${Math.ceil(r.sets/2)}/${r.sets} ván`:"1 ván"} chạm ${r.to}${r.w2?`, cách 2${r.cap?`, tối đa ${r.cap}`:", không giới hạn"}`:""}`;
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
  return [...L,["giai","Vòng tròn"],["xoay","Xoay cặp (giao lưu)"],["?","Giải thích giúp tôi"]]}
// Giải thích các cách bằng số của chính giải này
function tcExplain(t){const n=+t.pairs||0,c=+t.courts||0;
  const one=(l,p)=>{const x={...t,...p},m=tnCount(x.fmt,n,x.koN,(x.koN||1)*2,true),E=tnEst(x),per=x.fmt==="giai"?n-1:Math.max(1,Math.floor(n/(x.koN||1))-1);
    return `<b>${l}</b>: ${m} trận${E?`, xong khoảng ${tcHm(E.end)}`:""}. Cặp nào cũng đánh ít nhất ${per} trận.`};
  const L=tcFmtOpts(t).filter(([v])=>v.startsWith("b:")).map(([v,l])=>one(l,{fmt:"bang",koN:+v.slice(2),lay:2}));
  if(n)L.push(one("Vòng tròn",{fmt:"giai"}));
  L.push(`<b>Xoay cặp</b>: không cố định cặp, mỗi trận app tự ghép người cân trình. Hợp buổi giao lưu, không cần đăng ký theo cặp.`);
  const best=tcStar(t,"fmt"),bl=(tcFmtOpts(t).find(([v])=>v===best)||[])[1];
  return `${n?`Với ${n} cặp${c?`, ${c} sân`:""}:`:"Các cách đánh:"}<br><br>${L.join("<br><br>")}${bl?`<br><br>Lần đầu tổ chức thì nên chọn <b>${esc(bl)}</b>.`:""}`}
const tcEndOpts=t=>{const E=tnEst({...t,endBy:""});if(!E)return [];const h=new Date(E.end).getHours()+1;return [h,h+1].filter(x=>x<24).map(x=>[`${String(x).padStart(2,"0")}:00`,`Trước ${x}:00`])};
const TC_PK=[["same","Giống vòng bảng"],["1:15:18","1 ván chạm 15, cách 2, tối đa 18"],["3:11:15","Thắng 2/3 ván chạm 11, tối đa 15"],["more","Khác…"]];
const TC_PF=[["1:15:18","1 ván chạm 15, cách 2, tối đa 18"],["3:11:15","Thắng 2/3 ván chạm 11, tối đa 15"],["5:11:15","Thắng 3/5 ván chạm 11, tối đa 15"],["more","Khác…"]];
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
  {k:"sG",on:t=>t.fmt,keys:["target"],q:t=>t.fmt==="bang"?"Vòng bảng mỗi trận đánh thế nào?":"Mỗi trận đánh thế nào?",
    o:t=>[["1:11","1 ván chạm 11"],["1:15","1 ván chạm 15"],["1:21","1 ván chạm 21"],...(t.fmt==="bang"?[["3:11","Thắng 2/3 ván chạm 11"]]:[])],star:()=>"1:11",
    set:(t,v)=>{const [s,to]=v.split(":").map(Number);tcSet(t,"G",{sets:s,to,cap:tcRu(t,"G").cap?Math.max(to+2,tcRu(t,"G").cap):0})}},
  {k:"wG",on:t=>t.fmt,q:t=>{const to=tcRu(t,"G").to;return `Tới ${to-1}–${to-1} thì sao?`},
    o:t=>{const to=tcRu(t,"G").to;return [["0",`Chạm ${to} là thắng`],[`c:${to+4}`,`Phải cách 2, tối đa ${to+4}`],["c:0","Phải cách 2, không giới hạn"],["more","Tối đa khác…"]]},star:()=>"0",
    note:t=>t.fmt==="bang"?"Vòng bảng nhiều trận nên chạm là thắng cho nhanh.":"",set:(t,v)=>tcW(t,"G",v)},
  {k:"cG",on:t=>t.capAsk==="G",q:()=>"Tối đa mấy điểm?",o:t=>tcCapOpts(tcRu(t,"G").to),star:t=>String(tcRu(t,"G").to+4),set:(t,v)=>{tcSet(t,"G",{w2:true,cap:+v});t.capAsk=null}},
  {k:"pK",on:t=>t.fmt==="bang"&&tcQ(t)>=4,q:t=>tcQ(t)>=8?"Tứ kết và bán kết đánh thế nào?":"Bán kết đánh thế nào?",o:()=>TC_PK,star:()=>"1:15:18",set:(t,v)=>tcP(t,"K",v)},
  {k:"sK",on:t=>t.cust&&t.cust.has("K"),q:()=>"Mỗi trận vòng loại đánh mấy ván?",o:()=>[["1:11","1 ván chạm 11"],["1:15","1 ván chạm 15"],["3:11","Thắng 2/3 ván chạm 11"]],star:()=>"1:15",
    set:(t,v)=>{const [s,to]=v.split(":").map(Number);tcSet(t,"K",{sets:s,to})}},
  {k:"wK",on:t=>t.cust&&t.cust.has("K"),q:t=>{const to=tcRu(t,"K").to;return `Vòng loại tới ${to-1}–${to-1} thì sao?`},
    o:t=>{const to=tcRu(t,"K").to;return [["0",`Chạm ${to} là thắng`],[`c:${to+3}`,`Phải cách 2, tối đa ${to+3}`],["c:0","Phải cách 2, không giới hạn"],["more","Tối đa khác…"]]},star:t=>`c:${tcRu(t,"K").to+3}`,set:(t,v)=>tcW(t,"K",v)},
  {k:"cK",on:t=>t.capAsk==="K",q:()=>"Vòng loại tối đa mấy điểm?",o:t=>tcCapOpts(tcRu(t,"K").to),star:t=>String(tcRu(t,"K").to+4),set:(t,v)=>{tcSet(t,"K",{w2:true,cap:+v});t.capAsk=null}},
  {k:"pF",on:t=>t.fmt==="bang",q:()=>"Chung kết đánh thế nào?",o:()=>TC_PF,star:()=>"3:11:15",note:()=>"Thắng 2/3 hay 3/5 thì mỗi ván vẫn phải cách 2 điểm.",set:(t,v)=>tcP(t,"F",v)},
  {k:"sF",on:t=>t.cust&&t.cust.has("F"),q:()=>"Chung kết đánh mấy ván?",o:()=>[["1:15","1 ván chạm 15"],["3:11","Thắng 2/3 ván chạm 11"],["5:11","Thắng 3/5 ván chạm 11"],["1:21","1 ván chạm 21"]],star:()=>"3:11",
    set:(t,v)=>{const [s,to]=v.split(":").map(Number);tcSet(t,"F",{sets:s,to})}},
  {k:"wF",on:t=>t.cust&&t.cust.has("F"),q:t=>{const to=tcRu(t,"F").to;return `Chung kết tới ${to-1}–${to-1} thì sao?`},
    o:t=>{const to=tcRu(t,"F").to;return [["0",`Chạm ${to} là thắng`],[`c:${to+4}`,`Phải cách 2, tối đa ${to+4}`],["c:0","Phải cách 2, không giới hạn"],["more","Tối đa khác…"]]},star:t=>`c:${tcRu(t,"F").to+4}`,set:(t,v)=>tcW(t,"F",v)},
  {k:"cF",on:t=>t.capAsk==="F",q:()=>"Chung kết tối đa mấy điểm?",o:t=>tcCapOpts(tcRu(t,"F").to),star:t=>String(tcRu(t,"F").to+4),set:(t,v)=>{tcSet(t,"F",{w2:true,cap:+v});t.capAsk=null}},
  {k:"third",on:t=>t.fmt==="bang"&&tcQ(t)>=4,keys:["third"],q:()=>"Có đánh tranh hạng ba không?",o:()=>[["1","Có"],["0","Không, đồng hạng ba"]],star:()=>"1",set:(t,v)=>{t.third=v==="1"}},
  {k:"pairReg",on:t=>t.fmt&&t.fmt!=="xoay",keys:["pairReg"],q:()=>"Người chơi đăng ký thế nào?",o:()=>[["pair","Theo cặp"],["solo","Từng người, BTC ghép"]],star:()=>"pair",set:(t,v)=>{t.pairReg=v}},
  {k:"guests",keys:["guests"],q:()=>"Ai được đăng ký?",o:()=>[["0","Thành viên CLB"],["1","Mọi người"]],star:t=>t.guests?"1":"0",set:(t,v)=>{t.guests=v==="1"}},
  {k:"ref",on:t=>t.fmt&&t.fmt!=="xoay",keys:["ref"],q:()=>"Ai nhập tỉ số?",o:()=>[["0","BTC nhập trên app"],["1","Mỗi sân 1 trọng tài (QR)"]],star:t=>t.fmt==="bang"&&(+t.courts||0)>=3?"1":"0",
    note:()=>"Trọng tài quét mã QR của sân, nhập từng pha, loa tự gọi điểm.",set:(t,v)=>{t.ref=v==="1"}},
  {k:"endX",on:t=>t.fmt==="xoay"&&t.time,keys:["end"],q:()=>"Đánh đến mấy giờ?",o:t=>{const [h,m]=t.time.split(":").map(Number);return [2,2.5,3].map(x=>{const a=h*60+m+x*60;return `${String(Math.floor(a/60)%24).padStart(2,"0")}:${String(a%60).padStart(2,"0")}`}).map(v=>[v,v]).concat([["","Không cố định"]])},
    star:()=>"",set:(t,v)=>{t.end=v}},
  {k:"endBy",on:t=>t.fmt&&t.fmt!=="xoay",keys:["endBy","end"],q:()=>"Có cần xong trước giờ nào không?",o:t=>[["","Không cố định"],...tcEndOpts(t)],star:()=>"",
    note:t=>{const E=tnEst({...t,endBy:""});return E?`App dự kiến xong khoảng ${tcHm(E.end)}.`:""},set:(t,v)=>{t.endBy=v}},
];
const tcCapOpts=to=>[2,4,6,8,10].map(x=>[String(to+x),`Tối đa ${to+x}`]);
function tcW(t,X,v){if(v==="more"){t.capAsk=X;t.ans.delete("c"+X);return}t.capAsk=null;if(v==="0")tcSet(t,X,{w2:false,cap:0});else tcSet(t,X,{w2:true,cap:+v.slice(2)||0})}
function tcP(t,X,v){t.cust=t.cust||new Set();if(v==="more"){t.cust.add(X);for(const k of ["s","w","c"])t.ans.delete(k+X);return}t.cust.delete(X);
  if(v==="same"){t["r"+X]={...tcRu(t,"G")};return}const [s,to,cap]=v.split(":").map(Number);t["r"+X]=tcR(to,true,cap,s)}
const tcOn=(t,Q)=>!Q.on||!!Q.on(t);
const tcSaid=(t,Q)=>(Q.keys||[]).some(k=>t.said.has(k));
// Câu còn phải hỏi: chưa trả lời và (bắt buộc mà chưa có, hoặc chưa nói trong câu tả)
function tcPend(t){const nd=Q=>!!(Q.need&&Q.need(t)),A=TC_Q.filter(Q=>tcOn(t,Q)&&!t.ans.has(Q.k)&&(nd(Q)||!tcSaid(t,Q))),L=[...A.filter(nd),...A.filter(Q=>!nd(Q))];
  if(t.reAsk){const i=L.findIndex(Q=>Q.k===t.reAsk);if(i>0)L.unshift(L.splice(i,1)[0])}return L}
const tcReq=t=>tcPend(t).filter(Q=>Q.need&&Q.need(t));
// Bắt đầu trò chuyện từ bản nháp tn (sau khi đọc câu): mục nói trong câu (không phải ĐOÁN) coi như đã biết
function tcStart(t,txt,said){t.said=new Set((said||[]).filter(k=>t[k]!=null&&t[k]!==""&&!t.guess.has(k)));t.ans=new Set();t.log=[];t.txt=txt||"";t.reAsk=null;t.capAsk=null;t.cust=new Set();
  if(t.target)t.rG=tcR(+t.target,false,0,1);return t}
function tcAnswer(t,k,v){const Q=TC_Q.find(x=>x.k===k);if(!Q)return;
  if(k==="fmt"&&v==="?"){t.log.push({a:"Giải thích giúp tôi"},{b:tcExplain(t)});return}
  const def=v==="__def",val=def?(Q.def?Q.def(t):Q.star?Q.star(t):null):v;if(val==null)return;
  const lb=def?`Để app chọn: ${(Q.o(t).find(([x])=>String(x)===String(val))||[])[1]||""}`:(Q.o(t).find(([x])=>String(x)===String(v))||[])[1]||String(v);
  t.log.push({q:Q.q(t),a:lb});Q.set(t,String(val));t.ans.add(k);t.said.delete(k);for(const x of Q.keys||[])t.guess.delete(x);if(t.reAsk===k)t.reAsk=null}
// Bỏ qua hết: mục còn lại lấy nút ★
function tcSkipAll(t){for(const Q of tcPend(t)){if(Q.need&&Q.need(t))return false;const s=Q.def?Q.def(t):Q.star?Q.star(t):null;if(s!=null)Q.set(t,String(s));t.ans.add(Q.k)}t.log.push({a:"Bỏ qua hết, app tự chọn"});return true}
// Hỏi lại một câu (bấm dòng trên thẻ tóm tắt): bỏ câu trả lời của nó và các câu phụ
const TC_DEP={fmt:["fmt","koN","sG","wG","cG","pK","sK","wK","cK","pF","sF","wF","cF","third"],gton:["gton","prize"],sG:["sG","wG","cG"],pK:["pK","sK","wK","cK"],pF:["pF","sF","wF","cF"],n:["n","koN"]};
function tcRe(t,k){const L=TC_DEP[k]||[k];for(const x of L){t.ans.delete(x);const Q=TC_Q.find(q=>q.k===x);for(const y of (Q&&Q.keys)||[])t.said.delete(y)}if(k==="fmt"){t.cust=new Set();t.capAsk=null}t.reAsk=k}
// Gõ chữ: các mục vừa đổi coi như đã trả lời câu tương ứng
function tcTyped(t,keys){for(const Q of TC_Q)if((Q.keys||[]).some(k=>keys.includes(k))){t.ans.add(Q.k);if(t.reAsk===Q.k)t.reAsk=null}if(keys.includes("target"))tcSet(t,"G",{to:+t.target})}

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
  R.push(["Ai đăng ký",t.guests?"Mọi người":"Thành viên CLB","guests"]);
  R.push(["Ngày",t.date!=null?`${tnDow(at)} ${tnDm(at)}`:"—","date"],["Giờ",`${t.time||"—"}${t.fmt==="xoay"?(t.end?`–${t.end}`:""):E?` · dự kiến xong ~${tcHm(E.end)}`:""}`,"time"]);
  if(t.fmt!=="xoay")R.push(["Xong trước",t.endBy||"Không cố định","endBy"]);
  R.push(["Sân",`${t.courts||"—"} sân${t.place?` · ${esc(t.place)}`:""}`,"courts"]);
  if(t.fmt==="xoay")R.push(["Cách thu",{phi:"Lệ phí cố định",deu:"Chia đều tiền sân",keo:"Ai thua góp"}[t.thu]||"—","thu"]);
  if(!t.nds&&!(t.fmt==="xoay"&&(t.thu==="keo"||t.thu==="deu")))R.push(["Lệ phí",t.fee==null||t.fee===""?"—":+t.fee?`${fmtK(+t.fee)}/người`:"Miễn phí","fee"]);
  R.push(["Chuyển khoản",{off:"Không, trả tại sân",opt:"Tuỳ chọn",req:"Bắt buộc mới giữ chỗ"}[t.pay]||"—","pay"]);
  R.push(["Giải thưởng",t.gton==null?"—":!t.gton?"Không":(t.gt||"hang")==="hang"?[t.h1&&`Nhất ${tnK(+t.h1)}`,t.h2&&`Nhì ${tnK(+t.h2)}`,t.h3&&`Ba ${tnK(+t.h3)}`].filter(Boolean).join(" · ")||"—":t.gt==="trich"?`Trích ${t.gtv}% lệ phí`:t.gt==="gop"?`Mỗi người góp ${fmtK(+t.gtv||0)}`:`CLB bỏ ra ${fmtK(+t.gtv||0)}`,"gton"]);
  return R}
function tcSum(t){const E=tnEst(t);
  let h=`<div class="tcsum"><button class="tcrow" data-act="tned" data-v="name"><span>Tên giải</span><b>${esc(tnName(t))}</b><i>›</i></button>`
    +tcRows(t).map(([l,v,k])=>`<button class="tcrow" data-act="${k==="nds"?"tngrp":"tcre"}" data-v="${k==="nds"?"nguoi":k}"><span>${l}</span><b>${v}</b><i>›</i></button>`).join("")+`</div>`;
  if(E&&E.late){h+=`<div class="tnbad"><b>⚠ Không kịp · dự kiến xong ${tcHm(E.end)}</b><small>${E.m} trận trên ${t.courts} sân cần khoảng ${dur(E.mins)}, giải phải xong trước ${t.endBy}</small></div>`;
    const fx=[],tryE=p=>{const x=tnEst({...t,...p});return x?x.end:0};
    if(tcRu(t,"G").to>7)fx.push(["t7",`Vòng bảng chạm 7 thay vì ${tcRu(t,"G").to}`,tryE({rG:{...tcRu(t,"G"),to:7,cap:0,w2:false},target:7})]);
    fx.push(["c2",`Thêm 2 sân (${(t.courts||1)+2} sân)`,tryE({courts:(t.courts||1)+2})]);
    if(!t.nds&&t.pairs>4)fx.push(["half",`Giảm còn ${Math.max(4,Math.round(t.pairs/2))} cặp`,tryE({pairs:Math.max(4,Math.round(t.pairs/2)),koN:Math.max(1,Math.round((t.koN||2)/2))})]);
    fx.push(["noend","Bỏ giờ phải xong",0]);
    h+=`<div class="tnfix"><span class="cap">Chạm một cách để sửa</span>${fx.map(([k,l,e])=>`<button data-act="tnfix" data-v="${k}"><b>${l}</b><span>${e?`xong ${tcHm(e)}${E.by&&e<=E.by?" ✓":""}`:""} ›</span></button>`).join("")}</div>`}
  return h}
function tcPage(D){const t=tn,P=tcPend(t),cur=P[0],req=tcReq(t).length;
  mxDr({t:"Tạo nhanh",back:"tnback",sub:t.from?"Như giải lần trước":"Trò chuyện với AI tạo giải"});
  let h="";
  h+=`<div class="tcchat">`;
  if(t.from)h+=tcBot(`Mình lấy lại cài đặt của <b>${esc(t.fromName||"")}</b>, ngày chuyển sang tuần gần nhất.`);
  else{h+=tcMe(esc(t.txt));const s=tcSeen(t);h+=s?tcBot("Mình đã hiểu:",s):tcBot("Mình chưa đọc được nhiều từ câu này, mình hỏi từng mục nhé.")}
  if(cur&&!t.log.length&&!t.from)h+=tcBot(`Còn vài câu nữa cho giải chạy trơn tru.${req?"":" Câu nào bỏ qua thì app chọn theo cách phổ biến."}`);
  for(const x of t.log){if(x.q)h+=tcBot(`<b>${esc(x.q)}</b>`);if(x.a)h+=tcMe(esc(x.a));if(x.b)h+=tcBot(x.b)}
  if(cur){const st=cur.star?cur.star(t):null,nt=cur.note?cur.note(t):"",canDef=cur.def||st!=null;
    h+=tcBot(`<b>${esc(cur.q(t))}</b>`,nt?`<small>${esc(nt)}</small>`:"");
    h+=`<div class="tcq">${cur.o(t).map(([v,l])=>`<button class="tcbtn${String(v)===String(st)?" star":""}" data-act="tca" data-k="${cur.k}" data-v="${esc(String(v))}">${esc(l)}${String(v)===String(st)?" ★":""}</button>`).join("")}${canDef&&!(cur.need&&cur.need(t)&&!cur.def&&st==null)?`<button class="lnk tcdef" data-act="tca" data-k="${cur.k}" data-v="__def">Để app chọn</button>`:""}${req?"":`<button class="lnk tcdef" data-act="tcskip">Bỏ qua các câu còn lại</button>`}</div>`}
  else{h+=tcBot("Xong rồi! Bạn kiểm tra lại nhé. Bấm dòng nào thì mình hỏi lại câu đó.",tcSum(t));
    const E=tnEst(t);h+=`<div class="tcq end">${E&&E.late?`<button class="btn-line" data-act="tnmk" data-v="late">Tạo giải dù không kịp</button>`:`<button class="ball go" data-act="tnmk">✓ Tạo giải</button>`}</div>`}
  if(errs.xf)h+=`<p class="err">${esc(errs.xf)}</p>`;
  h+=`</div><div class="hqcta tcbar"><div class="tnsay"><input id="tn-say" data-draft="tn-say" maxlength="200" placeholder="Hoặc gõ câu trả lời, yêu cầu khác…" value="${esc(val("tn-say",""))}"><button class="ball go" data-act="tnsay" aria-label="Gửi"${tnBusy?" disabled":""}>${tnBusy?"…":"Gửi"}</button></div></div>`;
  return h+tnEdSheet()}
// Cuộn xuống cuối khung chat sau khi trả lời
const tcDown=()=>{try{requestAnimationFrame(()=>{try{scrollTo({top:document.body.scrollHeight})}catch(e){}})}catch(e){}};
async function tcAct(act,b){if(!tn||!tn.ans)return false;
  if(act==="tca"){tcAnswer(tn,b.dataset.k,b.dataset.v);render();tcDown();return true}
  if(act==="tcskip"){tcSkipAll(tn);render();tcDown();return true}
  if(act==="tcre"){tcRe(tn,b.dataset.v);render();tcDown();return true}
  return false}
