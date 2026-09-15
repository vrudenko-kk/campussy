import { surveyedPlans, entryPlan, genericPlan } from "./floor-plans.js?v=a56ba11e977f";
import { wingPlans } from "./wing-plans.js?v=a56ba11e977f";
import { wingDirectory, directoryById } from "./wing-directory.js?v=a56ba11e977f";

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
  {
    id:"c1-c3-upper",name:"Переход в корпус 1",short:"Межкорпусной переход",
    from:{buildingId:"c1",floor:5},to:{buildingId:"c3",floor:4},cost:8,
  },
];

const explicit = [
  ["3205","Цифровая кафедра Альфа-Банка","c3",2,"service","Сведения университета"],
];

const roomRanges = [
  ["c3",2,3202,3212],["c3",3,3302,3311],["c3",4,3402,3411],["c3",5,3502,3511],
  ["c3",6,3602,3611],["c3",7,3702,3711],["c3",8,3802,3811],["c3",9,3902,3911],
];

const generatedRooms = roomRanges.flatMap(([buildingId,floor,start,end]) =>
  Array.from({length:end-start+1},(_,index) => {
    const number = String(start+index);
    return [number,`Аудитория ${number}`,buildingId,floor,"room","Диапазон аудиторий с карты университета"];
  })
);

const planLocations=Object.entries(surveyedPlans).flatMap(([key,plan])=>{
  const [buildingId,floor]=key.split(":");
  return plan.rooms.map(room=>[room.id,room.type==="room"?"Аудитория "+room.id:room.type==="lift"?"Лифт "+room.label.slice(1)+" · "+floor+"-й этаж":room.type==="restroom"?"Туалет · "+(room.id.endsWith("w")?"левое":"правое")+" крыло · "+floor+"-й этаж":room.label,buildingId,Number(floor),room.type,plan.source]);
});

const otherLocations = [...explicit,...planLocations,...generatedRooms].filter(item=>item[2]==="c3")
  .filter((item,index,all) => all.findIndex(candidate => candidate[0] === item[0]) === index)
  .map(([id,name,buildingId,floor,type,note]) => ({
    id,name,buildingId,floor,type,note,
    verified: Boolean(surveyedPlans[`${buildingId}:${floor}`]?.rooms.some(room=>room.id===id)),
  }));

const wingRoomIndex=new Map(Object.values(wingPlans).flatMap(plan=>plan.rooms.map(room=>[room.id,room])));
const wingLocations=Object.entries(wingPlans).flatMap(([key,plan])=>{
  const [buildingId,floor]=key.split(":");
  return plan.rooms.filter(room=>room.id!=="cofix").map(room=>{
    const board=directoryById.get(room.id);
    if(board)room.type=board.type;
    return {
      id:room.id,name:board?.name??(room.number?"Аудитория "+room.id:room.type==="room"?"Помещение "+room.label+" на плане":room.label+" · "+(room.point[0]<plan.width/2?"левая сторона":"правая сторона")),
      buildingId,floor:Number(floor),type:board?.type??room.type,verified:true,
      aliases:board?.purpose??"",purpose:board?.purpose,
      positionBasis:room.positionBasis,
      note:(board?board.purpose+". ":"")+(room.number?(buildingId==="c2"?"Зеркальная привязка по вашему эскизу корпуса 1 и правилу нумерации +16. Требует очной сверки.":"Привязка по вашему эскизу 5-го этажа; на других этажах перенесены совпадающие участки. Требует очной сверки."):"Контур и проход по плану. Обозначение "+room.label+" — метка на схеме, не номер кабинета."),
    };
  });
});
const unmappedDirectory=wingDirectory.filter(entry=>!wingRoomIndex.has(entry.id)).map(entry=>({...entry,verified:false,positionBasis:"unmapped",note:entry.purpose+". Номер и назначение подтверждены стендом; положение двери на плане ещё не подписано."}));
export const locations=[...otherLocations,...wingLocations,...unmappedDirectory];

export const sharedFacilities = [
  { id:"metro",name:"Метро Рязанский проспект",aliases:"метро рязанский проспект от метро до метро",type:"metro",buildingId:null,floor:null,graphNode:"metro",zone:"Выход № 1 · пешком к кампусу",verified:true,note:"Пешеходный маршрут до КПП по данным карт." },
  { id:"entrance-c1",name:"Вход через корпус 1",aliases:"вход корпус 1 дополнительный вход",type:"entrance",buildingId:"c1",floor:1,graphNode:"c1:1:c1-1-exit-w",verified:true,note:"Дополнительный вход на 1-й этаж корпуса 1." },
  ...[1,2].map(floor=>({id:`stairs-entry-${floor}`,name:`Лестница главного входа · ${floor} этаж`,type:"stairs",buildingId:"entry",floor,verified:true})),
  { id:"checkpoint", name:"КПП · Проходная", aliases:"кпп проходная контроль пропускной пункт", type:"checkpoint", buildingId:null, floor:null, graphNode:"checkpoint", zone:"Территория кампуса · у 4-го Вешняковского проезда", note:"Отдельное здание проходной рядом с въездом в кампус", verified:true, mapLabel:"КПП" },
  { id:"main-entrance",name:"Главный вход",aliases:"центральный вход вход в здание",type:"entrance",buildingId:"entry",floor:1,verified:true,note:"Сразу направо — корпус 1, налево — корпус 2. Прямо через внутренний двор — корпус 3." },
  { id:"courtyard",name:"Внутренний двор",type:"outdoor",buildingId:null,floor:null,graphNode:"courtyard",zone:"Между главным входом и корпусом 3",verified:true },
  { id:"atm", name:"Банкоматы", type:"facility", floor:1, zone:"Общий блок 1–2 этажей", verified:false },
  { id:"buffet", name:"Буфет у главного входа", aliases:"буфет", type:"food", buildingId:"entry", floor:1, zone:"Главный вход · 1-й этаж", note:"На 1-м этаже общего входного блока", verified:true, mapLabel:"БФ" },
  { id:"cofix", name:"Coffix", aliases:"кофикс кофейня coffee fix cofix", type:"food", buildingId:"c1", floor:2, zone:"Переход корпусов 1 и 3", note:"У перехода из корпуса 1 в корпус 3", verified:true, mapLabel:"Coffix" },
  { id:"canteen", name:"Столовая", type:"food", buildingId:"entry", floor:2, zone:"Главный вход · 2-й этаж", note:"От главного входа поднимитесь на 2-й этаж", verified:true, mapLabel:"СТ" },
  { id:"library", name:"Библиотека", aliases:"медиатека", type:"service", buildingId:"c2", floor:1, zone:"Корпус 2 · 1-й этаж", note:"Библиотека: помещения 2129 и 2132 по стенду корпуса 2. Точная привязка дверей ожидает разметки.", relatedIds:["2129","2132"], verified:false, mapLabel:"Б" },
  { id:"wardrobe", name:"Гардеробы", type:"facility", floor:1, zone:"Общий блок 1–2 этажей", verified:false },
  { id:"gym", name:"Спортивный зал", aliases:"спортзал", type:"facility", buildingId:"c1", floor:1, zone:"Корпус 1 · 1-й этаж", note:"Спортивные помещения 1107, 1100, 1101 и 1102 по стенду корпуса 1.", relatedIds:["1107","1100","1101","1102"], verified:false, mapLabel:"СП" },
  { id:"medical", name:"Медицинский кабинет", type:"service", buildingId:"c1", floor:1, relatedIds:["1106"], note:"Медицинский кабинет 1106 по стенду корпуса 1.", verified:false },
  { id:"restroom", name:"Санузлы", type:"restroom", floor:null, zone:"Расположение требует уточнения", verified:false },
];

export const allSearchable = [...locations,...sharedFacilities];
const locationsById=new Map(allSearchable.map(location=>[location.id,location]));
const areasById=new Map(floorAreas.map(area=>[area.id,area]));

export function buildingById(id) { return areasById.get(id); }
export function locationsOnFloor(buildingId,floor) {
  return allSearchable.filter(location => location.buildingId === buildingId && location.floor === Number(floor));
}
export function locationById(id) { return locationsById.get(id); }

const planCache=new Map();
export function getFloorPlan(buildingId,floor) {
  const key=buildingId+":"+Number(floor);
  if(!planCache.has(key)){
    const rooms=locationsOnFloor(buildingId,floor);
    const plan=wingPlans[key]??surveyedPlans[key]??(buildingId==="entry"?entryPlan(floor):genericPlan(buildingId,floor,rooms));
    planCache.set(key,plan);
  }
  return planCache.get(key);
}
export function floorGeometryFor(location) {
  if(!location?.buildingId) return null;
  return getFloorPlan(location.buildingId,location.floor).rooms.find(room=>room.id===location.id)??null;
}
