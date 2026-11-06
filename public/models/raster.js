import {triangulate,plane} from '../shared/triangulate.js';
export class Raster {
 constructor(canvas, materials, textures) {
  this.canvas=canvas;this.materials=materials;
  const gl=this.gl=canvas.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:true});
  if(!gl)throw Error('WebGL 2 is unavailable');
  const vs=`#version 300 es
  in vec3 position;in vec4 colour;in vec4 alternate;in vec2 uv;in vec2 material;in vec4 depthPlane;
  uniform vec4 projection;uniform float pointSize;
  out vec4 c;out vec4 alt;out vec2 tex;out vec2 mat;flat out vec4 cameraPlane;
  void main(){float z=position.z;gl_Position=vec4(position.x*projection.x,position.y*projection.y,projection.z*z+projection.w,z);gl_PointSize=pointSize;c=colour;alt=alternate;tex=uv;mat=material;cameraPlane=depthPlane;}`;
  const fs=`#version 300 es
  precision highp float;
  in vec4 c;in vec4 alt;in vec2 tex;in vec2 mat;flat in vec4 cameraPlane;
  uniform vec4 projection;uniform vec2 viewport;uniform float depthOffset;
  uniform sampler2D atlas;uniform sampler2D palette;uniform sampler2D shades;out vec4 pixel;
  void main(){
   // Intersect the pixel ray with a shared plane, independent of each
   // polygon's triangulation. LEQUAL then honours authored coplanar order.
   float depth=gl_FragCoord.z;
   if(cameraPlane.w!=0.0){
    vec2 ray=(2.0*gl_FragCoord.xy/viewport-1.0)/projection.xy;
    float eyeDepth=-cameraPlane.w/dot(cameraPlane.xyz,vec3(ray,1.0));
    depth=0.5*(projection.z+projection.w/eyeDepth+1.0);
   }
   // Preserve the terrain/surroundings/road layer offsets. Writing fragment
   // depth replaces the fixed-function polygon offset, so apply it here.
   float slope=max(abs(dFdx(depth)),abs(dFdy(depth)));
   gl_FragDepth=clamp(depth+depthOffset*(slope+1.0/16777216.0),0.0,1.0);
   vec4 col=c;
   if(mat.x>0.5&&mat.x<2.5){float index=floor(texture(atlas,tex).r*255.0+0.5);if(mat.x>1.5&&index<0.5)discard;float x=(index+0.5)/256.0;col=mat.y<0.0?texture(palette,vec2(x,0.5)):texture(shades,vec2(x,(floor(clamp(mat.y,0.0,1.0)*255.0+0.5)+0.5)/256.0));}
   if(mat.x>2.5&&mat.x<3.5){if(mod(floor(gl_FragCoord.x)+floor(gl_FragCoord.y),2.0)>0.5)discard;}
   if(mat.x>3.5&&mat.x<4.5){if(mod(floor(gl_FragCoord.x/2.0)+floor(gl_FragCoord.y/2.0),2.0)>0.5)discard;}
   if(mat.x>4.5&&mat.x<5.5&&mod(floor(gl_FragCoord.x),2.0)>0.5)col=alt;
   if(mat.x>5.5&&mat.x<6.5&&length(gl_PointCoord-vec2(0.5))>0.5)discard;
   pixel=col;
  }`;
  this.shaders=[];const shader=(type,source)=>{const s=gl.createShader(type);this.shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  this.program=gl.createProgram();gl.attachShader(this.program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);let offset=0;
  for(const [name,n]of [['position',3],['colour',4],['alternate',4],['uv',2],['material',2],['depthPlane',4]]){let a=gl.getAttribLocation(this.program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,n,gl.FLOAT,false,76,offset*4);offset+=n;}
  const size=this.atlasSize=2**Math.ceil(Math.log2(Math.max(64,Math.ceil(Math.sqrt(textures.length))*64))),columns=size/64;
  this.slots=new Map();const pixels=new Uint8Array(size*size);
  textures.forEach((t,i)=>{const sx=i%columns,sy=Math.floor(i/columns);this.slots.set(t.id,[sx,sy]);for(let y=0;y<64;y++)pixels.set(t.indices.slice(y*64,y*64+64),(sy*64+y)*size+sx*64);});
  this.textures=[];const upload=(unit,name,width,height,format,data)=>{gl.activeTexture(gl.TEXTURE0+unit);const t=gl.createTexture();this.textures.push(t);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,format===gl.RED?gl.R8:gl.RGB8,width,height,0,format,gl.UNSIGNED_BYTE,data);for(const [p,v]of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,p,v);gl.uniform1i(gl.getUniformLocation(this.program,name),unit);};
  upload(0,'atlas',size,size,gl.RED,pixels);upload(1,'palette',256,1,gl.RGB,new Uint8Array(materials.palette));const shades=new Uint8Array(256*256*3);
  for(let c=0;c<256;c++)for(let l=0;l<256;l++){const index=materials.intensity[c*256+l];shades.set(materials.palette.slice(index*3,index*3+3),(l*256+c)*3);}
  upload(2,'shades',256,256,gl.RGB,shades);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 }
 destroy(){const g=this.gl;for(const t of this.textures)g.deleteTexture(t);for(const s of this.shaders)g.deleteShader(s);g.deleteBuffer(this.buffer);g.deleteProgram(this.program);}
 colour(index,light){if(light!==undefined)index=this.materials.intensity[index*256+Math.max(0,Math.min(255,Math.round(light*255)))];return [...this.materials.palette.slice(index*3,index*3+3).map(v=>v/255),1];}
 draw(scene,camera,settings){
  const gl=this.gl,w=this.canvas.width,h=this.canvas.height;gl.useProgram(this.program);gl.viewport(0,0,w,h);gl.clearColor(.055,.085,.11,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const near=camera.radius*.005,far=camera.radius*50,f=1/Math.tan(Math.PI/8);gl.uniform4f(gl.getUniformLocation(this.program,'projection'),f*h/w,f,(far+near)/(far-near),-2*far*near/(far-near));gl.uniform1f(gl.getUniformLocation(this.program,'pointSize'),settings.pointSize*devicePixelRatio);gl.uniform2f(gl.getUniformLocation(this.program,'viewport'),w,h);
  const layers=[[],[],[],[]],lines=[],points=[],dot=n=>Math.max(0,(n[0]*.35-n[1]*.4+n[2]*.846)/127);
  const vertex=(out,item,i,override,point=false)=>{
   const a=item.attributes,t=item.type,shaded=t>=9&&t<=20,twocolour=[3,12,18].includes(t),texture=[7,8,15,16,19,20].includes(t);
   let light=item.light?.[i]??(shaded?dot(item.normals[item.vertex_normals?.[i]??a[twocolour||texture?2:1]]??[0,0,127]):undefined);
   let col=override??this.colour(a[0]??1,light),alt=twocolour?this.colour(a[1],light):col,mode=point?6:twocolour?5:[4,13].includes(t)?3:[5,14].includes(t)?4:0,uv=[0,0],shade=-1;
   if(texture&&!override){const slot=this.slots.get(a.at(-1));if(slot){uv=item.uv[i].map((v,k)=>(slot[k]*64+Math.max(0,Math.min(63,v))+.5)/this.atlasSize);mode=[8,16,20].includes(t)?2:1;shade=light??-1;}}
   if([6,21].includes(t)&&!override)col=[.38,.55,.58,t===6?.22:.1];out.push(...item.vertices[i],...col,...alt,...uv,mode,shade);
  };
  // Canonicalise planes before the camera transform. Coplanar wall details
  // must receive bit-identical coefficients, even with different vertices.
  const origin=camera.view([0,0,0]),axes=[[1,0,0],[0,1,0],[0,0,1]].map(p=>camera.view(p).map((v,i)=>v-origin[i])),planes=new Map();
  const cameraPlane=triangle=>{
   const world=plane(triangle),key=world.join(',');
   if(!planes.has(key)){
    const normal=[0,1,2].map(i=>axes.reduce((sum,axis,j)=>sum+axis[i]*world[j],0));
    planes.set(key,[...normal,world[3]-normal.reduce((sum,v,i)=>sum+v*origin[i],0)]);
   }
   return planes.get(key);
  };
  for(const item of scene.faces){const triangles=layers[item.layer??3],packed=[];for(let i=0;i<item.vertices.length;i++){const v=[];vertex(v,item,i);packed.push(v);}for(const tri of triangulate(packed)){const equation=cameraPlane(tri);for(const v of tri)triangles.push(...v,...equation);}if(settings.wire)for(let i=0;i<item.vertices.length;i++){vertex(lines,item,i,[.12,.17,.2,1]);lines.push(0,0,0,0);vertex(lines,item,(i+1)%item.vertices.length,[.12,.17,.2,1]);lines.push(0,0,0,0);}}
  for(const item of scene.lines)for(let i=1;i<item.vertices.length;i++){vertex(lines,item,i-1);lines.push(0,0,0,0);vertex(lines,item,i);lines.push(0,0,0,0);}for(const item of scene.points)for(let i=0;i<item.vertices.length;i++){vertex(points,item,i,undefined,true);points.push(0,0,0,0);}
  const stride=19,draw=(data,kind)=>{if(!data.length)return;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);const transformed=new Float32Array(data);for(let i=0;i<data.length;i+=stride)transformed.set(camera.view(data.slice(i,i+3)),i);gl.bufferData(gl.ARRAY_BUFFER,transformed,gl.DYNAMIC_DRAW);gl.drawArrays(kind,0,data.length/stride);};
  for(let i=0;i<4;i++){gl.uniform1f(gl.getUniformLocation(this.program,'depthOffset'),i<3?3-i:0);draw(layers[i],gl.TRIANGLES);}
  draw(lines,gl.LINES);draw(points,gl.POINTS);
  return {triangles:layers.reduce((n,l)=>n+l.length/(stride*3),0),lines:lines.length/(stride*2),points:points.length/stride};
 }
}
