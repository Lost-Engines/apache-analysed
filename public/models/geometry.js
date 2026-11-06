export const identity=()=>[1,0,0,0,1,0,0,0,1];
export const apply=(a,p)=>[a[0]*p[0]+a[1]*p[1]+a[2]*p[2],a[3]*p[0]+a[4]*p[1]+a[5]*p[2],a[6]*p[0]+a[7]*p[1]+a[8]*p[2]];
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const mul=(a,b)=>Array.from({length:9},(_,i)=>[0,1,2].reduce((s,k)=>s+a[Math.floor(i/3)*3+k]*b[k*3+i%3],0));
export function bounds(models,root,parts=true){let points=[];function visit(id,m,t,chain){if(chain.includes(id))return;const o=models.get(id);if(!o)return;points.push(...o.vertices.map(p=>add(apply(m,p),t)));if(parts)for(const c of o.children)if(c.model)visit(c.model,mul(m,c.matrix.map(x=>x/2147483647)),add(apply(m,c.translation),t),[...chain,id]);}visit(root,identity(),[0,0,0],[]);if(!points.length)return {centre:[0,0,0],radius:1000};const lo=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));return {centre:lo.map((v,i)=>(v+hi[i])/2),radius:Math.max(1,Math.hypot(...hi.map((v,i)=>v-lo[i]))/2)};}
export function geometry(models,root,options){const faces=[],lines=[],points=[],notes=new Set();let visited=0;const {project,flags=0,parts=true,cull=true}=options;
 function visit(id,m,t,chain,instance){const flags=instance?.flags??options.flags??0;if(chain.includes(id)){notes.add(`Cyclic submodel ${id}`);return;}const o=models.get(id);if(!o)return;visited++;const vertices=o.vertices.map(p=>add(apply(m,p),t)),normals=o.normals.map(p=>apply(m,p)),screen=vertices.map(project);let winding=0;
  function cyclic(indices){if(indices.length<3)return 0;const [a,b,c]=indices.map(i=>screen[i]);return (a[0]-b[0])*(b[1]-c[1])-(a[1]-b[1])*(b[0]-c[0]);}
  function walk(pc){let steps=0;while(true){if(++steps>100000)throw Error('Drawing program did not terminate');const n=o.program[pc];if(!n)throw Error(`Missing instruction ${id}:${pc}`);if(n.op===7)return;
   if(n.op===0||n.op===1&&(!cull||winding>=0)){const f=n.face;if(n.op===0&&![0,1,9,10].includes(f.type))winding=cyclic(f.indices);if(!cull||n.op===1||winding>=0||[0,1,9,10].includes(f.type)){const item={...f,vertices:f.indices.map(i=>vertices[i]),normals,model:id,offset:pc};if([0,9].includes(f.type))points.push(item);else if([1,10].includes(f.type))lines.push(item);else faces.push(item);}}
   else if(n.op===2){winding=cyclic(n.plane);for(const p of winding>=0?n.branches:[...n.branches].reverse())walk(p);}
   else if(n.op===3){if(flags&n.mask)walk(n.branches[0]);}
   else if(n.op===4)walk(n.branches[flags&n.mask?0:1]);
   else if(n.op===5){const value=(flags>>>n.shift)&n.mask;if(value<n.branches.length)walk(n.branches[value]);else notes.add(`Model ${id}: state ${value} has no authored branch`);}
   else if(n.op===6&&parts){const authored=o.children[n.child],child=instance?.children.find(c=>c.slot===n.child),c=child?{model:child.model,translation:child.relative.slice(0,3),matrix:child.relative.slice(3)}:authored;if(c?.model)visit(c.model,mul(m,c.matrix.map(x=>x/2147483647)),add(apply(m,c.translation),t),[...chain,id],child);else if(c)notes.add(`Slot ${n.child}: model supplied by gameplay`);else notes.add(`Slot ${n.child}: absent from this record`);}
   pc=n.next;}}
  if(o.offsets.faces)walk(o.offsets.faces);
 }visit(root,options.matrix??identity(),options.translation??[0,0,0],[],options.instance);return {faces,lines,points,notes:[...notes],visited};}
