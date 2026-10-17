(function(){
'use strict';
var SRC=[
 {k:'legea198',n:'Legea nr. 198/2023',c:5},
 {k:'rofuip',n:'ROFUIP',c:5},
 {k:'bush',n:'Tony Bush',c:4},
 {k:'hattie',n:'John Hattie',c:2},
 {k:'profil',n:'Profilul managerului școlar',c:2},
 {k:'crcnr',n:'Cadrul de referință al curriculumului',c:2}
];
var KEY='concurs-simulare-v1',DUR=3600;
var $=function(s){return document.querySelector(s)};
var st={hist:[],seen:[]};
try{var s=JSON.parse(localStorage.getItem(KEY)||'null');if(s)st=Object.assign(st,s)}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
var banks={},test=[],ans=[],cur=0,left=DUR,tick=null,finished=false;
function pick(bank,n){
  var seen=st.seen,fresh=bank.filter(function(q){return seen.indexOf(q.id)<0});
  if(fresh.length<n*3)fresh=bank;
  var byCh={};shuffle(fresh).forEach(function(q){(byCh[q.chapter]=byCh[q.chapter]||[]).push(q)});
  var keys=shuffle(Object.keys(byCh)),out=[],i=0;
  while(out.length<n&&keys.some(function(k){return byCh[k].length})){
    var k=keys[i%keys.length];if(byCh[k].length)out.push(byCh[k].pop());i++}
  return out}
function show(id){['start','test','result'].forEach(function(x){$('#'+x).hidden=x!==id});$('#status').hidden=true;window.scrollTo(0,0)}
function renderStart(){
  var d=$('#dist');d.textContent='';
  SRC.forEach(function(s){var sp=el('span');sp.appendChild(el('strong','',String(s.c)));sp.appendChild(document.createTextNode(' '+s.n+' ('+banks[s.k].length+' itemi în bancă)'));d.appendChild(sp)});
  var h=$('#history');h.textContent='';
  if(st.hist.length){h.hidden=false;h.appendChild(el('strong','','Rezultatele tale recente'));
    st.hist.slice(-8).reverse().forEach(function(r){var row=el('div');row.appendChild(el('span','',r.d));row.appendChild(el('span','',r.s+'/20'));h.appendChild(row)})}
  show('start')}
function start(){
  test=[];SRC.forEach(function(s){pick(banks[s.k],s.c).forEach(function(q){q._src=s.n;test.push(q)})});
  test=shuffle(test);ans=test.map(function(){return null});cur=0;left=DUR;finished=false;
  st.seen=st.seen.concat(test.map(function(q){return q.id})).slice(-200);save();
  var nav=$('#nav');nav.textContent='';
  test.forEach(function(q,i){var b=el('button','',String(i+1));b.type='button';b.addEventListener('click',function(){go(i)});nav.appendChild(b)});
  show('test');go(0);clearInterval(tick);tick=setInterval(function(){left--;paintTimer();if(left<=0)finish(true)},1000);paintTimer()}
function paintTimer(){var m=Math.floor(left/60),s=left%60,t=$('#timer');t.textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s;t.classList.toggle('low',left<=300)}
function go(i){
  cur=i;var q=test[i];
  $('#count').textContent='Întrebarea '+(i+1)+' din '+test.length+' · '+ans.filter(function(a){return a!=null}).length+' răspunsuri';
  var m=$('#meta');m.textContent='';m.appendChild(el('span','',q._src));
  $('#prompt').textContent=q.prompt;
  var o=$('#opts');o.textContent='';
  q.options.forEach(function(op,k){
    var b=el('button','sim-opt');b.type='button';b.setAttribute('role','radio');b.setAttribute('aria-checked',String(ans[i]===op.id));
    b.appendChild(el('b','',op.id));b.appendChild(el('span','',op.text));
    b.addEventListener('click',function(){ans[i]=op.id;go(i)});o.appendChild(b)});
  $('#prev').disabled=i===0;$('#next').disabled=i===test.length-1;
  Array.prototype.forEach.call($('#nav').children,function(b,k){b.classList.toggle('cur',k===i);b.classList.toggle('done',ans[k]!=null)})}
function finish(auto){
  if(finished)return;
  var un=ans.filter(function(a){return a==null}).length;
  if(!auto&&un&&!window.confirm('Mai ai '+un+' întrebări fără răspuns. Predai lucrarea?'))return;
  finished=true;clearInterval(tick);
  var ok=0,by={};
  test.forEach(function(q,i){var c=ans[i]===q.correctOptionId;if(c)ok++;var b=by[q._src]=by[q._src]||{o:0,t:0};b.t++;if(c)b.o++});
  st.hist.push({d:new Date().toLocaleString('ro-RO'),s:ok});st.hist=st.hist.slice(-30);save();
  $('#score').textContent=ok+' / 20 răspunsuri corecte';
  $('#msg').textContent='În această simulare fiecare item valorează 0,5 puncte: '+(ok/2).toLocaleString('ro-RO')+' din 10 (orientativ). '+(auto?'Timpul a expirat.':'Lucrarea a fost predată.');
  var bs=$('#bysrc');bs.textContent='';
  Object.keys(by).forEach(function(k){var d=el('div');d.appendChild(el('span','',k));d.appendChild(el('strong','',by[k].o+' / '+by[k].t));bs.appendChild(d)});
  var rv=$('#review');rv.textContent='';
  test.forEach(function(q,i){
    var good=ans[i]===q.correctOptionId,c=el('article','rv '+(good?'ok':'no'));
    c.appendChild(el('small','',(i+1)+'. '+q._src+' · '+q.chapter));
    c.appendChild(el('h3','',q.prompt));
    q.options.forEach(function(op){
      var cls='o'+(op.id===q.correctOptionId?' c':(op.id===ans[i]?' u':''));
      var d=el('div',cls);d.appendChild(el('strong','',op.id+') '));d.appendChild(document.createTextNode(op.text));
      if(op.id===ans[i]&&!good)d.appendChild(el('em','',' — răspunsul tău'+(op.why?': '+op.why:'')));
      c.appendChild(d)});
    if(ans[i]==null)c.appendChild(el('div','o u','Fără răspuns.'));
    c.appendChild(el('div','ex',q.explanation));rv.appendChild(c)});
  show('result')}
$('#go').addEventListener('click',start);
$('#again').addEventListener('click',renderStart);
$('#finish').addEventListener('click',function(){finish(false)});
$('#prev').addEventListener('click',function(){go(cur-1)});
$('#next').addEventListener('click',function(){go(cur+1)});
Promise.all(SRC.map(function(s){return fetch('../../'+s.k+'/data/questions.json').then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){banks[s.k]=d.questions})}))
.then(function(){
  var low=SRC.filter(function(s){return banks[s.k].length<s.c});
  if(low.length){$('#status').textContent='Băncile pentru '+low.map(function(s){return s.n}).join(', ')+' sunt prea mici.';return}
  renderStart()
}).catch(function(){$('#status').textContent='Băncile de itemi nu au putut fi încărcate. Reîncarcă pagina.'});
})();
