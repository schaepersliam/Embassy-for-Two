(function(root){
'use strict';
// An orthographic globe with local Natural Earth outlines. No map service needed.
root.PassportGlobe=function(canvas,cities,onCity){
 const ctx=canvas.getContext('2d'),dpr=Math.min(2,root.devicePixelRatio||1);let lon=cities[0]?.lng||0,lat=cities[0]?.lat||20,drag=null,moved=false,pins=[];
 function project(x,y){const r=Math.PI/180,a=y*r,b=(x-lon)*r,t=lat*r;return[Math.cos(a)*Math.sin(b),-(Math.cos(t)*Math.sin(a)-Math.sin(t)*Math.cos(a)*Math.cos(b)),Math.sin(t)*Math.sin(a)+Math.cos(t)*Math.cos(a)*Math.cos(b)];}
 function draw(){
  const w=Math.max(280,canvas.getBoundingClientRect().width),h=w*.85;canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);const cx=w/2,cy=h/2,R=Math.min(w,h)*.44;
  const ocean=ctx.createRadialGradient(cx-R*.3,cy-R*.35,R*.1,cx,cy,R);ocean.addColorStop(0,'#edf2e9');ocean.addColorStop(1,'#bccfc0');ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fillStyle=ocean;ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.clip();
  function path(points,fill=false){let started=false;ctx.beginPath();for(const [x,y] of points){const p=project(x,y);if(p[2]>=0){if(started)ctx.lineTo(cx+p[0]*R,cy+p[1]*R);else{ctx.moveTo(cx+p[0]*R,cy+p[1]*R);started=true;}}else if(started){if(fill)ctx.closePath();started=false;}}if(fill){ctx.closePath();ctx.fill();}else ctx.stroke();}
  ctx.strokeStyle='#a9bdac';ctx.lineWidth=.55;
  for(let x=-180;x<180;x+=30)path(Array.from({length:181},(_,i)=>[x,i-90]));
  for(let y=-60;y<=60;y+=30)path(Array.from({length:361},(_,i)=>[i-180,y]));
  ctx.fillStyle='#6f8968';for(const ring of root.GlobeLand||[])path(ring,true);
  ctx.restore();ctx.strokeStyle='#a0b49e';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();
  pins=[];for(const city of cities){const p=project(city.lng,city.lat);if(p[2]<.02)continue;const x=cx+p[0]*R,y=cy+p[1]*R;pins.push({x,y,city});ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fillStyle='#b47b48';ctx.fill();ctx.strokeStyle='#fffdf6';ctx.lineWidth=2;ctx.stroke();ctx.font='12px sans-serif';ctx.fillStyle='#233d31';ctx.fillText(city.city,x+10,y+4);}
 }
 canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,lon,lat};moved=false;canvas.setPointerCapture(e.pointerId);};
 canvas.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)moved=true;lon=drag.lon-dx*.4;lat=Math.max(-80,Math.min(80,drag.lat+dy*.35));draw();};
 canvas.onpointerup=e=>{if(!drag)return;drag=null;if(moved)return;const box=canvas.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top;const hit=pins.map(p=>({...p,d:Math.hypot(p.x-x,p.y-y)})).sort((a,b)=>a.d-b.d)[0];if(hit&&hit.d<22)onCity(hit.city.id);};
 canvas.onpointercancel=()=>drag=null;
 canvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();lon+=e.key==='ArrowLeft'?-12:e.key==='ArrowRight'?12:0;lat=Math.max(-80,Math.min(80,lat+(e.key==='ArrowUp'?10:e.key==='ArrowDown'?-10:0)));draw();};
 const observer=new ResizeObserver(draw);observer.observe(canvas);draw();return()=>observer.disconnect();
};
})(window);
