import { locationsOnFloor } from "./campus-data.js";

const NS="http://www.w3.org/2000/svg";
function svgNode(tag,attributes={}) {
  const node=document.createElementNS(NS,tag);
  Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,String(value)));
  return node;
}

function positionGeneric(locations,index) {
  const count=Math.max(locations.length,1);
  const columns=Math.ceil(count/2);
  const row=index<columns?0:1;
  const local=index%columns;
  const usable=1550;
  const width=Math.max(90,usable/columns);
  const x=225+local*width;
  const y=row===0?240:610;
  const door=[x+width/2,row===0?470:570];
  return {x,y,width:width-10,height:230,door,label:[x+(width-10)/2,y+120]};
}

function addMarker(group,point,label,className) {
  const circle=svgNode("circle",{cx:point[0],cy:point[1],r:24,class:className});
  const text=svgNode("text",{x:point[0],y:point[1]+8,class:"route-letter"}); text.textContent=label;
  group.append(circle,text);
}

export function renderFloorMap(svg,{buildingId,floor,route,destinationId,originId}) {
  svg.replaceChildren();
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
      const label=svgNode("text",{x:location.label[0],y:location.label[1]-62,class:"floor-room-label"});
      label.textContent=location.id; svg.append(label);
    });
  } else {
    const corridor=svgNode("rect",{x:165,y:470,width:1670,height:100,rx:18,class:"floor-corridor"}); svg.append(corridor);
    const stairWest=svgNode("rect",{x:65,y:330,width:100,height:240,rx:12,class:"floor-stair"});
    const stairEast=svgNode("rect",{x:1835,y:330,width:100,height:240,rx:12,class:"floor-stair"}); svg.append(stairWest,stairEast);
    const prioritized=shown.filter(location=>[destinationId,originId].includes(location.id));
    shown=[...prioritized,...shown.filter(location=>![destinationId,originId].includes(location.id))].slice(0,16);
    shown.forEach((location,index)=>{
      const p=positionGeneric(shown,index);
      location.point=[p.label[0],p.label[1]]; location.door=p.door;
      const room=svgNode("rect",{x:p.x,y:p.y,width:p.width,height:p.height,rx:8,class:`floor-room${location.id===destinationId?" is-destination":""}${location.id===originId?" is-origin":""}`});
      const label=svgNode("text",{x:p.label[0],y:p.label[1],class:"floor-room-label"}); label.textContent=location.id;
      svg.append(room,label);
    });
  }

  if (route?.points?.length) {
    const routePoints=buildingId==="c1" && Number(floor)===5
      ? route.points.map(([x,y])=>[x,y-62])
      : route.points;
    const value=routePoints.map(point=>point.join(",")).join(" ");
    svg.append(svgNode("polyline",{points:value,class:"floor-route-halo"}),svgNode("polyline",{points:value,class:"floor-route"}));
    const markers=svgNode("g"); addMarker(markers,routePoints[0],"A","route-start"); addMarker(markers,routePoints.at(-1),"Б","route-end"); svg.append(markers);
  }
}
