(function(){
'use strict';
var KEY='harti-mentale-v1';
var $=function(s){return document.querySelector(s)};
var blocks=[],items=[],cur=-1,st={read:{},last:0,onlyRed:false};
try{var s=JSON.parse(localStorage.getItem(KEY)||'null');if(s)st=Object.assign(st,s)}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function short(t){
  t=t.replace(/^HARTA MENTALĂ\s*—\s*/i,'').replace(/^Hartă mentală:\s*/i,'').replace(/^REGULAMENT \(Ordinul 5\.726\/2024\),\s*/,'Regulamentul-cadru: ');
  t=t.replace(/[A-ZĂÂÎȘȚ]{2,}/g,function(w){return /^[IVX]+$/.test(w)?w:w.toLowerCase()});
  [['anexele','Anexele'],['tony bush','Tony Bush'],['john hattie','John Hattie']].forEach(function(p){t=t.split(p[0]).join(p[1])});
  return t.charAt(0).toUpperCase()+t.slice(1)}
function build(){
  var inSchema=false,part='';
  blocks.forEach(function(b){
    if(b.t==='h1'){
      var x=b.x;
      if(/^SCHEMA UNICĂ/.test(x)){inSchema=true;items.push({title:'Schema unică „De ținut minte”',group:'Obligatoriu',blocks:[]});return}
      if(inSchema){items[items.length-1].blocks.push({t:'h2',x:x});return}
      if(/^PARTEA \d/.test(x)){part=x.replace(/\s*\(.*$/,'');return}
      items.push({title:short(x),group:part,blocks:[]});return}
    if(!items.length)return;
    items[items.length-1].blocks.push(b)});
  items.forEach(function(it,i){it.i=i;it.text=[];
    it.blocks.forEach(function(b){
      if(b.t==='tb')b.rows.forEach(function(r){r.forEach(function(c){c.forEach(function(p){it.text.push(p.map(function(q){return q[0]}).join(''))})})});
      else if(b.t==='p')it.text.push(b.r.map(function(q){return q[0]}).join(''));
      else it.text.push(b.x)})});
  // schema unică în față
  var sc=items.filter(function(i){return i.group==='Obligatoriu'});
  items=sc.concat(items.filter(function(i){return i.group!=='Obligatoriu'}));
  items.forEach(function(it,i){it.i=i});
}
function renderNav(){
  var nav=$('#nav');nav.textContent='';var g='';
  items.forEach(function(it){
    if(it.group!==g){g=it.group;nav.appendChild(el('h3','',g))}
    var b=el('button',it.i===cur?'on':'',it.title.length>90?it.title.slice(0,88)+'…':it.title);
    b.type='button';b.title=it.title;
    if(st.read[it.i])b.appendChild(el('span','tick','✓'));
    b.addEventListener('click',function(){show(it.i,true);$('#nav').classList.remove('open');$('#menu-btn').setAttribute('aria-expanded','false')});
    nav.appendChild(b)})}
function spans(parent,runs){
  runs.forEach(function(q){var s=el('span',(q[1]||'')+(q[2]?' k':''),q[0]);parent.appendChild(s)})}
function line(p){
  var d=el('div','line');spans(d,p);
  var vis=p.filter(function(q){return q[0].replace(/[–\s]/g,'')});
  if(vis.length&&vis.every(function(q){return q[1]==='b'}))d.classList.add('allblue');
  return d}
function table(b){
  var t=el('table'),rows=b.rows,nc=rows[0].length;
  if(nc===1)t.className='scheme';
  var hdr=nc>1&&rows[0].every(function(c){return c.length&&c.every(function(p){return p.every(function(q){return q[2]})})});
  rows.forEach(function(r,ri){
    var tr=el('tr');
    r.forEach(function(c,ci){
      var isH=hdr&&ri===0;var td=el(isH?'th':'td',(!isH&&nc===2&&ci===0&&!hdr)?'el':'');
      if(!isH&&nc===2&&ci===0&&hdr)td.className='el';
      c.forEach(function(p){td.appendChild(line(p))});
      tr.appendChild(td)});
    t.appendChild(tr)});
  return t}
function show(i,top){
  if(i<0||i>=items.length)return;cur=i;st.last=i;save();
  var it=items[i],m=$('#map');m.textContent='';m.hidden=false;$('#results').hidden=true;$('#status').hidden=true;
  var h=el('div','maphead');h.appendChild(el('h1','',it.title));
  var lg=el('p','legend');lg.appendChild(el('span','r','Roșu = principal / obligatoriu'));lg.appendChild(el('span','b','Albastru = detaliu, excepție, trimitere'));h.appendChild(lg);m.appendChild(h);
  var bar=el('div','bar');
  var red=el('button','btn','Numai roșu (esențialul)');red.type='button';red.setAttribute('aria-pressed',st.onlyRed);
  red.addEventListener('click',function(){st.onlyRed=!st.onlyRed;red.setAttribute('aria-pressed',st.onlyRed);m.classList.toggle('only-red',st.onlyRed);save()});
  var rd=el('button','btn',st.read[i]?'Marcat ca învățat ✓':'Marchează ca învățat');rd.type='button';
  rd.addEventListener('click',function(){if(st.read[i])delete st.read[i];else st.read[i]=1;save();rd.textContent=st.read[i]?'Marcat ca învățat ✓':'Marchează ca învățat';renderNav()});
  var pr=el('button','btn','Tipărește');pr.type='button';pr.addEventListener('click',function(){window.print()});
  bar.appendChild(red);bar.appendChild(rd);bar.appendChild(pr);m.appendChild(bar);
  m.classList.toggle('only-red',st.onlyRed);
  it.blocks.forEach(function(b){
    if(b.t==='h2')m.appendChild(el('h2','sec',b.x));
    else if(b.t==='p'){var p=el('p','note');spans(p,b.r);m.appendChild(p)}
    else if(b.t==='tb')m.appendChild(table(b))});
  var pg=el('div','pager');
  var a=el('button','btn','← Precedenta');a.type='button';a.disabled=i===0;a.addEventListener('click',function(){show(i-1,true)});
  var n=el('button','btn','Următoarea →');n.type='button';n.disabled=i===items.length-1;n.addEventListener('click',function(){show(i+1,true)});
  pg.appendChild(a);pg.appendChild(n);m.appendChild(pg);
  renderNav();if(top)window.scrollTo({top:0})}
function norm(s){return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
function search(q){
  var box=$('#results');q=q.trim();
  if(q.length<2){box.hidden=true;if(cur>=0)$('#map').hidden=false;return}
  var nq=norm(q),out=[];
  items.forEach(function(it){it.text.forEach(function(t){if(norm(t).indexOf(nq)>=0&&out.length<80)out.push([it,t])})});
  box.textContent='';box.hidden=false;$('#map').hidden=true;$('#status').hidden=true;
  box.appendChild(el('h2','',out.length+(out.length>=80?'+':'')+' rezultate pentru „'+q+'”'));
  out.forEach(function(r){
    var b=el('button');b.type='button';b.appendChild(el('small','',r[0].title.slice(0,100)));
    var t=r[1],k=norm(t).indexOf(nq),s=Math.max(0,k-60),e=Math.min(t.length,k+q.length+120);
    b.appendChild(document.createTextNode((s?'…':'')+t.slice(s,k)));var m=el('mark','',t.slice(k,k+q.length));b.appendChild(m);
    b.appendChild(document.createTextNode(t.slice(k+q.length,e)+(e<t.length?'…':'')));
    b.addEventListener('click',function(){$('#q').value='';show(r[0].i,true)});box.appendChild(b)})}
$('#menu-btn').addEventListener('click',function(){var o=$('#nav').classList.toggle('open');this.setAttribute('aria-expanded',o)});
$('#q').addEventListener('input',function(){search(this.value)});
fetch('data/harti.json').then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){
  blocks=d;build();renderNav();
  var start=Math.min(Math.max(0,st.last|0),items.length-1);
  $('#status').hidden=true;show(start,false)
}).catch(function(){$('#status').textContent='Hărțile nu au putut fi încărcate. Reîncarcă pagina.'});
})();
