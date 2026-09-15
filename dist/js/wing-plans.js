// Three separately traced layouts: floor 1, floor 2, typical floors 3–5.
// Drawing units only; perspective and small door widths are approximate.
// Numbered anchors on 3–5 come from the user's earlier annotated fifth-floor sketch.
// Corpus 2 numbering uses the user-supplied +16 rule only for anchored rooms.
const W=2000,H=650;
const segment=(...points)=>points;

function basePlan(floor){
  const plan={width:W,height:H,rotateOnMobile:true,rooms:[],nodes:{},edges:[],corridors:[],walls:[],windows:[],stepLines:[],connectors:{},captions:[],source:""};
  const outline=[[70,90],[425,90],[425,60],[600,60],[600,245],[1400,245],[1400,60],[1570,60],[1570,90],[1920,90],[1920,425],[1570,425],[1570,595],[425,595],[425,425],[70,425]];
  plan.outline=outline;
  // Walkable centre lines. Bottom-central recess remains part of the corridor.
  const horizontal=[450,525,620,720,830,940,1040,1150,1270,1380,1480,1550];
  horizontal.forEach((x,i)=>{plan.nodes[`h${i}`]=[x,450];if(i)plan.edges.push([`h${i-1}`,`h${i}`]);});
  plan.corridors.push(segment([450,450],[1550,450]),segment([450,180],[450,575]),segment([1550,180],[1550,575]),segment([940,450],[940,575],[1120,575],[1120,450]));
  for(const [side,x,index]of [["w",450,0],["e",1550,11]]){
    plan.nodes[`${side}-upper`]=[x,185];plan.nodes[`${side}-wing`]=[x,335];plan.nodes[`${side}-bottom`]=[x,550];
    plan.edges.push([`${side}-upper`,`${side}-wing`],[`${side}-wing`,`h${index}`],[`h${index}`,`${side}-bottom`]);
  }
  plan.nodes.recess=[1040,550];plan.edges.push(["h6","recess"]);
  const add=(key,label,rect,door,access,type="room",number=null)=>{
    const [x,y,w,h]=rect;
    const room={id:key,slot:key,label,type,rect,door,access,point:[x+w/2,y+h/2],number,positionBasis:number?"user-sketch":"plan-only"};
    plan.rooms.push(room);return room;
  };
  add("stairs-w","Лестница",[515,65,80,180],[515,185],"w-upper","stairs");
  add("stairs-e","Лестница",[1405,65,80,180],[1485,185],"e-upper","stairs");
  plan.corridors.push(segment([450,185],[515,185]),segment([1485,185],[1550,185]));
  plan.connectors={west:"stairs-w",east:"stairs-e"};

  if(floor===1){
    // Three rooms in the upper-left wing and subdivided service rooms on the right.
    plan.corridors.push(segment([110,240],[450,240]),segment([1550,150],[1860,150]),segment([1550,250],[1700,250]));
    plan.nodes.wbranch=[450,240];plan.edges.push(["w-upper","wbranch"],["wbranch","w-wing"]);
    for(const [i,x]of [175,270,365].entries()){
      plan.nodes[`wl${i}`]=[x,240];plan.edges.push([i?`wl${i-1}`:"wbranch",`wl${i}`]);
      add(`northwest-${i}`,`С${i+1}`,[95+i*110,95,100,120],[x,215],`wl${i}`);
    }
    add("southwest","З1",[75,280,350,135],[425,335],"w-wing");
    plan.nodes.ehigh=[1550,150];plan.edges.push(["e-upper","ehigh"]);
    for(const [i,x]of [1640,1740,1850].entries()){
      plan.nodes[`er${i}`]=[x,150];plan.edges.push([i?`er${i-1}`:"ehigh",`er${i}`]);
      add(`northeast-${i}`,`В${i+1}`,[1590+i*108,185,95,95],[x,185],`er${i}`);
    }
    // The upper outer band is a corridor, not another classroom.
    add("southeast","В4",[1585,320,325,95],[1585,355],"e-wing");
    const n=[{x:510,w:295,door:620},{x:805,w:155,door:830},{x:960,w:85,door:1000},{x:1045,w:450,door:1270}];
    n.forEach((r,i)=>add(`north-${i}`,`Ц${i+1}`,[r.x,255,r.w,170],[r.door,425],i===0?"h2":i===1?"h4":i===2?"h5":"h8"));
    const south=[{x:510,w:110},{x:625,w:95},{x:725,w:170},{x:900,w:80},{x:1200,w:160},{x:1430,w:65},{x:1365,w:60}];
    south.forEach((r,i)=>{
      const door=[r.x+r.w/2,485];const key=`south-access-${i}`;plan.nodes[key]=[door[0],450];
      plan.edges.push([key,i<4?"h3":"h9"]);add(`south-${i}`,`Ю${i+1}`,[r.x,485,r.w,100],door,key);
    });
    for(const side of ["w","e"]){
      const x=side==="w"?450:1550;
      add(`exit-${side}`,"Выход",[x-22,565,44,30],[x,565],`${side}-bottom`,"entrance");
      plan.stepLines.push(segment([x-24,505],[x+24,505]),segment([x-24,513],[x+24,513]),segment([x-24,521],[x+24,521]));
    }
  }else{
    add("northwest","СЗ",[75,95,350,150],[425,185],"w-upper","room",13);
    add("southwest","З1",[75,280,350,135],[425,335],"w-wing","room",12);
    add("northeast","СВ",[1585,95,325,150],[1585,185],"e-upper");
    add("southeast","В1",[1585,280,325,135],[1585,335],"e-wing","room",2);
    if(floor===2){
      // Three distinct central groups, with partial partitions opening into their lobbies.
      add("north-0","Ц1",[510,255,235,170],[720,425],"h3");
      add("north-1","Ц2",[755,255,105,170],[830,425],"h4");
      add("north-2","Ц3",[870,255,350,170],[940,425],"h5");
      add("north-3","Ц4",[1230,255,265,170],[1270,425],"h8");
      plan.walls.push(segment([645,255],[645,355]),segment([970,255],[970,345]),segment([1110,255],[1110,360]),segment([1340,255],[1340,345]));
    }else{
      const left=add("north-0","Ц1",[510,255,490,170],[620,425],"h2","room",14);
      left.doors=[{point:[620,425],access:"h2"},{point:[940,425],access:"h5"}];
      const right=add("north-1","Ц2",[1000,255,495,170],[1040,425],"h6","room",15);
      right.doors=[{point:[1040,425],access:"h6"},{point:[1380,425],access:"h9"}];
    }
    add("south-0","Ю1",[625,485,205,105],[720,485],"h3","room",3);
    add("south-1","Ю2",[840,485,100,105],[880,485],"h4");
    add("south-2","Ю3",[1160,485,150,105],[1270,485],"h8");
    add("south-3","Ю4",[1320,485,100,105],[1380,485],"h9","room",1);
    // Service blocks: outlines and internal partitions are traced; WC identity is from the sketch.
    add("wc-w","WC",[510,485,105,105],[550,485],"h1","restroom").point=[570,510];
    add("wc-e","WC",[1430,485,95,105],[1480,485],"h10","restroom");
    plan.walls.push(segment([545,485],[545,535],[615,535]),segment([1480,485],[1480,515],[1505,515],[1505,545],[1525,545]));
  }
  // Window bands preserve the distinctive repeated bays of the evacuation drawings.
  for(const [start,end,y]of [[90,410,90],[90,410,425],[610,1390,245],[530,1510,595],[1600,1900,90],[1600,1900,425]]){
    for(let x=start;x<end-24;x+=76)plan.windows.push([[x,y],[Math.min(x+47,end),y]]);
  }
  return plan;
}

export function createWingPlan(buildingId,floor){
  const f=Number(floor),plan=basePlan(f),mirror=buildingId==="c2";
  const transform=p=>mirror?[W-p[0],p[1]]:[...p];
  const prefix=`${buildingId}-${f}`;
  const idMap=new Map(plan.rooms.map(room=>[room.id,room.number?`${mirror?2:1}${f}${String(room.number+(mirror?16:0)).padStart(2,"0")}`:`${prefix}-${room.id}`]));
  plan.rooms=plan.rooms.map(room=>{
    const id=idMap.get(room.id),numbered=/^\d{4}$/.test(id);
    const [x,y,w,h]=room.rect;
    return {...room,id,label:numbered?id:room.label,rect:[mirror?W-x-w:x,y,w,h],point:transform(room.point),door:transform(room.door),doors:room.doors?.map(d=>({...d,point:transform(d.point)})),positionBasis:mirror?(numbered?"user-mirror-numbering":"mirror-layout"):room.positionBasis,number:numbered?id:null};
  });
  plan.outline=plan.outline.map(transform);
  for(const key of ["corridors","walls","windows","stepLines"])plan[key]=plan[key].map(points=>points.map(transform));
  plan.nodes=Object.fromEntries(Object.entries(plan.nodes).map(([key,point])=>[key,transform(point)]));
  const west=idMap.get("stairs-w"),east=idMap.get("stairs-e");
  plan.connectors={west:mirror?east:west,east:mirror?west:east};
  plan.captions=[{text:mirror?"Зеркальная планировка · привязка по эскизу и правилу +16":"Неподписанные помещения обозначены буквами",point:[1000,630]}];
  plan.source=(mirror?"Корпус 2: зеркальная схема корпуса 1":"Корпус 1: план эвакуации "+(f>=3?5:f)+"-го этажа")+(f===3||f===4?" · применён к "+f+"-му этажу по вашему указанию":"")+". Размеры приблизительные; номера без привязки — в справочнике.";
  // A known passage location, not a guessed separate cafe room.
  if(buildingId==="c1"&&f===2){
    plan.rooms.push({id:"cofix",slot:"cofix",label:"Coffix",type:"food",rect:[1528,212,44,28],point:[1550,226],door:[1550,240],access:"e-wing",positionBasis:"user-transition"});
  }
  return plan;
}

export const wingPlans=Object.fromEntries(["c1","c2"].flatMap(area=>[1,2,3,4,5].map(floor=>[`${area}:${floor}`,createWingPlan(area,floor)])));
