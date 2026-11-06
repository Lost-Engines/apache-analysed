// Shared with the TFX analysis viewer. All edits here are local to Apache.
/* Ear clipping preserves concave model outlines instead of filling a fan
   across their notches. Project onto the polygon's dominant normal plane. */
function stripTriangles(vertices,points,axes,epsilon){
 const edges=vertices.map((a,i)=>({a,b:vertices[(i+1)%vertices.length],p:points[i],q:points[(i+1)%vertices.length]}));
 const levels=points.map(p=>p[1]);
 // Split at crossings too: paired even-odd edges must not change order
 // inside a strip. A few authored bridge faces are crossed quadrilaterals.
 for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
  const a=edges[i],b=edges[j],u=a.q.map((v,k)=>v-a.p[k]),v=b.q.map((x,k)=>x-b.p[k]),w=b.p.map((x,k)=>x-a.p[k]);
  const determinant=u[0]*v[1]-u[1]*v[0];if(Math.abs(determinant)<=epsilon)continue;
  const t=(w[0]*v[1]-w[1]*v[0])/determinant,s=(w[0]*u[1]-w[1]*u[0])/determinant;
  if(t>0&&t<1&&s>0&&s<1)levels.push(a.p[1]+t*u[1]);
 }
 const sorted=[...new Set(levels)].sort((a,b)=>a-b),result=[];
 const at=(edge,y)=>{const t=(y-edge.p[1])/(edge.q[1]-edge.p[1]);return edge.a.map((v,k)=>v+t*(edge.b[k]-v));};
 const area=([a,b,c])=>(b[axes[0]]-a[axes[0]])*(c[axes[1]]-a[axes[1]])-(b[axes[1]]-a[axes[1]])*(c[axes[0]]-a[axes[0]]);
 for(let i=0;i<sorted.length-1;i++){
  const low=sorted[i],high=sorted[i+1],middle=(low+high)/2;
  const crossing=edges.filter(e=>Math.min(e.p[1],e.q[1])<middle&&Math.max(e.p[1],e.q[1])>middle).sort((a,b)=>at(a,middle)[axes[0]]-at(b,middle)[axes[0]]);
  for(let j=0;j+1<crossing.length;j+=2){
   const quad=[at(crossing[j],low),at(crossing[j+1],low),at(crossing[j+1],high),at(crossing[j],high)];
   for(const triangle of [[quad[0],quad[1],quad[2]],[quad[0],quad[2],quad[3]]])if(Math.abs(area(triangle))>epsilon)result.push(triangle);
  }
 }
 return result;
}
function triangulate(vertices){
 if(vertices.length<3)return[];
 if(vertices.length===3)return[[...vertices]];
 const normal=[0,0,0];
 for(let i=0;i<vertices.length;i++){
  const a=vertices[i],b=vertices[(i+1)%vertices.length];
  normal[0]+=(a[1]-b[1])*(a[2]+b[2]);normal[1]+=(a[2]-b[2])*(a[0]+b[0]);normal[2]+=(a[0]-b[0])*(a[1]+b[1]);
 }
 const spans=[0,1,2].map(a=>Math.max(...vertices.map(v=>v[a]))-Math.min(...vertices.map(v=>v[a])));
 const drop=normal.some(v=>v!==0)?normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))):spans.indexOf(Math.min(...spans)),axes=[0,1,2].filter(a=>a!==drop);
 const projected=vertices.map(v=>axes.map(a=>v[a]));
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const span=Math.max(...axes.map(a=>Math.max(...vertices.map(v=>v[a]))-Math.min(...vertices.map(v=>v[a]))));
 const epsilon=Math.max(1e-14,span*span*1e-10),indices=[];
 for(let i=0;i<vertices.length;i++){
  const previous=indices.at(-1);
  if(previous===undefined||projected[i].some((v,a)=>v!==projected[previous][a]))indices.push(i);
 }
 if(indices.length>1&&projected[indices[0]].every((v,a)=>v===projected[indices.at(-1)][a]))indices.pop();
 let area=0;
 for(let i=0;i<indices.length;i++){const a=projected[indices[i]],b=projected[indices[(i+1)%indices.length]];area+=a[0]*b[1]-b[0]*a[1];}
 if(Math.abs(area)<epsilon)return stripTriangles(vertices,projected,axes,epsilon);
 const direction=Math.sign(area),triangles=[];
 while(indices.length>3){
  let clipped=false;
  for(let i=0;i<indices.length;i++){
   const a=indices[(i+indices.length-1)%indices.length],b=indices[i],c=indices[(i+1)%indices.length];
   const turn=cross(projected[a],projected[b],projected[c])*direction;
   if(Math.abs(turn)<=epsilon){indices.splice(i,1);clipped=true;break;}
   if(turn<0)continue;
   const occupied=indices.some(p=>p!==a&&p!==b&&p!==c&&cross(projected[a],projected[b],projected[p])*direction>=-epsilon&&cross(projected[b],projected[c],projected[p])*direction>=-epsilon&&cross(projected[c],projected[a],projected[p])*direction>=-epsilon);
   if(occupied)continue;
   triangles.push([vertices[a],vertices[b],vertices[c]]);indices.splice(i,1);clipped=true;break;
  }
  // Preserve the native even-odd fill of non-simple outlines.
  if(!clipped)return stripTriangles(vertices,projected,axes,epsilon);
 }
 if(indices.length===3)triangles.push(indices.map(i=>vertices[i]));
 return triangles;
}
// A shared plane equation gives coplanar faces exactly the same fragment
// depth, independent of triangulation or winding. Normalise by the largest
// component and discard arithmetic noise far below the native vertex spacing.
function plane([a,b,c]){
 const u=b.slice(0,3).map((v,i)=>v-a[i]),v=c.slice(0,3).map((v,i)=>v-a[i]);
 const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 const major=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),scale=normal[major];
 if(!scale)return[0,0,0,0];
 const n=normal.map(v=>v/scale),offset=-n.reduce((sum,v,i)=>sum+v*a[i],0);
 return [...n,offset].map(v=>Math.round(v*1e9)/1e9);
}
export {triangulate,plane};
