(function(root){
'use strict';
const normalize=q=>{const n=Math.hypot(...q);return q.map(v=>v/n);};
const multiply=(a,b)=>[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
const axis=(x,y,z,angle)=>[Math.cos(angle/2),x*Math.sin(angle/2),y*Math.sin(angle/2),z*Math.sin(angle/2)];
const matrix=q=>{const[w,x,y,z]=q;return[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)];};
const rotate=(v,m)=>[m[0]*v[0]+m[1]*v[1]+m[2]*v[2],m[3]*v[0]+m[4]*v[1]+m[5]*v[2],m[6]*v[0]+m[7]*v[1]+m[8]*v[2]];
const vector=(lng,lat)=>{const a=lat*Math.PI/180,b=lng*Math.PI/180;return[Math.cos(a)*Math.sin(b),Math.sin(a),Math.cos(a)*Math.cos(b)];};
const center=(lng,lat)=>multiply(axis(1,0,0,lat*Math.PI/180),axis(0,1,0,-lng*Math.PI/180));
const ball=(x,y)=>{const r=x*x+y*y;if(r<=1)return[x,y,Math.sqrt(1-r)];const n=Math.sqrt(r);return[x/n,y/n,0];};
const between=(a,b)=>{const dot=a.reduce((s,n,i)=>s+n*b[i],0);if(dot<-.999999){const axisVector=Math.abs(a[0])<.9?[1,0,0]:[0,1,0];const cross=[a[1]*axisVector[2]-a[2]*axisVector[1],a[2]*axisVector[0]-a[0]*axisVector[2],a[0]*axisVector[1]-a[1]*axisVector[0]];return normalize([0,...cross]);}return normalize([1+dot,a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]);};
const api={normalize,multiply,axis,matrix,rotate,vector,center,ball,between};root.GlobeMath=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
