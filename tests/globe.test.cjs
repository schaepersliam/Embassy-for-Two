const test=require('node:test'),assert=require('node:assert/strict'),M=require('../globe-math.js');
const near=(a,b,eps=1e-9)=>a.every((v,i)=>Math.abs(v-b[i])<eps);
test('geographic centers and their pins align with the satellite projection',()=>{
 for(const [lng,lat] of [[149.13,-35.28],[174.77,-41.28],[7.44,46.94],[0,90],[180,-90],[-179.9,80]]){const p=M.rotate(M.vector(lng,lat),M.matrix(M.center(lng,lat)));assert.ok(near(p,[0,0,1]));}
});
test('trackball rotations keep the grabbed surface point under the pointer',()=>{
 for(const [a,b] of [[[0,0],[.3,.6]],[[.2,-.2],[-.7,.5]],[[1,0],[-1,0]],[[0,.95],[0,-.95]]]){const first=M.ball(...a),last=M.ball(...b),q=M.between(first,last);assert.ok(near(M.rotate(first,M.matrix(q)),last));}
});
test('repeated pole and seam rotations stay finite, unit length, and reversible',()=>{
 let q=M.center(179,89);for(let i=0;i<10000;i++){q=M.normalize(M.multiply(M.axis(i%2,1-i%2,0,.017),q));assert.ok(q.every(Number.isFinite));}assert.ok(Math.abs(Math.hypot(...q)-1)<1e-12);const p=M.vector(-179,-80),out=M.rotate(p,M.matrix(q)),inverse=M.matrix([q[0],-q[1],-q[2],-q[3]]);assert.ok(near(M.rotate(out,inverse),p));
});
