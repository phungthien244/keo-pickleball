// Hộp thoại xác nhận cho mọi thao tác hủy / xoá / bỏ / xác nhận, tránh bấm nhầm
let onAct=null,LASTDS=null;
const CFM={k:"",ds:null,ok:""};
function armOr(k){
  if(CFM.ok===k){CFM.ok="";return true}
  if(CFM.k===k){cfmClose();return true}
  CFM.k=k;CFM.ds=LASTDS?{...LASTDS}:null;cfmDraw();return false}
function cfmClose(){if(!CFM.k)return;CFM.k="";CFM.ds=null;cfmDraw()}
async function cfmOk(){const k=CFM.k,ds=CFM.ds;cfmClose();if(!k||!ds||!onAct)return;CFM.ok=k;
  try{await onAct({target:{closest:s=>s==="[data-act]"?{dataset:ds,closest:()=>null}:null},preventDefault(){}})}finally{CFM.ok=""}}
function cfmName(k,id){try{
  if(k==="pdel"||k==="del"||k==="phdel"||k==="unzalo")return derive().pmap.get(id)?.name||"";
  if(k==="xcancel"||k==="xdel")return (S.sched||[]).find(z=>z.id===id)?.name||"";
  if(k==="regdel"||k==="regpayok"||k==="regpayundo"||k==="regrefund"){const x=(S.regs||[]).find(z=>z.id===id);return x?(x.name||derive().pmap.get(x.pid)?.name||""):""}
  if(k==="tvrole"){const [pid,v]=id.split("|");return (derive().pmap.get(pid)?.name||"")+" → "+(v?ROLE_LB[v]:"Người chơi")}
  if(k==="mfok"||k==="mfundo"){const [pid,key]=id.split("|");return (derive().pmap.get(pid)?.name||"")+" · "+mfLb(key)}
  if(/^ck/.test(k)){const x=(S.regs||[]).find(z=>z.id===id);return x?(x.pid?derive().pmap.get(x.pid)?.name||x.name:x.name)||"":""}
  if(k==="gout"||k==="gdel"){const D=derive(),p=(cfg().giai?.pairs||[]).find(z=>z.id===id);return p?[p.a,p.b].map(i=>D.pmap.get(i)?.name||"?").join(" & "):""}
  if(k==="cancel"){const m=(S.matches||[]).find(z=>z.id===id);return m?"Sân "+cName(m.court):""}
}catch(e){}return ""}
// Bắt đầu giải: tóm tắt có mặt, vắng (nhường chỗ), chưa trả tiền để BTC kiểm lại trước khi bấm
function startInfo(){
  const base=["Bắt đầu giải đấu?","Đăng ký online sẽ đóng. Người đã đăng ký được điểm danh tự động.","Bắt đầu","p"];
  try{const D=derive(),c=D.c,X=xCur(),n=D.players.filter(p=>p.active!==false).length,line=`${n} người có mặt · ${c.courts} sân · chạm ${c.target}`;
    if(!X)return [`Bắt đầu giải đấu #${D.sid}?`,line,"Bắt đầu","p"];
    const R=withX(X,()=>regList(D)),nm=r=>r.pid?(D.pmap.get(r.pid)?.name||r.name||"?"):(r.name||"?"),cut=L=>L.slice(0,6).map(nm).join(", ")+(L.length>6?` +${L.length-6}`:"");
    const abs=R.conf.filter(r=>!r.arrived),up=R.wait.filter(r=>r.arrived),due=R.all.filter(r=>r.arrived&&r.pay!=="ok"&&r.pay!=="sent"&&withX(X,()=>feeOf(r))>0);
    const m=[line];if(abs.length)m.push(`Vắng ${abs.length}: ${cut(abs)} · nhường chỗ`);if(up.length)m.push(`Vào thay ${up.length}: ${cut(up)}`);if(due.length)m.push(`Chưa trả tiền ${due.length}: ${cut(due)}`);
    m.push("Đăng ký online sẽ đóng.");return [`Bắt đầu ${xName(X)}?`,m.join("\n"),"Bắt đầu","p"]}catch(e){return base}
}
// [tiêu đề, lời nhắc, chữ nút xác nhận, kiểu nút: d = nguy hiểm, p = xác nhận thường]
function cfmInfo(key){
  const i=key.indexOf(":"),k=i<0?key:key.slice(0,i),id=i<0?"":key.slice(i+1),n=cfmName(k,id),q=n?" "+n:"";
  const T={
    pdel:[`Xoá người chơi${q}?`,"Xoá khỏi danh sách thành viên. Trận cũ vẫn giữ nhưng tên hiện “(đã xóa)”.","Xoá","d"],
    del:[`Xoá người chơi${q}?`,"Xoá khỏi danh sách thành viên. Trận cũ vẫn giữ nhưng tên hiện “(đã xóa)”.","Xoá","d"],
    phdel:[`Xoá ảnh${q?" của"+q:""}?`,"Ảnh sẽ mất, muốn có lại phải tải lên lại.","Xoá ảnh","d"],
    clogodel:["Xoá ảnh CLB?","Logo CLB sẽ về chữ cái đầu tên.","Xoá ảnh","d"],
    xpdel:["Xoá poster giải?","Khi chia sẻ sẽ dùng ảnh tự vẽ theo thông tin giải. Bấm Lưu để áp dụng.","Xoá poster","d"],
    gtcovdel:["Xoá ảnh bìa?","Trang giới thiệu CLB sẽ dùng nền mặc định.","Xoá ảnh","d"],
    mephotodel:["Xoá ảnh đại diện?","Ảnh của bạn sẽ mất, muốn có lại phải tải lên lại.","Xoá ảnh","d"],
    mdel:["Xoá trận này?","Trận vào thùng rác, vẫn hoàn tác được trong giải đấu.","Xoá trận","d"],
    cancel:[`Hủy trận${q}?`,"Bốn người quay lại hàng chờ. Có thể hoàn tác nếu nhầm.","Hủy trận","d"],
    sdel:[`Xoá giải đấu #${id}?`,"Toàn bộ trận và chi phí của giải đấu chuyển vào mục đã xoá. Chủ CLB khôi phục được.","Xoá giải đấu","d"],
    srestore:[`Khôi phục giải đấu #${id}?`,"Giải đấu và các trận sẽ quay lại Lịch sử.","Khôi phục","p"],
    undoone:["Khôi phục trận này?","Trận quay lại như trước khi hủy/xoá.","Khôi phục","p"],
    undoall:["Khôi phục tất cả?","Mọi trận đã hủy/xoá trong giải đấu sẽ được đưa lại.","Khôi phục hết","p"],
    chot:["Chốt giải đấu?","Chi phí và xếp hạng sẽ ghi vào sổ quỹ. Kiểm tra tỉ số các sân trước khi chốt.","Chốt giải đấu","p"],
    rrapply:["Áp dụng lịch vòng tròn?","Danh sách trận định sẵn hiện tại sẽ được thay bằng lịch mới.","Áp dụng","p"],
    leddel:["Xoá dòng sổ quỹ?","Số dư quỹ sẽ tính lại. Không hoàn tác được.","Xoá dòng","d"],
    unzalo:[`Bỏ ghép Zalo${q?" của"+q:""}?`,"Người này không vào hồ sơ bằng Zalo được nữa cho tới khi ghép lại.","Bỏ ghép","d"],
    lnkno:["Từ chối yêu cầu?","Người gửi sẽ phải gửi lại nếu muốn kết nối.","Từ chối","d"],
    lnkok:["Đồng ý kết nối?","Tài khoản Zalo này sẽ được ghép với hồ sơ thành viên đã chọn. Kiểm tra đúng người.","Đồng ý","p"],
    lnkcancel:["Hủy yêu cầu kết nối?","Ban tổ chức sẽ không thấy yêu cầu này nữa.","Hủy yêu cầu","d"],
    regout:["Hủy đăng ký?","Bạn sẽ mất chỗ trong danh sách. Đã đóng phí thì báo ban tổ chức để hoàn.","Hủy đăng ký","d"],
    regdel:[`Bỏ${q||" người này"} khỏi danh sách?`,"Nhớ báo cho người đó. Nếu đã đóng phí, xử lý hoàn phí trước.","Bỏ khỏi danh sách","d"],
    regatt:["Điểm danh theo đăng ký?","Người đã xác nhận đăng ký sẽ được điểm danh vào giải đấu hôm nay.","Điểm danh","p"],
    regpaid:["Bạn đã chuyển khoản xong?","Chỉ bấm khi tiền đã chuyển đi, đúng số tiền và nội dung. Ban tổ chức sẽ đối chiếu rồi xác nhận vé cho bạn.","Đã chuyển","p"],
    regsent:["Bạn đã chuyển khoản xong?","Chỉ bấm khi tiền đã chuyển đi. Ban tổ chức sẽ đối chiếu rồi xác nhận.","Đã chuyển","p"],
    regpayok:[`Đã nhận phí${q?" của"+q:""}?`,"Chỉ xác nhận khi đã thấy chi phí về tài khoản hoặc đã nhận tiền mặt.","Đã nhận","p"],
    regpayundo:[`Bỏ xác nhận phí${q?" của"+q:""}?`,"Người này quay lại trạng thái chưa đóng.","Bỏ xác nhận","d"],
    regrefund:[`Ghi nhận hoàn phí${q?" cho"+q:""}?`,"Chỉ bấm sau khi đã chuyển trả phí.","Đã hoàn","p"],
    mxleave:["Rời câu lạc bộ?","Thông tin của bạn trong CLB sẽ bị xoá. Muốn quay lại phải xin vào lại.","Rời CLB","d"],
    mrm:["Gỡ khỏi ban tổ chức?","Người này mất quyền quản lý CLB ngay.","Gỡ","d"],
    edclear:["Thu hồi tất cả PIN?","Mọi máy đang vào bằng PIN mất quyền ghi, cần nhập lại PIN.","Thu hồi","d"],
    migrate:["Chuyển dữ liệu?","Chỉ làm một lần. Đừng tắt app trong lúc chuyển.","Bắt đầu chuyển","p"],
    gout:[`${n||"Cặp này"} bỏ giải?`,"Trận chưa đánh tính thắng cho đối thủ, không cộng hiệu số.","Bỏ giải","d"],
    ckok:[`Xác nhận${q||" người này"} đã tới?`,"Đúng người như ảnh: vào danh sách có mặt, sẵn sàng thi đấu.","Đúng người","p"],
    cklater:[`Cho${q||" người này"} vào sân, trả sau?`,"Vẫn ghi CHƯA TRẢ lệ phí. Nhớ thu sau khi đánh.","Cho vào, trả sau","p"],
    ckno:[`Không phải${q}?`,"Bỏ lượt quét này. Người đó phải quét lại mã trên máy ban tổ chức.","Không phải","d"],
    ckcash:[`Đã nhận lệ phí${q}?`,"Chỉ bấm khi đã cầm tiền mặt hoặc đã thấy tiền vào tài khoản.","Đã nhận tiền","p"],
    ckunsent:[`Chưa thấy tiền${q}?`,"Đổi về CHƯA TRẢ, nhờ người chơi trả tại bàn.","Chưa thấy","d"],
    ckpaidok:[`Đã nhận tiền${q}?`,"Ghi nhận đã trả lệ phí và cho vào giải đấu.","Đã nhận · check-in","p"],
    ckman:[`Check-in tay${q}?`,"Dùng khi cần nhanh. Danh sách ghi ✋ TAY để phân biệt với tự quét mã.","Check-in tay","p"],
    ckundo:[`Hoàn tác check-in${q}?`,"Người này ra khỏi danh sách có mặt, trở về chưa tới.","Hoàn tác","d"],
    tvrole:[`Đổi quyền ${n}?`,"Quản lý sửa được mọi thứ trừ gỡ chủ CLB. Trọng tài chỉ nhập tỉ số sân được giao. Người chơi: không còn quyền quản lý.","Đổi quyền","p"],
    mfok:[`Đã thu phí ${n}?`,"Ghi nhận đã đóng phí thành viên kỳ này. Chỉ bấm khi đã nhận tiền.","Đã thu","p"],
    mfundo:[`Bỏ dấu đã thu ${n}?`,"Khoản phí này trở về chưa đóng.","Bỏ dấu","d"],
    mfoff:["Tắt phí thành viên cố định?","Không thu phí kỳ mới nữa. Dữ liệu các kỳ đã thu vẫn giữ trong quỹ.","Tắt","d"],
    mfper:["Đổi chu kỳ thu phí?","Kỳ đang theo dõi sẽ tính theo chu kỳ mới. Các khoản đã thu vẫn giữ trong quỹ.","Đổi chu kỳ","p"],
    kodraw:["Bốc chia bảng lại?","Các bảng hiện tại bị bỏ, bốc lại từ đầu. Lần bốc mới được ghi \"bốc lại\" để mọi người thấy.","Bốc lại","d"],
    gbredo:["Bốc lại các cặp?","Các cặp bốc thăm hiện tại bị bỏ, bốc lại từ đầu. Lần bốc mới được ghi \"bốc lại\" để mọi người thấy.","Bốc lại","d"],
    gdel:[`Bỏ cặp ${n||"này"}?`,"Cặp bị xoá khỏi danh sách giải.","Bỏ cặp","d"],
    gend:["Kết thúc giải?","Trận chưa đánh không tính, xếp hạng theo kết quả hiện có rồi lưu giải.","Kết thúc","d"],
    gcancel:["Hủy lịch thi đấu?","Lịch trận bị xoá, quay lại bước ghép cặp. Các cặp vẫn giữ.","Hủy lịch","d"],
    gstart:["Tạo lịch giải?","Sau khi tạo lịch, muốn thêm/bỏ cặp phải hủy lịch làm lại.","Tạo lịch","p"],
    gpredel:["Bỏ trận định sẵn?","Trận này sẽ không được xếp theo thứ tự đã định.","Bỏ","d"],
    predel:["Bỏ trận định sẵn?","Trận này sẽ không được xếp theo thứ tự đã định.","Bỏ","d"],
    start:startInfo(),
    xcancel:[`Hủy giải đấu${q}?`,"Nhớ báo người đã đăng ký. Ai đã đóng phí cần được hoàn.","Hủy giải đấu","d"],
    xdel:[`Xoá giải đấu${q}?`,"Giải đấu và danh sách đăng ký bị xoá hẳn, không hoàn tác được.","Xoá giải đấu","d"],
    xsoff:["Tắt lịch lặp lại?","Giải đấu mới sẽ không tự tạo nữa. Các giải đấu đã tạo vẫn giữ.","Tắt","d"],
    xpause:["Tạm dừng đăng ký?","Người chơi không đăng ký thêm được cho tới khi mở lại.","Tạm dừng","d"],
    mcreset:["Về lời MC tự tạo?","Lời MC bạn đã sửa sẽ mất.","Về mẫu","d"],
    logout:["Đăng xuất?","Máy này mất quyền quản lý cho tới khi đăng nhập lại.","Đăng xuất","d"],
    "qa-no":["Từ chối CLB này?","Chủ CLB sẽ thấy CLB bị từ chối.","Từ chối","d"],
    "qa-lock":["Khoá CLB này?","Thành viên sẽ không vào được CLB cho tới khi mở khoá.","Khoá","d"],
    "qa-codedel":["Xoá mã này?","Mã sẽ không dùng được nữa.","Xoá mã","d"]};
  return T[k]||["Xác nhận thao tác?","Kiểm tra lại trước khi tiếp tục.","Xác nhận","p"]}
function cfmDraw(){
  let el=$("#cfm");
  if(!el&&document.createElement&&document.body&&document.body.appendChild){el=document.createElement("div");el.id="cfm";document.body.appendChild(el)}
  if(!el)return;
  if(!CFM.k){el.innerHTML="";if(document.documentElement&&document.documentElement.classList)document.documentElement.classList.remove("cfmon");return}
  const [t,m,ok,tone]=cfmInfo(CFM.k);
  el.innerHTML=`<div class="cfmdim" data-act="cfmx"></div><div class="cfmbox ${tone==="d"?"d":"p"}" role="alertdialog" aria-modal="true" aria-labelledby="cfmt" aria-describedby="cfmm">
    <span class="cfmic" aria-hidden="true">${tone==="d"?"!":"?"}</span><h2 id="cfmt">${esc(t)}</h2><p id="cfmm">${esc(m)}</p>
    <div class="cfmbtn"><button class="line" data-act="cfmx" id="cfmback">Quay lại</button><button class="${tone==="d"?"danger":"primary"}" data-act="cfmok">${esc(ok)}</button></div></div>`;
  if(document.documentElement&&document.documentElement.classList)document.documentElement.classList.add("cfmon");
  setTimeout(()=>{try{const b=document.getElementById("cfmback");b&&b.focus&&b.focus()}catch(e){}},30)}
if(document.addEventListener)document.addEventListener("keydown",e=>{if(CFM.k&&e.key==="Escape")cfmClose()});
