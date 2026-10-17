(function(root){
'use strict';
let orientation=null,texturePromise=null;
function texture(){
 if(!texturePromise)texturePromise=new Promise(resolve=>{const image=new Image();image.onload=()=>{try{const c=document.createElement('canvas');c.width=2048;c.height=1024;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,c.width,c.height);resolve({pixels:ctx.getImageData(0,0,c.width,c.height).data,width:c.width,height:c.height});}catch{resolve(null);}};image.onerror=()=>resolve(null);image.src='assets/globe/blue-marble-august-2004.jpg';});
 return texturePromise;
}
root.PassportGlobe=function(canvas,cities,onCity){
 const M=root.GlobeMath,ctx=canvas.getContext('2d'),dpr=Math.min(2,root.devicePixelRatio||1),surface=document.createElement('canvas'),surfaceCtx=surface.getContext('2d');
 if(!orientation)orientation=M.center(cities[0]?.lng||0,cities[0]?.lat||20);
 let active=true,drag=null,moved=false,pins=[],frame=0,w=0,h=0,R=0,cx=0,cy=0,tex=null,imageData=null,samples=[];
 function resize(){const next=Math.max(260,canvas.getBoundingClientRect().width);if(Math.abs(w-next)<.5)return;w=next;h=w*.85;cx=w/2;cy=h/2;R=Math.min(w,h)*.44;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const size=Math.min(480,Math.round(2*R*dpr));surface.width=size;surface.height=size;imageData=surfaceCtx.createImageData(size,size);samples=[];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const vx=(x+.5-size/2)/(size/2),vy=-(y+.5-size/2)/(size/2),rr=vx*vx+vy*vy;if(rr<=1)samples.push([(y*size+x)*4,vx,vy,Math.sqrt(1-rr)]);}requestDraw();}
 function draw(){
  frame=0;if(!active||!w)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const mat=M.matrix(orientation);
  ctx.save();ctx.shadowColor='#91adc4';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fillStyle='#193d61';ctx.fill();ctx.restore();
  if(tex){const out=imageData.data,p=tex.pixels;for(const [i,x,y,z] of samples){const wx=mat[0]*x+mat[3]*y+mat[6]*z,wy=mat[1]*x+mat[4]*y+mat[7]*z,wz=mat[2]*x+mat[5]*y+mat[8]*z;const u=((Math.floor((Math.atan2(wx,wz)/(2*Math.PI)+.5)*tex.width)%tex.width)+tex.width)%tex.width,v=Math.max(0,Math.min(tex.height-1,Math.floor((.5-Math.asin(Math.max(-1,Math.min(1,wy)))/Math.PI)*tex.height))),j=(v*tex.width+u)*4,shade=.7+.3*z;out[i]=p[j]*shade;out[i+1]=p[j+1]*shade;out[i+2]=p[j+2]*shade;out[i+3]=255;}surfaceCtx.putImageData(imageData,0,0);ctx.drawImage(surface,cx-R,cy-R,2*R,2*R);}
  else{ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e1e8ec';ctx.fillText('Loading satellite view…',cx,cy);ctx.textAlign='left';}
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.strokeStyle='#9eafbd';ctx.lineWidth=1;ctx.stroke();pins=[];
  for(const city of cities){const p=M.rotate(M.vector(city.lng,city.lat),mat);if(p[2]<.03)continue;const x=cx+p[0]*R,y=cy-p[1]*R;pins.push({x,y,city});ctx.beginPath();ctx.arc(x,y,5.5,0,Math.PI*2);ctx.fillStyle='#e8b275';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fffdf6';ctx.stroke();ctx.font='12px sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#14293a';ctx.fillStyle='#fffdf6';const labelWidth=ctx.measureText(city.city).width,tx=x+10+labelWidth>w-4?x-10-labelWidth:x+10;ctx.strokeText(city.city,tx,y+4);ctx.fillText(city.city,tx,y+4);}
 }
 function requestDraw(){if(active&&!frame)frame=requestAnimationFrame(draw);}
 function point(e){const b=canvas.getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top};}
 canvas.onpointerdown=e=>{if(drag)return;const p=point(e);if(Math.hypot(p.x-cx,p.y-cy)>R+8)return;drag={id:e.pointerId,start:point(e),vector:M.ball((p.x-cx)/R,-(p.y-cy)/R),orientation:[...orientation]};moved=false;canvas.setPointerCapture(e.pointerId);};
 canvas.onpointermove=e=>{const p=point(e);if(!drag){canvas.style.cursor=pins.some(pin=>Math.hypot(p.x-pin.x,p.y-pin.y)<20)?'pointer':'grab';return;}if(e.pointerId!==drag.id)return;if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>5)moved=true;if(!moved)return;orientation=M.normalize(M.multiply(M.between(drag.vector,M.ball((p.x-cx)/R,-(p.y-cy)/R)),drag.orientation));requestDraw();};
 canvas.onpointerup=e=>{if(!drag||e.pointerId!==drag.id)return;const didMove=moved;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(didMove)return;const p=point(e),hit=pins.map(pin=>({...pin,d:Math.hypot(pin.x-p.x,pin.y-p.y)})).sort((a,b)=>a.d-b.d)[0];if(hit&&hit.d<20)onCity(hit.city.id);};
 canvas.onpointercancel=canvas.onlostpointercapture=()=>{drag=null;};
 canvas.onkeydown=e=>{if(e.key==='Home'){e.preventDefault();orientation=M.center(cities[0]?.lng||0,cities[0]?.lat||20);requestDraw();return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const yaw=e.key==='ArrowLeft'?-.16:e.key==='ArrowRight'?.16:0,pitch=e.key==='ArrowUp'?-.16:e.key==='ArrowDown'?.16:0;orientation=M.normalize(M.multiply(M.multiply(M.axis(1,0,0,pitch),M.axis(0,1,0,yaw)),orientation));requestDraw();};
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();texture().then(value=>{if(active){tex=value;requestDraw();}});
 return()=>{active=false;observer.disconnect();if(frame)cancelAnimationFrame(frame);canvas.onpointerdown=canvas.onpointermove=canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=canvas.onkeydown=null;};
};
})(window);
