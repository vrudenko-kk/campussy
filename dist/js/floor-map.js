import { getFloorPlan, locationById, buildingById } from "./campus-data.js";

const NS="http://www.w3.org/2000/svg";
const svgNode=(tag,attributes={})=>{
  const node=document.createElementNS(NS,tag);
  for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));
  return node;
};
const text=(value,x,y,className="plan-label")=>{
  const node=svgNode("text",{x,y,class:className});node.textContent=value;return node;
};

export function roundedPath(points,radius=12){
  const clean=points.filter((p,i)=>i===0||p[0]!==points[i-1][0]||p[1]!==points[i-1][1]);
  if(clean.length<2)return "";
  let path="M "+clean[0].join(" ");
  for(let i=1;i<clean.length-1;i++){
    const a=clean[i-1],b=clean[i],c=clean[i+1],d1=Math.hypot(b[0]-a[0],b[1]-a[1]),d2=Math.hypot(c[0]-b[0],c[1]-b[1]);
    const r=Math.min(radius,d1/3,d2/3);
    const before=b.map((v,j)=>v+(a[j]-v)*r/d1),after=b.map((v,j)=>v+(c[j]-v)*r/d2);
    path+=" L "+before.join(" ")+" Q "+b.join(" ")+" "+after.join(" ");
  }
  return path+" L "+clean.at(-1).join(" ");
}
function marker(svg,point,label,type){
  svg.append(svgNode("circle",{cx:point[0],cy:point[1],r:16,class:"plan-marker "+type}),text(label,point[0],point[1]+6,"plan-marker-label"));
}
function drawRoute(svg,points){
  if(!points?.length)return;
  if(points.length===1){marker(svg,points[0],"А","start");return;}
  const d=roundedPath(points);
  svg.append(svgNode("path",{d,class:"plan-route-halo"}),svgNode("path",{d,class:"plan-route"}));
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length<95)continue;
    const angle=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
    svg.append(svgNode("path",{d:"M -9 -8 L 8 0 L -9 8 Z",transform:`translate(${(a[0]+b[0])/2} ${(a[1]+b[1])/2}) rotate(${angle})`,class:"plan-direction"}));
  }
  marker(svg,points[0],"А","start");marker(svg,points.at(-1),"Б","finish");
}
function interactive(group,location,onLocationClick){
  if(!location||!onLocationClick)return;
  group.classList.add("floor-room-hotspot");group.setAttribute("role","button");group.setAttribute("tabindex","0");
  group.setAttribute("aria-label",location.name+". Маршрут отсюда или сюда.");
  group.addEventListener("click",()=>onLocationClick(location));
  group.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onLocationClick(location);}});
}
function stairs(svg,rect){
  const [x,y,w,h]=rect;
  for(let i=1;i<8;i++)svg.append(svgNode("path",{d:"M "+(x+8)+" "+(y+h*i/8)+" H "+(x+w-8),class:"plan-stair-line"}));
}
function outdoor(svg,stage){
  svg.setAttribute("viewBox","0 0 1000 800");
  svg.append(svgNode("rect",{x:20,y:20,width:960,height:760,rx:22,class:"plan-ground"}));
  svg.append(svgNode("path",{d:"M 160 85 H 50 V 755 H 950 V 85 H 250",class:"plan-fence"}));
  svg.append(svgNode("rect",{x:25,y:25,width:950,height:35,class:"outdoor-road"}),text("4-й Вешняковский проезд",600,50,"plan-caption"));
  svg.append(svgNode("rect",{x:140,y:65,width:100,height:65,rx:5,class:"plan-building"}),text("КПП",290,103));
  svg.append(svgNode("rect",{x:270,y:220,width:460,height:70,rx:4,class:"plan-entry"}),text("Главный вход",500,256));
  svg.append(svgNode("rect",{x:160,y:280,width:120,height:370,class:"plan-building"}),text("1",220,480));
  svg.append(svgNode("rect",{x:720,y:280,width:120,height:370,class:"plan-building"}),text("2",780,480));
  svg.append(svgNode("rect",{x:295,y:620,width:410,height:115,class:"plan-building"}),text("Корпус 3",500,690));
  svg.append(text("Внутренний двор",500,490,"plan-caption"),text("Вход · 1 этаж",500,604,"plan-caption"));
  drawRoute(svg,stage.points);
}

function transferMap(svg,options){
  const {stage}=options;
  svg.setAttribute("viewBox","0 0 1200 1450");
  const panels=[{area:stage.fromBuildingId,floor:stage.fromFloor,points:stage.approachPoints,y:0,label:"Откуда"},{area:stage.toBuildingId,floor:stage.toFloor,points:stage.departurePoints,y:820,label:"Куда"}];
  for(const panel of panels){
    svg.append(svgNode("rect",{x:10,y:panel.y+10,width:1180,height:610,rx:24,class:"transfer-panel"}));
    const heading=svgNode("text",{x:40,y:panel.y+60,class:"transfer-heading"});
    heading.textContent=`${panel.label} · ${buildingById(panel.area).name} · ${panel.floor} этаж`;svg.append(heading);
    const map=svgNode("svg",{x:25,y:panel.y+80,width:1150,height:515});
    renderFloorMap(map,{...options,buildingId:panel.area,floor:panel.floor,stage:{kind:"floor",points:panel.points}});
    svg.append(map);
  }
  svg.append(svgNode("path",{d:"M 600 645 V 792 M 583 775 L 600 795 L 617 775",class:"transfer-link"}));
  const label=stage.kind==="vertical"?(stage.transport==="lift"?"Лифт":"Лестница"):stage.title;
  svg.append(text(label,330,710,"transfer-copy"));
  svg.append(text(stage.fromFloor+" → "+stage.toFloor+" этаж",870,710,"transfer-copy"));
}

export function renderFloorMap(svg,{buildingId,floor,destinationId,originId,onLocationClick,stage}){
  svg.replaceChildren();
  svg.setAttribute("preserveAspectRatio","xMidYMid meet");
  svg.classList.toggle("is-outdoor-map",stage?.kind==="outdoor");
  const title=svgNode("title");title.textContent=stage?.kind==="outdoor"?"Путь по территории кампуса":"План "+floor+"-го этажа";
  svg.append(title);
  if(stage?.kind==="outdoor"){outdoor(svg,stage);return;}
  if(stage?.kind==="vertical"||stage?.kind==="transition"){
    title.textContent=stage.title;
    transferMap(svg,{buildingId,floor,destinationId,originId,onLocationClick,stage});return;
  }
  const plan=getFloorPlan(buildingId,floor);
  svg.setAttribute("viewBox","0 0 "+plan.width+" "+plan.height);
  svg.setAttribute("data-plan",buildingId+":"+floor);
  const content=svgNode("g",plan.image?{transform:"translate(0 "+plan.imageOffset+")"}:{});
  svg.append(content);
  if(plan.image){
    content.append(svgNode("image",{href:plan.image,x:0,y:0,width:2000,height:1040,preserveAspectRatio:"xMidYMid meet"}));
  }else{
    content.append(svgNode("rect",{x:10,y:10,width:plan.width-20,height:plan.height-20,rx:20,class:"plan-ground"}));
    if(plan.outline)content.append(svgNode("polygon",{points:plan.outline.map(p=>p.join(",")).join(" "),class:"plan-outline"}));
    for(const points of plan.corridors)content.append(svgNode("path",{d:"M "+points.map(p=>p.join(" ")).join(" L "),class:"plan-corridor"}));
  }
  for(const decoration of plan.decorations??[]){
    const [x,y,width,height]=decoration.rect;
    content.append(svgNode("rect",{x,y,width,height,class:"plan-room is-stairs"}));stairs(content,decoration.rect);
  }
  for(const room of plan.rooms){
    const group=svgNode("g",{"data-room":room.id}),[x,y,width,height]=room.rect;
    group.append(svgNode("rect",{x,y,width,height,rx:plan.image?10:2,class:"plan-room is-"+room.type+(room.id===originId?" is-origin":"")+(room.id===destinationId?" is-destination":"")+(plan.image?" is-overlay":"")}));
    if(room.type==="stairs")stairs(group,room.rect);
    if(room.type==="lift"){
      group.append(svgNode("path",{d:"M "+(x+8)+" "+(y+8)+" L "+(x+width-8)+" "+(y+height-8)+" M "+(x+width-8)+" "+(y+8)+" L "+(x+8)+" "+(y+height-8),class:"plan-lift-cross"}));
    }
    // Open a visible gap in the wall at the exact routable doorway.
    const horizontal=Math.abs(room.door[1]-y)<1||Math.abs(room.door[1]-(y+height))<1;
    group.append(svgNode("path",{d:horizontal?"M "+(room.door[0]-14)+" "+room.door[1]+" h 28":"M "+room.door[0]+" "+(room.door[1]-14)+" v 28",class:"plan-door"}));
    const caption=svgNode("text",{x:room.point[0],y:room.point[1]-(room.type==="room"?30:0),class:"plan-label"+(room.type==="lift"||room.type==="stairs"?" is-small":"")});
    caption.textContent=room.label;group.append(caption);
    interactive(group,locationById(room.id),onLocationClick);content.append(group);
  }
  for(const caption of plan.captions??[])content.append(text(caption.text,...caption.point,"plan-caption"));
  if(stage?.kind==="floor")drawRoute(content,stage.points);
  if(stage?.connectorPoint)marker(content,stage.connectorPoint,stage.kind==="vertical"?(stage.toFloor>stage.fromFloor?"↑":"↓"):"↔","finish");
}
