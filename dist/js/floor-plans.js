// One geometry contract for rendering and routing. Coordinates are schematic
// drawing units, not metres. Doors always connect to a named corridor node.
const rect=(id,label,x,y,w,h,door,access,type="room")=>({id,label,type,rect:[x,y,w,h],point:[x+w/2,y+h/2],door,access,...(type==="lift"?{shaftId:id.split("-").at(-1)}:{})});
const line=(a,b)=>[a,b];

export const surveyedPlans={
  "c3:8":{
    width:1200,height:800,source:"По плану эвакуации 8-го этажа · размеры приблизительные",
    outline:[[35,130],[170,130],[170,45],[1030,45],[1030,130],[1165,130],[1165,735],[955,735],[660,785],[540,785],[250,745],[35,745]],
    corridors:[[[65,400],[1135,400]],[[200,400],[200,95],[230,95]],[[1000,400],[1000,95],[970,95]],[[390,400],[390,250]],[[810,400],[810,250]],[[600,400],[600,735]],[[65,400],[65,690]],[[1135,400],[1135,690]],[[530,505],[670,505]]],
    nodes:{west:[65,400],wcw:[200,400],wcwa:[200,300],sw:[200,140],lw:[390,400],lw1:[390,250],lw2:[390,315],r10:[470,400],hall:[600,400],r11:[740,400],le:[810,400],le1:[810,250],le2:[810,315],wce:[1000,400],wcea:[1000,300],se:[1000,140],east:[1135,400],hallSouth:[600,505],hallEnd:[600,735],westDoor:[65,460],eastDoor:[1135,460]},
    edges:[line("west","wcw"),line("wcw","lw"),line("lw","r10"),line("r10","hall"),line("hall","r11"),line("r11","le"),line("le","wce"),line("wce","east"),line("wcw","wcwa"),line("wcwa","sw"),line("wce","wcea"),line("wcea","se"),line("lw","lw2"),line("lw2","lw1"),line("le","le2"),line("le2","le1"),line("hall","hallSouth"),line("hallSouth","hallEnd"),line("west","westDoor"),line("east","eastDoor")],
    rooms:[
      rect("3810","3810",430,50,165,285,[470,335],"r10"),
      rect("3811","3811",605,50,165,285,[740,335],"r11"),
      rect("3801","3801",110,460,215,270,[110,460],"westDoor"),
      rect("3802","3802",335,460,195,270,[530,505],"hallSouth"),
      rect("3804","3804",670,460,195,270,[670,505],"hallSouth"),
      rect("3805","3805",875,460,215,270,[1090,460],"eastDoor"),
      rect("wc-c3-8-w","WC",40,150,120,180,[160,300],"wcwa","restroom"),
      rect("wc-c3-8-e","WC",1040,150,120,180,[1040,300],"wcea","restroom"),
      rect("lift-c3-8-w1","Л1",270,225,80,50,[350,250],"lw1","lift"),
      rect("lift-c3-8-w2","Л2",270,290,80,50,[350,315],"lw2","lift"),
      rect("lift-c3-8-e1","Л3",850,225,80,50,[850,250],"le1","lift"),
      rect("lift-c3-8-e2","Л4",850,290,80,50,[850,315],"le2","lift"),
      rect("stairs-c3-8-w","Лестница",230,50,180,140,[230,140],"sw","stairs"),
      rect("stairs-c3-8-e","Лестница",790,50,180,140,[970,140],"se","stairs"),
    ],
    connectors:{west:"stairs-c3-8-w",east:"stairs-c3-8-e"},
    captions:[{text:"Холл",point:[600,645]}],
  },
  "c3:1":{
    width:1000,height:760,source:"Схема 1-го этажа · размеры приблизительные",
    outline:[[55,55],[945,55],[945,705],[55,705]],
    corridors:[[[500,660],[500,220]],[[160,430],[840,430]],[[250,430],[250,260]],[[750,430],[750,260]],[[190,580],[500,580]]],
    nodes:{entry:[500,660],south:[500,580],hall:[500,430],north:[500,220],west:[250,430],east:[750,430],lw1:[250,260],lw2:[250,355],le1:[750,260],le2:[750,355],stairs:[190,580],eastStairs:[840,430]},
    edges:[line("entry","south"),line("south","hall"),line("hall","north"),line("hall","west"),line("hall","east"),line("west","lw2"),line("lw2","lw1"),line("east","le2"),line("le2","le1"),line("south","stairs"),line("east","eastStairs")],
    rooms:[
      rect("entrance-c3","Вход в корпус 3",390,655,220,45,[500,655],"south","entrance"),
      rect("wardrobe-c3","Гардероб",330,80,340,140,[500,220],"north","facility"),
      rect("hall-c3","Холл",400,330,200,100,[500,430],"hall","hall"),
      rect("lift-c3-1-w1","Л1",110,230,100,60,[210,260],"lw1","lift"),
      rect("lift-c3-1-w2","Л2",110,325,100,60,[210,355],"lw2","lift"),
      rect("lift-c3-1-e1","Л3",790,230,100,60,[790,260],"le1","lift"),
      rect("lift-c3-1-e2","Л4",790,325,100,60,[790,355],"le2","lift"),
      rect("stairs-c3-1-w","Лестница",70,510,120,100,[190,580],"stairs","stairs"),
    ],
    connectors:{west:"stairs-c3-1-w",entrance:"entrance-c3"},
    captions:[{text:"Из внутреннего двора",point:[500,738]}],
  },
};

// The annotated floor-2 plan is shared by floors 2, 3, 4, 5, 7 and 9.
// Its long northern volume and five southern rooms differ from floors 6/8.
function typicalC3Plan(floor){
  const id=n=>`3${floor}${String(n).padStart(2,"0")}`;
  const equipment=(kind,side)=>`${kind}-c3-${floor}-${side}`;
  const plan={
    width:1200,height:1000,
    source:`По плану эвакуации 2-го этажа корпуса 3${floor===2?"":` · шаблон для ${floor}-го этажа по указанию команды`} · размеры приблизительные`,
    outline:[[35,310],[170,310],[170,225],[200,225],[200,30],[1000,30],[1000,225],[1030,225],[1030,310],[1165,310],[1165,915],[955,915],[660,965],[540,965],[250,925],[35,925]],
    nodes:{west:[65,580],wcw:[200,580],wcwa:[200,480],sw:[200,320],lw:[390,580],lw1:[390,430],lw2:[390,495],r10:[470,580],hall:[600,580],r11:[740,580],le:[810,580],le1:[810,430],le2:[810,495],r05:[930,580],wce:[1000,580],wcea:[1000,480],se:[1000,320],r06:[1100,580],east:[1135,580],hallSouth:[600,710],hallEnd:[600,915],westLower:[100,650],westBend:[100,580],bridgeW:[35,580],bridgeE:[1165,580]},
    edges:[["bridgeW","west"],["west","westBend"],["westBend","wcw"],["wcw","lw"],["lw","r10"],["r10","hall"],["hall","r11"],["r11","le"],["le","r05"],["r05","wce"],["wce","r06"],["r06","east"],["east","bridgeE"],["wcw","wcwa"],["wcwa","sw"],["wce","wcea"],["wcea","se"],["lw","lw2"],["lw2","lw1"],["le","le2"],["le2","le1"],["hall","hallSouth"],["hallSouth","hallEnd"],["westBend","westLower"]],
    corridors:[[[35,580],[1165,580]],[[200,580],[200,275],[230,275]],[[1000,580],[1000,275],[970,275]],[[390,580],[390,430]],[[810,580],[810,430]],[[600,580],[600,915]],[[100,580],[100,690]],[[530,710],[670,710]]],
    rooms:[
      rect(id(10),id(10),430,230,165,285,[470,515],"r10"),
      rect(id(11),id(11),605,230,165,285,[740,515],"r11"),
      rect(id(1),id(1),40,690,225,225,[100,690],"westLower"),
      rect(id(2),id(2),275,640,255,275,[530,710],"hallSouth"),
      rect(id(4),id(4),670,640,170,275,[670,710],"hallSouth"),
      rect(id(5),id(5),850,640,155,275,[930,640],"r05"),
      rect(id(6),id(6),1015,640,145,275,[1100,640],"r06"),
      rect(equipment("wc","w"),"WC",40,330,120,180,[160,480],"wcwa","restroom"),
      rect(equipment("wc","e"),"WC",1040,330,120,180,[1040,480],"wcea","restroom"),
      rect(equipment("lift","w1"),"Л1",270,405,80,50,[350,430],"lw1","lift"),
      rect(equipment("lift","w2"),"Л2",270,470,80,50,[350,495],"lw2","lift"),
      rect(equipment("lift","e1"),"Л3",850,405,80,50,[850,430],"le1","lift"),
      rect(equipment("lift","e2"),"Л4",850,470,80,50,[850,495],"le2","lift"),
      rect(equipment("stairs","w"),"Лестница",230,230,180,140,[230,320],"sw","stairs"),
      rect(equipment("stairs","e"),"Лестница",790,230,180,140,[970,320],"se","stairs"),
    ],
    connectors:{west:equipment("stairs","w"),east:equipment("stairs","e"),bridgeWest:"bridgeW",bridgeEast:"bridgeE"},
    walls:[[[200,225],[430,225]],[[770,225],[1000,225]],[[210,65],[405,225]],[[990,65],[795,225]]],
    windows:[[[205,30],[995,30]],[[275,925],[540,965]],[[660,965],[955,915]]],
    captions:[{text:"Холл",point:[600,840]}],
    passages:floor===2?[{point:[35,580],label:"В корпус 1 · 2 этаж",side:"left"}]:floor===3?[{point:[1165,580],label:"В корпус 2 · 4 этаж",side:"right"}]:floor===4?[{point:[35,580],label:"В корпус 1 · 5 этаж",side:"left"}]:[],
  };
  return plan;
}
for(const floor of [2,3,4,5,7,9])surveyedPlans[`c3:${floor}`]=typicalC3Plan(floor);
const sixth=structuredClone(surveyedPlans["c3:8"]);
const sixthId=id=>/^38\d{2}$/.test(id)?"36"+id.slice(2):id.replace("c3-8-","c3-6-");
sixth.rooms=sixth.rooms.map(room=>({...room,id:sixthId(room.id),label:sixthId(room.label)}));
sixth.connectors=Object.fromEntries(Object.entries(sixth.connectors).map(([key,id])=>[key,sixthId(id)]));
sixth.source="6-й этаж · шаблон 8-го этажа по указанию команды · размеры приблизительные";
surveyedPlans["c3:6"]=sixth;

export function entryPlan(floor){
  const upper=Number(floor)===2;
  return {
    width:1000,height:640,source:"Общий входной блок между корпусами 1 и 2 · схема",
    outline:[[50,75],[950,75],[950,550],[600,550],[600,610],[400,610],[400,550],[50,550]],
    corridors:[[[130,330],[870,330]],[[500,150],[500,560]]],
    nodes:{west:[130,330],hall:[500,330],east:[870,330],entrance:[500,560],courtyard:[500,150],food:[690,330],stairAccess:[350,330]},
    edges:[line("west","stairAccess"),line("stairAccess","hall"),line("hall","food"),line("food","east"),line("hall","entrance"),line("hall","courtyard")],
    rooms:upper?[
      rect("canteen","Столовая",580,90,300,180,[690,270],"food","food"),
      rect("stairs-entry-2","Лестница",280,380,140,100,[350,380],"stairAccess","stairs"),
    ]:[
      rect("main-entrance","Главный вход",405,520,190,85,[500,520],"hall","entrance"),
      rect("buffet","Буфет",580,90,300,180,[690,270],"food","food"),
      rect("stairs-entry-1","Лестница",280,380,140,100,[350,380],"stairAccess","stairs"),
    ],
    connectors:{west:`stairs-entry-${upper?2:1}`,entrance:"entrance",courtyard:"courtyard",toC1:"east",toC2:"west"},
    captions:[{text:upper?"Столовая · над главным входом":"Во внутренний двор → корпус 3",point:[500,65]},{text:"Корпус 2",point:[130,410]},{text:"Корпус 1",point:[870,410]}],
  };
}

export function genericPlan(buildingId,floor,locations){
  // Reserve canonical room slots first; facilities receive distinct free slots.
  const slots=new Map(); const used=new Set();
  const sorted=[...locations].sort((a,b)=>a.id.localeCompare(b.id,"ru",{numeric:true}));
  for(const location of sorted){
    if(!/^\d{4}$/.test(location.id)) continue;
    const suffix=Number(location.id)%100;
    const slot=suffix-(buildingId==="c2"?18:2);
    if(slot>=0&&slot<16&&!used.has(slot)){slots.set(location.id,slot);used.add(slot);}
  }
  for(const location of sorted){
    if(slots.has(location.id)) continue;
    let slot=0;while(used.has(slot))slot++;
    slots.set(location.id,slot);used.add(slot);
  }
  const columns=Math.max(8,Math.ceil((Math.max(0,...used)+1)/2));
  const width=columns*180+240;
  const plan={width,height:780,source:"Схематичный план · положение дверей требует сверки",rooms:[],nodes:{west:[75,390],east:[width-75,390]},edges:[],corridors:[[[75,390],[width-75,390]]],connectors:{west:"west",east:"east"},captions:[]};
  const corridorNodes=[];
  for(let col=0;col<columns;col++){
    const x=120+col*180+82;const key=`corridor-${col}`;
    plan.nodes[key]=[x,390];corridorNodes.push(key);
  }
  const chain=["west",...corridorNodes,"east"];
  for(let i=1;i<chain.length;i++)plan.edges.push([chain[i-1],chain[i]]);
  for(const location of sorted){
    const slot=slots.get(location.id),row=Math.floor(slot/columns),base=slot%columns;
    const col=buildingId==="c2"?columns-1-base:base;
    const x=120+col*180,y=row===0?95:455;
    plan.rooms.push(rect(location.id,location.mapLabel??location.id,x,y,164,230,[x+82,row===0?325:455],`corridor-${col}`,location.type));
  }
  plan.decorations=[{type:"stairs",rect:[25,330,70,120]},{type:"stairs",rect:[width-95,330,70,120]}];
  return plan;
}

export function legacyPlan(locations){
  const nodes={west:[550,555],a:[760,555],b:[1030,555],c:[1280,555],east:[1470,545]};
  return {width:2000,height:900,source:"По плану 5-го этажа корпуса 1 · размеры приблизительные",image:"assets/floor-5-map.svg",imageOffset:-62,
    nodes,edges:[["west","a"],["a","b"],["b","c"],["c","east"]],connectors:{west:"west",east:"east"},corridors:[],
    rooms:locations.filter(l=>l.point&&l.door).map(l=>({...l,label:l.id,rect:[l.label[0]-85,l.label[1]-75,170,125],access:Object.keys(nodes).sort((a,b)=>Math.hypot(...nodes[a].map((v,i)=>v-l.door[i]))-Math.hypot(...nodes[b].map((v,i)=>v-l.door[i])))[0]})),captions:[]};
}
