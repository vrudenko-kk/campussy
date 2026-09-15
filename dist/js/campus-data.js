import { surveyedPlans, entryPlan, genericPlan, legacyPlan } from "./floor-plans.js";

export const campus = {
  id: "veshnyakovsky-4",
  name: "Кампус на Вешняковском",
  address: "Москва, 4-й Вешняковский проезд, 4",
  center: [37.79561, 55.71812],
  checkpoint: [37.7951911, 55.7187065],
  sources: {
    outdoor: "© OpenStreetMap contributors, ODbL",
    indoor: "fin-university-map.framer.website",
  },
};

export const buildingGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "c1", name: "Корпус 1", levels: 5, height: 17, color: "#246bce", osmId: "129710008" },
      geometry: { type: "Polygon", coordinates: [[
        [37.7951906,55.7178406],[37.7952527,55.7179883],[37.7951534,55.7180016],[37.7952913,55.7183296],
        [37.7953907,55.7183163],[37.7954174,55.7183797],[37.7954531,55.7184645],[37.7952504,55.7184915],
        [37.7952015,55.7183751],[37.7950886,55.7183901],[37.7949229,55.7179961],[37.7950302,55.7179818],
        [37.7949825,55.7178684],[37.7951906,55.7178406]
      ]] },
    },
    {
      type: "Feature",
      properties: { id: "c2", name: "Корпус 2", levels: 5, height: 17, color: "#2e82e6", osmId: "129710007" },
      geometry: { type: "Polygon", coordinates: [[
        [37.7960531,55.7183833],[37.7960202,55.7183052],[37.7959908,55.7182354],[37.7960924,55.7182218],
        [37.7959516,55.7178870],[37.7958456,55.7179012],[37.7957867,55.7177611],[37.7960034,55.7177322],
        [37.7960501,55.7178432],[37.7961500,55.7178299],[37.7963172,55.7182275],[37.7962133,55.7182414],
        [37.7962613,55.7183555],[37.7960531,55.7183833]
      ]] },
    },
    {
      type: "Feature",
      properties: { id: "c3", name: "Корпус 3", levels: 9, height: 30, color: "#1357b1", osmId: "129710011" },
      geometry: { type: "Polygon", coordinates: [[
        [37.7958456,55.7179012],[37.7958670,55.7179521],[37.7953437,55.7180219],[37.7953318,55.7179938],
        [37.7952591,55.7180035],[37.7952527,55.7179883],[37.7951906,55.7178406],[37.7957867,55.7177611],
        [37.7958456,55.7179012]
      ]] },
    },
    {
      type: "Feature",
      properties: { id: "entry", name: "Главный вход", levels: 2, height: 7, color: "#66a6ef", osmId: "129710009", interactive: true },
      geometry: { type: "Polygon", coordinates: [[
        [37.7955532,55.7182947],[37.7953907,55.7183163],[37.7954174,55.7183797],[37.7955798,55.7183580],
        [37.7955980,55.7184012],[37.7958823,55.7183633],[37.7958665,55.7183258],[37.7960202,55.7183052],
        [37.7959908,55.7182354],[37.7958371,55.7182559],[37.7958289,55.7182364],[37.7955447,55.7182743],
        [37.7955532,55.7182947]
      ]] },
    },
    {
      type: "Feature",
      properties: { id: "checkpoint-building", name: "КПП", levels: 1, height: 4, color: "#071d38", osmId: "1176935279", interactive: false },
      geometry: { type: "Polygon", coordinates: [[
        [37.7951210,55.7187570],[37.7952931,55.7187348],[37.7952610,55.7186559],
        [37.7950890,55.7186780],[37.7951210,55.7187570]
      ]] },
    },
  ],
};

export const buildings = [
  { id: "c1", name: "Корпус 1", short: "1", floors: [1,2,3,4,5], defaultFloor:1, entrance: "Главный вход со стороны 4-го Вешняковского проезда" },
  { id: "c2", name: "Корпус 2", short: "2", floors: [1,2,3,4,5], defaultFloor:1, entrance: "Вход через внутренний двор или переход" },
  { id: "c3", name: "Корпус 3", short: "3", floors: [1,2,3,4,5,6,7,8,9], defaultFloor:1, entrance: "Вход через внутренний двор на 1-й этаж" },
];

export const entranceBlock = { id:"entry", name:"Главный вход", short:"Вход", floors:[1,2], defaultFloor:1, entrance:"Общий блок между корпусами 1 и 2" };
export const floorAreas=[...buildings,entranceBlock];

export const transitions = [
  {
    id:"c1-c3-cofix", name:"Переход через Coffix", short:"Coffix",
    from:{buildingId:"c1",floor:2}, to:{buildingId:"c3",floor:2}, cost:7,
  },
  {
    id:"c2-c3-bridge", name:"Переход между корпусами 2 и 3", short:"Межкорпусной переход",
    from:{buildingId:"c2",floor:4}, to:{buildingId:"c3",floor:3}, cost:8,
  },
];

const explicit = [
  ["1117","Студенческий офис","c1",1,"service","Сведения университета"],
  ["1201","Декан","c1",2,"service","Сведения университета"],
  ["1213","Деканат","c1",2,"service","Сведения университета"],
  ["1214","Первый заместитель декана","c1",2,"service","Сведения университета"],
  ["1305","Аудитория 1305","c1",3,"room","Кафедра ИБ"],
  ["1306","Аудитория 1306","c1",3,"room","Кафедра БИ"],
  ["1313","Аудитория 1313","c1",3,"room","Кафедра БИ"],
  ["1314","Аудитория 1314","c1",3,"room","Кафедра АДиМО"],
  ["1315","Аудитория 1315","c1",3,"room","Кафедра АДиМО"],
  ["1407","Аудитория 1407","c1",4,"room","Кафедра ИБ"],
  ["1408","Аудитория 1408","c1",4,"room","Кафедра ИБ"],
  ["1502","Аудитория 1502","c1",5,"room","Оцифровано по эскизу"],
  ["1503","Аудитория 1503","c1",5,"room","Оцифровано по эскизу"],
  ["1504","Аудитория 1504","c1",5,"room","Оцифровано по эскизу"],
  ["1512","Аудитория 1512","c1",5,"room","Оцифровано по эскизу"],
  ["1513","Аудитория 1513","c1",5,"room","Оцифровано по эскизу"],
  ["1514","Аудитория 1514","c1",5,"room","Оцифровано по эскизу"],
  ["1515","Аудитория 1515","c1",5,"room","Оцифровано по эскизу"],
  ["1517","Кабинет психолога","c1",5,"service","Расположение на этаже уточняется"],
  ["2116","Большой коворкинг","c2",1,"service","Сведения университета"],
  ["2121","Малый коворкинг","c2",1,"service","Сведения университета"],
  ["2132","Медиатека","c2",1,"service","Сведения университета"],
  ["3205","Цифровая кафедра Альфа-Банка","c3",2,"service","Сведения университета"],
];

const roomRanges = [
  ["c1",2,1202,1217],["c1",3,1302,1317],["c1",4,1402,1417],["c1",5,1502,1517],
  ["c2",1,2118,2133],["c2",2,2218,2233],["c2",3,2318,2333],["c2",4,2418,2433],["c2",5,2518,2533],
  ["c3",2,3202,3212],["c3",3,3302,3311],["c3",4,3402,3411],["c3",5,3502,3511],
  ["c3",6,3602,3611],["c3",7,3702,3711],["c3",8,3802,3811],["c3",9,3902,3911],
];

const generatedRooms = roomRanges.flatMap(([buildingId,floor,start,end]) =>
  Array.from({length:end-start+1},(_,index) => {
    const number = String(start+index);
    return [number,`Аудитория ${number}`,buildingId,floor,"room","Диапазон аудиторий с карты университета"];
  })
);

const coordinateOverrides = {
  "1502": { point:[1660,390], door:[1470,545], label:[1660,385] },
  "1503": { point:[745,710], door:[760,555], label:[745,715] },
  "1504": { point:[1315,710], door:[1280,555], label:[1315,715] },
  "1512": { point:[270,590], door:[550,555], label:[270,590] },
  "1513": { point:[270,365], door:[550,555], label:[270,365] },
  "1514": { point:[800,410], door:[760,555], label:[800,410] },
  "1515": { point:[1160,410], door:[1030,555], label:[1160,410] },
};

const planLocations=Object.entries(surveyedPlans).flatMap(([key,plan])=>{
  const [buildingId,floor]=key.split(":");
  return plan.rooms.map(room=>[room.id,room.type==="room"?"Аудитория "+room.id:room.type==="lift"?"Лифт "+room.label.slice(1)+" · "+floor+"-й этаж":room.type==="restroom"?"Туалет · "+(room.id.endsWith("w")?"левое":"правое")+" крыло · "+floor+"-й этаж":room.label,buildingId,Number(floor),room.type,plan.source]);
});

export const locations = [...explicit,...planLocations,...generatedRooms]
  .filter((item,index,all) => all.findIndex(candidate => candidate[0] === item[0]) === index)
  .map(([id,name,buildingId,floor,type,note]) => ({
    id,name,buildingId,floor,type,note,
    verified: note !== "Расположение на этаже уточняется" && !(buildingId==="c1" && floor===5 && !coordinateOverrides[id]) && !(buildingId==="c3" && floor===8 && !surveyedPlans["c3:8"].rooms.some(room=>room.id===id)),
    ...coordinateOverrides[id],
  }));

export const sharedFacilities = [
  { id:"checkpoint", name:"КПП · Проходная", aliases:"кпп проходная контроль пропускной пункт", type:"checkpoint", buildingId:null, floor:null, graphNode:"checkpoint", zone:"Территория кампуса · у 4-го Вешняковского проезда", note:"Отдельное здание проходной рядом с въездом в кампус", verified:true, mapLabel:"КПП" },
  { id:"main-entrance",name:"Главный вход",aliases:"центральный вход вход в здание",type:"entrance",buildingId:"entry",floor:1,verified:true,note:"Общий блок между корпусами 1 и 2. К корпусу 3 пройдите прямо через внутренний двор." },
  { id:"courtyard",name:"Внутренний двор",type:"outdoor",buildingId:null,floor:null,graphNode:"courtyard",zone:"Между главным входом и корпусом 3",verified:true },
  { id:"atm", name:"Банкоматы", type:"facility", floor:1, zone:"Общий блок 1–2 этажей", verified:false },
  { id:"buffet", name:"Буфет у главного входа", aliases:"буфет", type:"food", buildingId:"entry", floor:1, zone:"Главный вход · 1-й этаж", note:"На 1-м этаже общего входного блока", verified:true, mapLabel:"БФ" },
  { id:"cofix", name:"Coffix", aliases:"кофикс кофейня coffee fix cofix", type:"food", buildingId:"c1", floor:2, zone:"Переход корпусов 1 и 3", note:"У перехода из корпуса 1 в корпус 3", verified:true, mapLabel:"Coffix" },
  { id:"canteen", name:"Столовая", type:"food", buildingId:"entry", floor:2, zone:"Главный вход · 2-й этаж", note:"От главного входа поднимитесь на 2-й этаж", verified:true, mapLabel:"СТ" },
  { id:"library", name:"Библиотека", aliases:"медиатека", type:"service", buildingId:"c2", floor:1, zone:"Корпус 2 · 1-й этаж", note:"1-й этаж корпуса 2", verified:true, mapLabel:"Б" },
  { id:"wardrobe", name:"Гардеробы", type:"facility", floor:1, zone:"Общий блок 1–2 этажей", verified:false },
  { id:"gym", name:"Спортивный зал", aliases:"спортзал", type:"facility", buildingId:"c1", floor:1, zone:"Корпус 1 · 1-й этаж", note:"1-й этаж корпуса 1", verified:true, mapLabel:"СП" },
  { id:"medical", name:"Медпункт", type:"service", floor:1, zone:"Общий блок 1–2 этажей", verified:false },
  { id:"restroom", name:"Санузлы", type:"restroom", floor:null, zone:"Расположение требует уточнения", verified:false },
];

export const allSearchable = [...locations,...sharedFacilities];

export function buildingById(id) { return floorAreas.find(building => building.id === id); }
export function locationsOnFloor(buildingId,floor) {
  return [...locations,...sharedFacilities].filter(location => location.buildingId === buildingId && location.floor === Number(floor));
}
export function locationById(id) { return allSearchable.find(location => location.id === id); }

const planCache=new Map();
export function getFloorPlan(buildingId,floor) {
  const key=buildingId+":"+Number(floor);
  if(!planCache.has(key)){
    const rooms=locationsOnFloor(buildingId,floor);
    const plan=surveyedPlans[key]??(buildingId==="entry"?entryPlan(floor):buildingId==="c1"&&Number(floor)===5?legacyPlan(rooms):genericPlan(buildingId,floor,rooms));
    planCache.set(key,plan);
  }
  return planCache.get(key);
}
export function floorGeometryFor(location) {
  if(!location?.buildingId) return null;
  return getFloorPlan(location.buildingId,location.floor).rooms.find(room=>room.id===location.id)??null;
}
