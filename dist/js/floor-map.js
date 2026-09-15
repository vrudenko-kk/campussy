import { floorGeometryFor, locationsOnFloor } from "./campus-data.js";

const NS="http://www.w3.org/2000/svg";
function svgNode(tag,attributes={}) {
  const node=document.createElementNS(NS,tag);
  Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,String(value)));
  return node;
}

function roundedPath(points,radius=34) {
  const clean=points.filter((point,index)=>index===0 || point[0]!==points[index-1][0] || point[1]!==points[index-1][1]);
  if (clean.length<2) return "";
  let value=`M ${clean[0][0]} ${clean[0][1]}`;
  for (let index=1;index<clean.length-1;index+=1) {
    const previous=clean[index-1]; const current=clean[index]; const next=clean[index+1];
    const beforeDistance=Math.hypot(current[0]-previous[0],current[1]-previous[1]);
    const afterDistance=Math.hypot(next[0]-current[0],next[1]-current[1]);
    const beforeOffset=Math.min(radius,beforeDistance/2); const afterOffset=Math.min(radius,afterDistance/2);
    const before=[current[0]+(previous[0]-current[0])*(beforeOffset/beforeDistance),current[1]+(previous[1]-current[1])*(beforeOffset/beforeDistance)];
    const after=[current[0]+(next[0]-current[0])*(afterOffset/afterDistance),current[1]+(next[1]-current[1])*(afterOffset/afterDistance)];
    value+=` L ${before[0]} ${before[1]} Q ${current[0]} ${current[1]} ${after[0]} ${after[1]}`;
  }
  return `${value} L ${clean.at(-1)[0]} ${clean.at(-1)[1]}`;
}

function appendRoute(svg,points) {
  const path=roundedPath(points);
  svg.append(svgNode("path",{d:path,class:"floor-route-halo"}),svgNode("path",{d:path,class:"floor-route"}));
}

function addMarker(group,point,label,className) {
  const circle=svgNode("circle",{cx:point[0],cy:point[1],r:24,class:className});
  const text=svgNode("text",{x:point[0],y:point[1]+8,class:"route-letter"}); text.textContent=label;
  group.append(circle,text);
}

function makeRoomInteractive(group,location,onLocationClick) {
  if (!onLocationClick) return;
  group.classList.add("floor-room-hotspot");
  group.setAttribute("role","button");
  group.setAttribute("tabindex","0");
  group.setAttribute("aria-label",`${location.name}. Открыть действия.`);
  group.addEventListener("click",()=>onLocationClick(location));
  group.addEventListener("keydown",event=>{
    if (event.key==="Enter" || event.key===" ") { event.preventDefault(); onLocationClick(location); }
  });
}

function renderOutdoorAccessMap(svg,stage) {
  svg.setAttribute("viewBox","0 0 1000 760");
  const title=svgNode("title"); title.textContent="Маршрут между КПП и центральным входом";
  const desc=svgNode("desc"); desc.textContent="Схема территории кампуса с проходной, центральным входом и пешеходным маршрутом.";
  svg.append(title,desc,svgNode("rect",{x:20,y:20,width:960,height:720,rx:28,class:"floor-bg"}));

  svg.append(svgNode("path",{d:"M850 40 L925 40 L925 720 L850 720 Z",class:"outdoor-road"}));
  const roadLabel=svgNode("text",{x:888,y:385,class:"outdoor-road-label",transform:"rotate(90 888 385)"});
  roadLabel.textContent="4-й Вешняковский проезд"; svg.append(roadLabel);

  svg.append(
    svgNode("path",{d:"M120 120 H470 V280 H625 V545 H310 V455 H120 Z",class:"outdoor-building"}),
    svgNode("path",{d:"M470 120 H790 V455 H625 V280 H470 Z",class:"outdoor-building is-secondary"}),
    svgNode("rect",{x:735,y:575,width:105,height:74,rx:10,class:"outdoor-checkpoint"}),
  );
  const campusLabel=svgNode("text",{x:455,y:245,class:"outdoor-label"}); campusLabel.textContent="Корпус 3";
  const entryLabel=svgNode("text",{x:625,y:530,class:"outdoor-small-label"}); entryLabel.textContent="Центральный вход";
  const checkpointLabel=svgNode("text",{x:787,y:620,class:"outdoor-checkpoint-label"}); checkpointLabel.textContent="КПП";
  svg.append(campusLabel,entryLabel,checkpointLabel);

  const fromCheckpoint=stage.role==="start";
  const points=fromCheckpoint?[[787,612],[700,612],[700,545],[625,545]]:[[625,545],[700,545],[700,612],[787,612]];
  appendRoute(svg,points);
  const markers=svgNode("g");
  addMarker(markers,points[0],"A","route-start"); addMarker(markers,points.at(-1),"Б","route-end"); svg.append(markers);
}

export function renderFloorMap(svg,{buildingId,floor,route,destinationId,originId,onLocationClick,stage}) {
  svg.replaceChildren();
  svg.classList.toggle("is-outdoor-map",stage?.kind==="outdoor");
  if (stage?.kind==="outdoor") { renderOutdoorAccessMap(svg,stage); return; }
  svg.setAttribute("viewBox","0 0 2000 900");
  const title=svgNode("title"); title.textContent=`Карта ${floor}-го этажа`;
  const desc=svgNode("desc"); desc.textContent="Схематичный план с аудиториями и маршрутом.";
  svg.append(title,desc);
  const background=svgNode("rect",{x:20,y:20,width:1960,height:840,rx:28,class:"floor-bg"}); svg.append(background);

  let shown=locationsOnFloor(buildingId,floor);
  if (buildingId==="c1" && Number(floor)===5) {
    const image=svgNode("image",{href:"assets/floor-5-map.svg",x:0,y:-62,width:2000,height:1040,preserveAspectRatio:"xMidYMid meet"});
    image.setAttribute("opacity","0.96"); svg.append(image);
    shown=shown.filter(location=>location.point);
    shown.forEach(location=>{
      const group=svgNode("g");
      const target=svgNode("rect",{x:location.label[0]-78,y:location.label[1]-112,width:156,height:92,rx:16,class:`floor-room-target${location.id===destinationId?" is-destination":""}${location.id===originId?" is-origin":""}`});
      const label=svgNode("text",{x:location.label[0],y:location.label[1]-62,class:"floor-room-label"});
      label.textContent=location.id; group.append(target,label); makeRoomInteractive(group,location,onLocationClick); svg.append(group);
    });
  } else {
    const corridor=svgNode("rect",{x:165,y:470,width:1670,height:100,rx:18,class:"floor-corridor"}); svg.append(corridor);
    const stairWest=svgNode("rect",{x:65,y:330,width:100,height:240,rx:12,class:"floor-stair"});
    const stairEast=svgNode("rect",{x:1835,y:330,width:100,height:240,rx:12,class:"floor-stair"}); svg.append(stairWest,stairEast);
    shown=[...shown].sort((a,b)=>a.id.localeCompare(b.id,"ru",{numeric:true})).slice(0,18);
    shown.forEach((location,index)=>{
      const p=floorGeometryFor(location,index);
      const group=svgNode("g");
      const room=svgNode("rect",{x:p.x,y:p.y,width:p.width,height:p.height,rx:8,class:`floor-room${location.id===destinationId?" is-destination":""}${location.id===originId?" is-origin":""}`});
      const label=svgNode("text",{x:p.label[0],y:p.label[1],class:"floor-room-label"}); label.textContent=location.mapLabel??location.id;
      group.append(room,label); makeRoomInteractive(group,location,onLocationClick); svg.append(group);
    });
  }

  const floorStage=route?.stages?.find(stage=>stage.kind==="floor" && stage.buildingId===buildingId && Number(stage.floor)===Number(floor));
  const displayedPoints=route?.points?.length?route.points:floorStage?.points;
  if (displayedPoints?.length) {
    const routePoints=buildingId==="c1" && Number(floor)===5
      ? displayedPoints.map(([x,y])=>[x,y-62])
      : displayedPoints;
    appendRoute(svg,routePoints);
    const markers=svgNode("g"); addMarker(markers,routePoints[0],"A","route-start"); addMarker(markers,routePoints.at(-1),"Б","route-end"); svg.append(markers);
  }
}
