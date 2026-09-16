// Votação v2: cada jogador pode apontar tantos suspeitos quanto o número de impostores.
// Mantém voto único quando a partida tem apenas um impostor.
let selectedVotes=[];

const voteScreen=$('#vote');
const voteHelp=document.createElement('p');
voteHelp.id='voteHelp';
voteHelp.className='muted';
const confirmVote=document.createElement('button');
confirmVote.id='confirmVote';
confirmVote.className='btn';
confirmVote.textContent='Confirmar voto';
confirmVote.hidden=true;
voteScreen.append(voteHelp,confirmVote);

const resultHero=$('#result .hero');
const actualImpostors=document.createElement('div');
actualImpostors.id='actualImpostors';
actualImpostors.className='panel';
actualImpostors.hidden=true;
resultHero.after(actualImpostors);

function renderVoteSelection(){
  const needed=Math.min(S.imps,S.players.length-1);
  $('#voteList').querySelectorAll('button').forEach(b=>{
    const i=Number(b.dataset.playerIndex);
    b.classList.toggle('selected',selectedVotes.includes(i));
  });
  voteHelp.textContent=needed===1
    ? 'Escolha 1 jogador.'
    : `Escolha ${needed} jogadores que você acha que são os impostores. (${selectedVotes.length}/${needed})`;
  confirmVote.hidden=needed===1;
  confirmVote.disabled=selectedVotes.length!==needed;
}

$('#openVote').onclick=()=>{
  go('vote');
  selectedVotes=[];
  $('#voterName').textContent=S.players[S.voter];
  $('#voteList').innerHTML='';
  const needed=Math.min(S.imps,S.players.length-1);
  S.players.forEach((n,i)=>{
    if(i===S.voter)return;
    const b=document.createElement('button');
    b.textContent=n;
    b.dataset.playerIndex=i;
    b.onclick=()=>{
      if(needed===1){
        selectedVotes=[i];
        submitVotes();
        return;
      }
      if(selectedVotes.includes(i)) selectedVotes=selectedVotes.filter(v=>v!==i);
      else if(selectedVotes.length<needed) selectedVotes.push(i);
      renderVoteSelection();
    };
    $('#voteList').append(b);
  });
  renderVoteSelection();
};

confirmVote.onclick=()=>{
  const needed=Math.min(S.imps,S.players.length-1);
  if(selectedVotes.length===needed)submitVotes();
};

function submitVotes(){
  S.votes.push(...selectedVotes);
  S.voter++;
  selectedVotes=[];
  if(S.voter<S.players.length)go('votePass');
  else finishVote();
}

function topSuspects(counts,amount){
  const candidates=counts.map((votes,index)=>({index,votes}));
  // Em empates, embaralha primeiro e depois ordena por votos.
  return shuffle(candidates).sort((a,b)=>b.votes-a.votes).slice(0,amount).map(x=>x.index);
}

function showActualImpostors(){
  const names=S.roles.filter(r=>r.imp).map(r=>r.name);
  actualImpostors.hidden=false;
  actualImpostors.innerHTML=`<b>😈 ${names.length===1?'O impostor era':'Os impostores eram'}</b><p>${names.length?names.join(' • '):'Nenhum impostor nesta rodada.'}</p>`;
}

function finishVote(){
  const realImpostors=S.roles.map((r,i)=>r.imp?i:-1).filter(i=>i>=0);
  const amount=realImpostors.length?Math.min(S.imps,S.players.length-1):Math.min(S.imps,S.players.length-1);
  const counts=S.players.map((_,i)=>S.votes.filter(v=>v===i).length);
  const accused=topSuspects(counts,amount);
  const allCaught=realImpostors.length>0&&realImpostors.every(i=>accused.includes(i));
  const noImpostor=realImpostors.length===0;

  go('result');
  $('#accused').textContent=accused.map(i=>S.players[i]).join(' • ');
  $('#resultIcon').textContent=noImpostor?'🎲':allCaught?'😈':'😇';
  $('#lastChance').hidden=true;
  actualImpostors.hidden=true;

  if(noImpostor){
    $('#verdict').className='verdict win';
    $('#verdict').textContent='NÃO HAVIA IMPOSTOR!';
    S.civ++;
    showActualImpostors();
    renderScore();
    return;
  }

  if(S.imps>1){
    $('#verdict').className='verdict '+(allCaught?'win':'lose');
    $('#verdict').textContent=allCaught?'🎉 TODOS OS IMPOSTORES FORAM DESCOBERTOS!':'😈 PELO MENOS UM IMPOSTOR ESCAPOU!';
    if(allCaught)S.civ++;else S.imp++;
    showActualImpostors();
    renderScore();
    return;
  }

  const caught=allCaught;
  $('#verdict').className='verdict '+(caught?'win':'lose');
  $('#verdict').textContent=caught?'ERA O IMPOSTOR!':'NÃO ERA O IMPOSTOR!';
  if(caught){
    $('#lastChance').hidden=false;
  }else{
    S.imp++;
    showActualImpostors();
    renderScore();
  }
}

// No voto único, revela o impostor também depois da tentativa final.
const originalGuessHandler=$('#guessBtn').onclick;
$('#guessBtn').onclick=()=>{
  originalGuessHandler();
  showActualImpostors();
};

// Reinicia a área de resultado entre rodadas.
const originalNewRound=$('#newRound').onclick;
$('#newRound').onclick=()=>{
  actualImpostors.hidden=true;
  originalNewRound();
};

const votingStyle=document.createElement('style');
votingStyle.textContent=`
.vote-list button.selected{border-color:var(--yellow);background:#3b3029;box-shadow:inset 0 0 0 1px var(--yellow)}
#actualImpostors{text-align:center;margin-top:12px}
#actualImpostors p{margin-bottom:0;font-size:18px}
`;
document.head.append(votingStyle);