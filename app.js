const socket = io();
const $ = id => document.getElementById(id);
let code = "ADM";
let role = null;

function show(id){["home","player","screen"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden");}

$("join").onclick = () => {
  const name = $("name").value.trim() || "Jogador";
  code = $("code").value.trim().toUpperCase() || "ADM";
  role = "player";
  socket.emit("joinRoom",{code,name,role});
};

$("display").onclick = () => {
  const c = $("code").value.trim().toUpperCase() || "ADM";
  window.location.href = `/index.html?display=1&room=${encodeURIComponent(c)}`;
};

document.querySelectorAll(".color").forEach(btn => {
  btn.onclick = () => socket.emit("pressColor",{code,color:btn.dataset.color});
});

$("start").onclick = () => socket.emit("startGame",{code});

socket.on("roomJoined", data => {
  code = data.code;
  $("roomBadge").textContent = `Sala: ${code}`;
  if(data.role === "display"){
    role="display"; show("screen");
    const url = `${location.origin}/?room=${encodeURIComponent(code)}`;
    $("qr").innerHTML="";
    new QRCode($("qr"),{text:url,width:120,height:120});
  } else {
    show("player");
    $("status").textContent="Aguardando a próxima sequência...";
  }
});

socket.on("leaderboard", list => {
  if(role !== "display") return;
  if(!list.length){$("rankingList").textContent="Aguardando jogadores...";return;}
  $("rankingList").innerHTML=list.map(p =>
    `<div class="rankRow ${p.rank<=3?"top":""}">
      <span>${p.rank}º ${escapeHtml(p.name)}</span>
      <b>${p.score} pts</b>
    </div>`).join("");
});

socket.on("gameReset",()=>{
  if(role==="display"){
    $("sequence").textContent="Preparando...";
    $("screenStatus").textContent="Novo jogo";
  }
});

socket.on("showSequence", seq => {
  if(role==="display"){
    $("screenStatus").textContent=`Nível ${seq.length} — memorize!`;
    $("sequence").textContent=seq.map(c=>({red:"🔴",green:"🟢",blue:"🔵",yellow:"🟡"}[c])).join(" ");
    setTimeout(()=>socket.emit("sequenceShown",{code}), Math.max(900,seq.length*500));
  } else {
    $("status").textContent=`Memorize a sequência de ${seq.length} cores!`;
  }
});

socket.on("acceptingInput",()=>{
  if(role==="display"){
    $("screenStatus").textContent="VALENDO!";
    $("sequence").textContent="📱";
  } else $("status").textContent="Sua vez! Repita a sequência.";
});

socket.on("correctStep",()=>{
  if(role==="player") $("status").textContent="✅ Certo! Continue...";
});

socket.on("correct",data=>{
  if(role==="display"){
    $("screenStatus").textContent=`✅ ${data.name} completou o nível ${data.level}!`;
    $("sequence").textContent="🎉";
  }
});

socket.on("wrong",data=>{
  if(role==="display"){
    $("screenStatus").textContent=`❌ ${data.name} errou!`;
    $("sequence").textContent="🔄";
  } else if(data.playerId===socket.id){
    $("status").textContent="❌ Errou! Sua pontuação voltou a 0.";
  }
});

function escapeHtml(s){
  return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

// Auto-join by QR link: ?room=ADM
const params=new URLSearchParams(location.search);
if(params.get("display")==="1"){
  code=params.get("room")||"ADM";
  role="display";
  socket.emit("joinRoom",{code,role:"display"});
} else if(params.get("room")){
  $("code").value=params.get("room");
}
