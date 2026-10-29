
const KEY = "carepointHospitalDemo";

const defaultDoctors = [
  {id:"D001",name:"Dr. Ananya Rao",specialty:"General Physician",experience:8,fee:500},
  {id:"D002",name:"Dr. Kiran Kumar",specialty:"Cardiologist",experience:12,fee:900},
  {id:"D003",name:"Dr. Sneha Reddy",specialty:"Dermatologist",experience:6,fee:700}
];

let data = loadData();

function loadData(){
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if(d && Array.isArray(d.patients)){
      return {
        patients:d.patients,
        doctors:Array.isArray(d.doctors)?d.doctors:[...defaultDoctors],
        appointments:d.appointments||[],
        bills:d.bills||[]
      };
    }
  } catch(e){}
  return {patients:[],doctors:[...defaultDoctors],appointments:[],bills:[]};
}

function saveData(){
  localStorage.setItem(KEY,JSON.stringify(data));
  renderAll();
}

function safe(v=""){
  return String(v).replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function makeId(prefix,list){
  return prefix+Date.now().toString().slice(-6)+
    String(list.length+1).padStart(2,"0");
}

function money(n){
  return "₹"+Number(n||0).toLocaleString("en-IN");
}

function notify(msg){
  const el=document.getElementById("toast");
  el.textContent=msg;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2500);
}

// SCREEN NAVIGATION
function showScreen(id){
  const screen=document.getElementById(id);
  if(!screen)return;

  document.querySelectorAll(".screen").forEach(s=>{
    s.classList.toggle("active",s.id===id);
  });

  window.scrollTo({top:0,behavior:"smooth"});
  renderAll();
}

// Patient and doctor helpers
function patientName(id){
  return data.patients.find(p=>p.id===id)?.name||"Unknown";
}
function doctorName(id){
  return data.doctors.find(d=>d.id===id)?.name||"Doctor removed";
}
function statusHTML(status){
  return `<span class="status ${safe(status)}">${safe(status)}</span>`;
}

// Doctor directory
function renderDoctors(){
  document.getElementById("doctorList").innerHTML=
    data.doctors.map(d=>`
      <article class="doc-card">
        <div class="doc-icon">✚</div>
        <h3>${safe(d.name)}</h3>
        <p>${safe(d.specialty)}</p>
        <small>${Number(d.experience)} years experience</small>
        <hr>
        <b>${money(d.fee)}</b>
      </article>
    `).join("") || "<p>No doctors listed.</p>";

  document.getElementById("adminDoctorList").innerHTML=
    data.doctors.map(d=>`
      <div class="admin-doctor">
        <div><b>${safe(d.name)}</b>
          <small>${safe(d.specialty)} · ${money(d.fee)}</small>
        </div>
        <button class="remove-btn" data-remove="${safe(d.id)}">Remove</button>
      </div>
    `).join("") || "<p>No doctors.</p>";
}

// Dropdowns
function renderDropdowns(){
  const patients=data.patients.map(p=>
    `<option value="${safe(p.id)}">${safe(p.name)} (${safe(p.id)})</option>`
  ).join("");

  const doctors=data.doctors.map(d=>
    `<option value="${safe(d.id)}">${safe(d.name)} - ${safe(d.specialty)}</option>`
  ).join("");

  const patientSelect=document.getElementById("patientSelect");
  const doctorSelect=document.getElementById("doctorSelect");
  const billPatient=document.getElementById("billPatient");

  const oldP=patientSelect.value;
  const oldD=doctorSelect.value;
  const oldB=billPatient.value;

  patientSelect.innerHTML='<option value="">Select patient</option>'+patients;
  billPatient.innerHTML='<option value="">Select patient</option>'+patients;
  doctorSelect.innerHTML='<option value="">Select doctor</option>'+doctors;

  if(data.patients.some(p=>p.id===oldP))patientSelect.value=oldP;
  if(data.patients.some(p=>p.id===oldB))billPatient.value=oldB;
  if(data.doctors.some(d=>d.id===oldD))doctorSelect.value=oldD;
}

// Registration
document.getElementById("patientForm").addEventListener("submit",e=>{
  e.preventDefault();

  const f=new FormData(e.target);
  const phone=f.get("phone").trim();

  if(data.patients.some(p=>p.phone===phone)){
    document.getElementById("patientMsg").textContent=
      "This phone number is already registered.";
    return;
  }

  const patient={
    id:makeId("PT-",data.patients),
    name:f.get("name").trim(),
    age:Number(f.get("age")),
    gender:f.get("gender"),
    phone,
    email:f.get("email").trim(),
    address:f.get("address").trim(),
    created:new Date().toLocaleDateString("en-IN")
  };

  data.patients.push(patient);
  saveData();
  e.target.reset();

  notify("Patient registered!");
  showScreen("booking");
  document.getElementById("patientSelect").value=patient.id;
});

// Appointment request
document.getElementById("appointmentForm").addEventListener("submit",e=>{
  e.preventDefault();
  const f=new FormData(e.target);
  const date=f.get("date");

  const now=new Date();
  const today=new Date(now.getTime()-now.getTimezoneOffset()*60000)
    .toISOString().slice(0,10);

  if(date<today){
    document.getElementById("appointmentMsg").textContent=
      "Choose today or a future date.";
    return;
  }

  if(!data.patients.some(p=>p.id===f.get("patientId"))){
    document.getElementById("appointmentMsg").textContent=
      "Please register a patient first.";
    return;
  }

  if(!data.doctors.some(d=>d.id===f.get("doctorId"))){
    document.getElementById("appointmentMsg").textContent=
      "Please select a doctor.";
    return;
  }

  const appt={
    id:makeId("AP-",data.appointments),
    patientId:f.get("patientId"),
    doctorId:f.get("doctorId"),
    date,
    time:f.get("time"),
    reason:f.get("reason").trim(),
    status:"Pending"
  };

  data.appointments.push(appt);
  saveData();
  e.target.reset();

  document.getElementById("confirmMsg").textContent=
    "Request "+appt.id+" submitted for "+patientName(appt.patientId)+".";

  notify("Appointment requested!");
  showScreen("confirmation");
});

// Search patients
function renderPatients(){
  const q=(document.getElementById("searchPatient").value||"")
    .toLowerCase().trim();

  const list=data.patients.filter(p=>
    [p.id,p.name,p.phone,p.email].some(v=>
      String(v||"").toLowerCase().includes(q)
    )
  ).slice().reverse();

  document.getElementById("patientRows").innerHTML=
    list.length?list.map(p=>`
      <tr>
        <td>${safe(p.id)}</td>
        <td>${safe(p.name)}</td>
        <td>${safe(p.age)}</td>
        <td>${safe(p.phone)}</td>
        <td>${safe(p.email||"-")}</td>
      </tr>
    `).join("") :
    '<tr><td colspan="5">No matching patient records.</td></tr>';
}

// Appointments display
function renderAppointments(){
  const appts=data.appointments.slice().reverse();

  document.getElementById("userAppointmentRows").innerHTML=
    appts.length?appts.map(a=>`
      <tr>
        <td>${safe(patientName(a.patientId))}</td>
        <td>${safe(doctorName(a.doctorId))}</td>
        <td>${safe(a.date)}</td>
        <td>${safe(a.time)}</td>
        <td>${statusHTML(a.status)}</td>
      </tr>
    `).join("") :
    '<tr><td colspan="5">No appointments yet.</td></tr>';

  document.getElementById("adminAppointmentRows").innerHTML=
    appts.length?appts.map(a=>`
      <tr>
        <td>${safe(a.id)}</td>
        <td>${safe(patientName(a.patientId))}</td>
        <td>${safe(doctorName(a.doctorId))}</td>
        <td>${safe(a.date)}<br>${safe(a.time)}</td>
        <td>${safe(a.reason)}</td>
        <td>
          <select class="inline-select" data-status-id="${safe(a.id)}">
            ${["Pending","Approved","Completed","Cancelled"].map(s=>
              `<option ${a.status===s?"selected":""}>${s}</option>`
            ).join("")}
          </select>
        </td>
      </tr>
    `).join("") :
    '<tr><td colspan="6">No appointment requests.</td></tr>';
}

// Admin dashboard
function renderDashboard(){
  document.getElementById("countPatients").textContent=data.patients.length;
  document.getElementById("countAppointments").textContent=data.appointments.length;
  document.getElementById("countPending").textContent=
    data.appointments.filter(a=>a.status==="Pending").length;
  document.getElementById("countDoctors").textContent=data.doctors.length;
}

// Doctor addition
document.getElementById("doctorForm").addEventListener("submit",e=>{
  e.preventDefault();
  const f=new FormData(e.target);

  data.doctors.push({
    id:makeId("DR-",data.doctors),
    name:f.get("name").trim(),
    specialty:f.get("specialty").trim(),
    experience:Number(f.get("experience")),
    fee:Number(f.get("fee"))
  });

  saveData();
  e.target.reset();
  notify("Doctor added!");
});

// Remove doctor
document.getElementById("adminDoctorList").addEventListener("click",e=>{
  const id=e.target.dataset.remove;
  if(!id)return;
  if(!confirm("Remove this doctor? Existing appointments stay saved."))return;

  data.doctors=data.doctors.filter(d=>d.id!==id);
  saveData();
  notify("Doctor removed.");
});

// Admin updates appointment status
document.getElementById("adminAppointmentRows").addEventListener("change",e=>{
  const id=e.target.dataset.statusId;
  if(!id)return;

  const appt=data.appointments.find(a=>a.id===id);
  if(appt){
    appt.status=e.target.value;
    saveData();
    notify("Appointment status updated.");
  }
});

// BILL CALCULATOR
const billForm=document.getElementById("billForm");

function calculateTotal(){
  const f=new FormData(billForm);
  const consultation=Number(f.get("consultation")||0);
  const services=Number(f.get("services")||0);
  const medicines=Number(f.get("medicines")||0);
  const discount=Number(f.get("discount")||0);
  return consultation+services+medicines-discount;
}

function updateBillTotal(){
  document.getElementById("billTotal").textContent=money(calculateTotal());
}
billForm.addEventListener("input",updateBillTotal);

billForm.addEventListener("submit",e=>{
  e.preventDefault();
  const f=new FormData(billForm);
  const patientId=f.get("patientId");

  const consultation=Number(f.get("consultation"));
  const services=Number(f.get("services"));
  const medicines=Number(f.get("medicines"));
  const discount=Number(f.get("discount"));
  const subtotal=consultation+services+medicines;

  if(!data.patients.some(p=>p.id===patientId)){
    document.getElementById("billMsg").textContent=
      "Select a registered patient.";
    return;
  }

  if([consultation,services,medicines,discount].some(n=>
    !Number.isFinite(n)||n<0)||discount>subtotal){
    document.getElementById("billMsg").textContent=
      "Check amounts. Discount cannot exceed subtotal.";
    return;
  }

  const bill={
    id:makeId("BL-",data.bills),
    patientId,
    consultation,services,medicines,discount,
    total:subtotal-discount,
    date:new Date().toLocaleDateString("en-IN")
  };

  data.bills.push(bill);
  saveData();
  document.getElementById("billMsg").textContent=
    "Bill saved. Total: "+money(bill.total);
  notify("Bill saved!");
});

function renderBills(){
  document.getElementById("billRows").innerHTML=
    data.bills.length?data.bills.slice().reverse().map(b=>`
      <div class="bill-record">
        <span><b>${safe(b.id)}</b><br>
        ${safe(patientName(b.patientId))} · ${safe(b.date)}</span>
        <strong>${money(b.total)}</strong>
      </div>
    `).join(""):"<p>No billing records yet.</p>";
}

// EXPORT
function exportData(){
  const blob=new Blob([JSON.stringify(data,null,2)],
    {type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="carepoint-demo-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

// RESET
function resetData(){
  if(!confirm("Clear all demo patients, appointments and bills?"))return;
  data={patients:[],doctors:[...defaultDoctors],appointments:[],bills:[]};
  saveData();
  notify("Demo data reset.");
}

function renderAll(){
  renderDropdowns();
  renderDoctors();
  renderPatients();
  renderAppointments();
  renderDashboard();
  renderBills();
  updateBillTotal();
}

const dateNow=new Date();
const localToday=new Date(dateNow.getTime()-dateNow.getTimezoneOffset()*60000)
  .toISOString().slice(0,10);
document.getElementById("visitDate").min=localToday;

renderAll();
