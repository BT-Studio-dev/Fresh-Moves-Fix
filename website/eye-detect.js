// Best-effort pixel analysis. Arbitrary skins are not labelled; return null rather than guess wildly.
(function(root){
 function detect(d){
  if(!d || d.length!==64*64*4)return null;
  const pixel=(x,y)=>{const i=(y*64+x)*4;return [d[i],d[i+1],d[i+2],d[i+3]];};
  const dist=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2]);
  const lum=a=>a[0]*.299+a[1]*.587+a[2]*.114;
  const avg=ps=>[0,1,2].map(k=>Math.round(ps.reduce((s,p)=>s+p[k],0)/ps.length)).concat(255);
  const hex=c=>'#'+c.slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');
  const skin=avg([pixel(8,10),pixel(15,10),pixel(11,9),pixel(12,9)]);
  const candidates=[];
  for(let row=3;row<=6;row++){
   const p=[1,2,5,6].map(x=>pixel(8+x,8+row));if(p.some(x=>x[3]<200))continue;
   const [wl,pl,pr,wr]=p;
   if(dist(wl,wr)>100 || dist(pl,pr)>130 || dist(wl,skin)<75 || dist(wr,skin)<75 || dist(wl,pl)<55 || dist(wr,pr)<55 || lum(wl)<lum(pl)+15 || lum(wr)<lum(pr)+15)continue;
   const score=dist(wl,skin)+dist(wr,skin)+dist(wl,pl)+dist(wr,pr)-dist(wl,wr)-dist(pl,pr);
   candidates.push({row,score,white:hex(avg([wl,wr])),pupil:hex(avg([pl,pr]))});
  }
  if(!candidates.length)return null;
  candidates.sort((a,b)=>b.score-a.score);const best=candidates[0];
  const neighbour=candidates.find(c=>c.row===best.row+1 || c.row===best.row-1);
  let type='2x1', row=best.row;
  if(neighbour && neighbour.score>best.score*.68){type='2x2';row=Math.min(best.row,neighbour.row);}
  const positions=type==='2x2'?{2:'top',3:'upper',4:'lower',5:'bottom'}:{3:'top',4:'upper',5:'lower',6:'bottom'};
  if(!positions[row])return null;
  const rows=type==='2x2'?[row,row+1]:[row];let brow=null,browColour=null;
  const br=row-1;if(br>=2 && br<=5){const p=[1,2,5,6].map(x=>pixel(8+x,8+br));if(p.every(x=>x[3]>200 && dist(x,skin)>85 && lum(x)<lum(skin)-18) && dist(p[0],p[3])<100 && dist(p[1],p[2])<100){brow='f'+br;browColour=hex(avg(p));}}
  return {type,pos:positions[row],cells:rows.flatMap(r=>[1,2,5,6].map(c=>[c,r])),lid:hex(skin),white:best.white,pupil:best.pupil,brow,browColour};
 }
 if(typeof module==='object' && module.exports)module.exports=detect;else root.FMFEyeDetect=detect;
})(typeof window==='undefined'?globalThis:window);
