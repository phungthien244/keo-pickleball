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
  if(k==="gout"||k==="gdel"){const D=derive(),p=(cfg().giai?.pairs||[]).find(z=>z.id===id);return p?[p.a,p.b].map(i=>D.pmap.get(i)?.name||"?").join(" & "):""}
  if(k==="cancel"){const m=(S.matches||[]).find(z=>z.id===id);return m?"Sân "+cName(m.court):""}
}catch(e){}return ""}
// [tiêu đề, lời nhắc, chữ nút xác nhận, kiểu nút: d = nguy hiểm, p = xác nhận thường]
function cfmInfo(key){
  const i=key.indexOf(":"),k=i<0?key:key.slice(0,i),id=i<0?"":key.slice(i+1),n=cfmName(k,id),q=n?" "+n:"";
  const T={
    pdel:[`Xoá người chơi${q}?`,"Xoá khỏi danh sách thành viên. Trận cũ vẫn giữ nhưng tên hiện “(đã xóa)”.","Xoá","d"],
    del:[`Xoá người chơi${q}?`,"Xoá khỏi danh sách thành viên. Trận cũ vẫn giữ nhưng tên hiện “(đã xóa)”.","Xoá","d"],
    phdel:[`Xoá ảnh${q?" của"+q:""}?`,"Ảnh sẽ mất, muốn có lại phải tải lên lại.","Xoá ảnh","d"],
    clogodel:["Xoá ảnh CLB?","Logo CLB sẽ về chữ cái đầu tên.","Xoá ảnh","d"],
    mephotodel:["Xoá ảnh đại diện?","Ảnh của bạn sẽ mất, muốn có lại phải tải lên lại.","Xoá ảnh","d"],
    mdel:["Xoá trận này?","Trận vào thùng rác, vẫn hoàn tác được trong buổi.","Xoá trận","d"],
    cancel:[`Hủy trận${q}?`,"Bốn người quay lại hàng chờ. Có thể hoàn tác nếu nhầm.","Hủy trận","d"],
    sdel:[`Xoá buổi #${id}?`,"Toàn bộ trận và tiền của buổi chuyển vào mục đã xoá. Chủ CLB khôi phục được.","Xoá buổi","d"],
    srestore:[`Khôi phục buổi #${id}?`,"Buổi và các trận sẽ quay lại Lịch sử.","Khôi phục","p"],
    undoone:["Khôi phục trận này?","Trận quay lại như trước khi hủy/xoá.","Khôi phục","p"],
    undoall:["Khôi phục tất cả?","Mọi trận đã hủy/xoá trong buổi sẽ được đưa lại.","Khôi phục hết","p"],
    chot:["Chốt buổi?","Tiền và xếp hạng sẽ ghi vào sổ quỹ. Kiểm tra tỉ số các sân trước khi chốt.","Chốt buổi","p"],
    rrapply:["Áp dụng lịch vòng tròn?","Danh sách trận định sẵn hiện tại sẽ được thay bằng lịch mới.","Áp dụng","p"],
    leddel:["Xoá dòng sổ quỹ?","Số dư quỹ sẽ tính lại. Không hoàn tác được.","Xoá dòng","d"],
    unzalo:[`Bỏ ghép Zalo${q?" của"+q:""}?`,"Người này không vào hồ sơ bằng Zalo được nữa cho tới khi ghép lại.","Bỏ ghép","d"],
    lnkno:["Từ chối yêu cầu?","Người gửi sẽ phải gửi lại nếu muốn kết nối.","Từ chối","d"],
    lnkok:["Đồng ý kết nối?","Tài khoản Zalo này sẽ được ghép với hồ sơ thành viên đã chọn. Kiểm tra đúng người.","Đồng ý","p"],
    lnkcancel:["Hủy yêu cầu kết nối?","Ban tổ chức sẽ không thấy yêu cầu này nữa.","Hủy yêu cầu","d"],
    regout:["Hủy đăng ký?","Bạn sẽ mất chỗ trong danh sách. Đã đóng tiền thì báo ban tổ chức để hoàn.","Hủy đăng ký","d"],
    regdel:[`Bỏ${q||" người này"} khỏi danh sách?`,"Nhớ báo cho người đó. Nếu đã đóng tiền, xử lý hoàn tiền trước.","Bỏ khỏi danh sách","d"],
    regatt:["Điểm danh theo đăng ký?","Người đã xác nhận đăng ký sẽ được điểm danh vào buổi hôm nay.","Điểm danh","p"],
    regpayok:[`Đã nhận tiền${q?" của"+q:""}?`,"Chỉ xác nhận khi đã thấy tiền về tài khoản hoặc đã nhận tiền mặt.","Đã nhận","p"],
    regpayundo:[`Bỏ xác nhận tiền${q?" của"+q:""}?`,"Người này quay lại trạng thái chưa đóng.","Bỏ xác nhận","d"],
    regrefund:[`Ghi nhận hoàn tiền${q?" cho"+q:""}?`,"Chỉ bấm sau khi đã chuyển trả tiền.","Đã hoàn","p"],
    mxleave:["Rời câu lạc bộ?","Thông tin của bạn trong CLB sẽ bị xoá. Muốn quay lại phải xin vào lại.","Rời CLB","d"],
    mrm:["Gỡ khỏi ban tổ chức?","Người này mất quyền quản lý CLB ngay.","Gỡ","d"],
    edclear:["Thu hồi tất cả PIN?","Mọi máy đang vào bằng PIN mất quyền ghi, cần nhập lại PIN.","Thu hồi","d"],
    migrate:["Chuyển dữ liệu?","Chỉ làm một lần. Đừng tắt app trong lúc chuyển.","Bắt đầu chuyển","p"],
    gout:[`${n||"Cặp này"} bỏ giải?`,"Trận chưa đánh tính thắng cho đối thủ, không cộng hiệu số.","Bỏ giải","d"],
    gdel:[`Bỏ cặp ${n||"này"}?`,"Cặp bị xoá khỏi danh sách giải.","Bỏ cặp","d"],
    gend:["Kết thúc giải?","Trận chưa đánh không tính, xếp hạng theo kết quả hiện có rồi lưu giải.","Kết thúc","d"],
    gcancel:["Hủy lịch thi đấu?","Lịch trận bị xoá, quay lại bước ghép cặp. Các cặp vẫn giữ.","Hủy lịch","d"],
    gstart:["Tạo lịch giải?","Sau khi tạo lịch, muốn thêm/bỏ cặp phải hủy lịch làm lại.","Tạo lịch","p"],
    gpredel:["Bỏ trận định sẵn?","Trận này sẽ không được xếp theo thứ tự đã định.","Bỏ","d"],
    predel:["Bỏ trận định sẵn?","Trận này sẽ không được xếp theo thứ tự đã định.","Bỏ","d"],
    start:["Bắt đầu buổi?","Đăng ký online sẽ đóng. Người đã đăng ký được điểm danh tự động.","Bắt đầu","p"],
    xcancel:[`Hủy buổi${q}?`,"Nhớ báo người đã đăng ký. Ai đã đóng tiền cần được hoàn.","Hủy buổi","d"],
    xdel:[`Xoá buổi${q}?`,"Buổi và danh sách đăng ký bị xoá hẳn, không hoàn tác được.","Xoá buổi","d"],
    xsoff:["Tắt lịch lặp lại?","Buổi mới sẽ không tự tạo nữa. Các buổi đã tạo vẫn giữ.","Tắt","d"],
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
