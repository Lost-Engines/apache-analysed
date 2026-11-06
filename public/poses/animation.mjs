export const joints=['Body','Right upper arm','Right forearm','Right thigh','Right shin','Right foot','Left upper arm','Left forearm','Left thigh','Left shin','Left foot','Held weapon'];
export function decode(r){
 if(['II','IC'].includes(r.signature))return null;
 const roots=r.signature[0]==='H'?3:2,n='GH'.includes(r.signature[0])?12:11,components=roots===3?3:Number(r.header[4]);
 return {count:r.frame_count,duration:Number(r.header[2]),type:r.signature.at(-1),frames:r.frames.map(f=>{
  const p=[f[0]*1048>>10,f[1]*1048>>10,roots===3?f[2]:0,...Array(24).fill(0)];
  for(let j=0;j<n;j++){p[3+j]=f[roots+j*(components-1)];if(components===3)p[15+j]=f[roots+j*2+1];}return p;
 })};
}
export function evaluate(d,elapsed){
 let t,current,next,pose;
 if(d.type==='I'&&elapsed>=d.duration){t=d.duration;current=d.count-1;next=0;pose=d.frames[current].slice();}
 else if(d.type==='I'&&elapsed===0){t=0;current=0;next=1;pose=d.frames[0].slice();}
 else{
  const intervals=d.count-(d.type==='I'?1:0);t=elapsed%d.duration;current=Math.floor(t*intervals/d.duration);next=(current+1)%d.count;
  const scale=Math.floor(d.duration/intervals);let a=Math.floor(next*d.duration/intervals)-t,b=t-Math.floor(current*d.duration/intervals);
  if(a<0)a+=d.duration;if(b<0)b+=d.duration;pose=d.frames[current].map((v,i)=>Math.trunc((v*a+d.frames[next][i]*b)/scale));
 }
 pose[0]=0;for(let i=2;i<27;i++)pose[i]=Math.trunc((pose[i]<<10)*3.1416/32768)|0;
 return [t,current,next,...pose];
}
export function multiply(a,b){return Array.from({length:9},(_,i)=>{const row=Math.floor(i/3),col=i%3;return (a[row*3]*b[col]+a[row*3+1]*b[col+3]+a[row*3+2]*b[col+6])>>10;});}
function axis(angle,i){const c=Math.trunc(Math.cos(angle/1024)*1024),s=Math.trunc(Math.sin(angle/1024)*1024);return i===0?[1024,0,0,0,c,-s,0,s,c]:i===1?[c,0,s,0,1024,0,-s,0,c]:[c,-s,0,s,c,0,0,0,1024];}
export function matrices(p){return joints.map((_,i)=>i===0?multiply(axis(p[3],0),multiply(axis(p[15],1),axis(p[2],2))):multiply(axis(p[3+i],0),axis(p[15+i],[5,10,11].includes(i)?2:1)));}
export function channelLabels(r){
 if(!decode(r))return r.frames[0].map((_,i)=>`Channel ${i}`);
 const roots=r.signature[0]==='H'?3:2,n='GH'.includes(r.signature[0])?12:11,components=roots===3?3:Number(r.header[4]);const labels=['Stored root offset (not drawn)','Body height'];if(roots===3)labels.push('Body yaw');
 for(let j=0;j<n;j++){labels.push(`${joints[j]} · X rotation`);if(components===3)labels.push(`${joints[j]} · ${[5,10,11].includes(j)?'Z':'Y'} rotation`);}return labels;
}
