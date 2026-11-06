import {decode,evaluate,matrices,multiply} from './animation.mjs';
const transform=(m,v)=>[0,1,2].map(r=>(m[r*3]*v[0]+m[r*3+1]*v[1]+m[r*3+2]*v[2])>>10);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const faces=[[0,1,5,4],[1,3,7,5],[3,2,6,7],[2,0,4,6],[0,2,3,1],[4,5,7,6]];
export class Figure{
 constructor(canvas,geometry){
  this.canvas=canvas;this.geometry=geometry;this.parts=new Map(geometry.parts.map(p=>[p.offset,p]));this.yaw=Math.PI+.55;this.elevation=.15;this.zoom=1;
  let previous;
  canvas.onpointerdown=e=>{previous=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(!previous)return;this.yaw+=(e.clientX-previous[0])*.01;this.elevation=Math.max(-1.3,Math.min(1.3,this.elevation+(e.clientY-previous[1])*.008));previous=[e.clientX,e.clientY];this.draw();};
  canvas.onpointerup=canvas.onpointercancel=()=>{previous=null;};
  canvas.onwheel=e=>{e.preventDefault();this.zoom=Math.max(.5,Math.min(3,this.zoom*Math.exp(-e.deltaY*.001)));this.draw();};
  new ResizeObserver(()=>this.draw()).observe(canvas);
 }
 show(row,time){this.row=row;this.time=time;this.draw();}
 draw(){
  const c=this.canvas,ratio=devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;if(!w||!h)return;
  if(c.width!==Math.round(w*ratio)||c.height!==Math.round(h*ratio)){c.width=Math.round(w*ratio);c.height=Math.round(h*ratio);}
  const ctx=c.getContext('2d');ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#101820';ctx.fillRect(0,0,w,h);
  if(!this.row)return;const d=decode(this.row);
  if(!d){ctx.fillStyle='#c1c9cc';ctx.font='15px sans-serif';ctx.textAlign='center';ctx.fillText('This newer pose format is not supported by MANEDIT 1.05.',w/2,h/2);return;}
  const state=evaluate(d,Math.floor(this.time)),pose=state.slice(3),rotation=matrices(pose),scale=Math.min(w/2600,h/2300)*this.zoom;
  const project=v=>{const x=v[0]*Math.cos(this.yaw)-v[1]*Math.sin(this.yaw),y=v[0]*Math.sin(this.yaw)+v[1]*Math.cos(this.yaw),z=v[2]-850;return [w/2+x*scale,h/2+(-y*Math.sin(this.elevation)-z*Math.cos(this.elevation))*scale,y*Math.cos(this.elevation)-z*Math.sin(this.elevation)];};
  ctx.strokeStyle='#26333c';ctx.lineWidth=1;
  for(let i=-2000;i<=2000;i+=500)for(const pair of [[[i,-2000,0],[i,2000,0]],[[-2000,i,0],[2000,i,0]]]){const [a,b]=pair.map(project);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
  const polygons=[];
  const visit=(id,parentRotation,parentPosition)=>{
   const part=this.parts.get(id),joint=this.geometry.joint_parts.indexOf(id),local=joint<0?part.pose.slice(0,9):rotation[joint];
   const world=multiply(parentRotation,local),position=add(parentPosition,transform(parentRotation,part.pose.slice(9)));
   const vertices=part.vertices.map(v=>project(add(position,transform(world,v))));
   for(const [index,face]of faces.entries()){const points=face.map(i=>vertices[i]);polygons.push({points,depth:points.reduce((s,p)=>s+p[2],0)/4,colour:part.name==='Held weapon'?`hsl(210 8% ${24+index*2}%)`:part.name==='Head'?`hsl(33 16% ${52+index*2}%)`:`hsl(92 12% ${33+index*3}%)`});}
   if(part.child!==null)visit(part.child,world,position);
  };
  for(const id of this.geometry.roots)visit(id,rotation[0],[0,0,pose[1]]);
  polygons.sort((a,b)=>b.depth-a.depth);
  for(const p of polygons){ctx.beginPath();p.points.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();ctx.fillStyle=p.colour;ctx.fill();ctx.strokeStyle='#162019';ctx.lineWidth=.35;ctx.stroke();}
  this.last={time:state[0],frame:state[1],parts:this.parts.size,polygons:polygons.length};
 }
}
