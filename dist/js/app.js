import { allSearchable, buildings, buildingById, campus, locationById, locations, locationsOnFloor, sharedFacilities, transitions } from "./campus-data.js";
import { createCampusMap } from "./campus-map.js";
import { renderFloorMap } from "./floor-map.js";
import { buildRoute } from "./router.js";

const state = {
  view:"campus",
  buildingId:"c1",
  floor:5,
  destination:null,
  origin:null,
  route:null,
  mapController:null,
};

const $ = selector => document.querySelector(selector);
const campusView=$("#campus-view");
const floorView=$("#floor-view");
const search=$("#global-search");
const searchResults=$("#search-results");
const buildingPanel=$("#building-panel");
const floorSvg=$("#floor-map");
const routeSheet=$("#route-sheet");
const originInput=$("#origin-input");
const originResults=$("#origin-results");
const originError=$("#origin-error");
const routeSteps=$("#route-steps");
const routeJourney=$("#route-journey");
const journeyCards=$("#journey-cards");
const journeySteps=$("#journey-steps");

const entrances = buildings.map(building => ({
  id:`entrance-${building.id}`,name:building.id==="c3"?"Центральный вход":`Главный вход · ${building.name}`,buildingId:building.id,floor:1,type:"entrance",verified:true,
}));
const originLocations=[...entrances,...locations,...sharedFacilities.filter(location=>location.buildingId)];

function metaFor(location) {
  if (location.buildingId) return `${buildingById(location.buildingId).name} · ${location.floor}-й этаж`;
  return location.zone ?? "Общий объект кампуса";
}

function normalize(value) {
  return value.toLocaleLowerCase("ru-RU").replaceAll("ё","е").trim();
}

function matches(query,location) {
  const haystack=normalize(`${location.id} ${location.name} ${location.aliases ?? ""} ${location.note ?? ""} ${location.zone ?? ""}`);
  return haystack.includes(normalize(query));
}

function stageWord(count) {
  const lastTwo=count%100; const last=count%10;
  if (lastTwo>=11 && lastTwo<=14) return "этапов";
  if (last===1) return "этап";
  if (last>=2 && last<=4) return "этапа";
  return "этапов";
}

function renderSearchResults(query) {
  searchResults.replaceChildren();
  if (!query.trim()) { searchResults.hidden=true; return; }
  const results=allSearchable.filter(location=>matches(query,location)).slice(0,9);
  if (!results.length) {
    const empty=document.createElement("div"); empty.className="search-empty"; empty.textContent="Ничего не найдено. Попробуйте номер аудитории или название объекта.";
    searchResults.append(empty); searchResults.hidden=false; return;
  }
  results.forEach(location=>{
    const button=document.createElement("button"); button.type="button"; button.className="search-result";
    const title=document.createElement("strong"); title.textContent=location.name;
    const meta=document.createElement("span"); meta.textContent=metaFor(location);
    button.append(title,meta); button.addEventListener("click",()=>selectDestination(location)); searchResults.append(button);
  });
  searchResults.hidden=false;
}

function selectBuilding(buildingId) {
  state.buildingId=buildingId;
  state.mapController?.select(buildingId);
  renderBuildingPanel();
}

function renderBuildingPanel() {
  const building=buildingById(state.buildingId);
  buildingPanel.replaceChildren();
  const eyebrow=document.createElement("p"); eyebrow.className="eyebrow"; eyebrow.textContent="Выбранный корпус";
  const heading=document.createElement("h2"); heading.textContent=building.name;
  const note=document.createElement("p"); note.className="panel-note"; note.textContent=`${building.floors.length} этажей · ${building.entrance}`;
  const buildingTransitions=transitions.filter(transition=>transition.from.buildingId===building.id || transition.to.buildingId===building.id);
  const connections=document.createElement("div"); connections.className="connection-list";
  buildingTransitions.forEach(transition=>{
    const fromHere=transition.from.buildingId===building.id; const local=fromHere?transition.from:transition.to; const remote=fromHere?transition.to:transition.from;
    const item=document.createElement("span"); item.innerHTML=`<b>↔</b><span>${local.floor}-й этаж → ${buildingById(remote.buildingId).name}, ${remote.floor}-й этаж<small>${transition.short}</small></span>`; connections.append(item);
  });
  const floors=document.createElement("div"); floors.className="floor-grid"; floors.setAttribute("aria-label","Выбор этажа");
  building.floors.forEach(floor=>{
    const button=document.createElement("button"); button.type="button"; button.className="floor-button"; button.textContent=`${floor}`; button.setAttribute("aria-label",`${floor}-й этаж`);
    button.addEventListener("click",()=>openFloor(building.id,floor)); floors.append(button);
  });
  const action=document.createElement("button"); action.type="button"; action.className="button button-primary"; action.textContent=`Открыть ${building.id==="c3"?"2-й":"1-й"} этаж`;
  action.addEventListener("click",()=>openFloor(building.id,building.id==="c3"?2:1));
  buildingPanel.append(eyebrow,heading,note,connections,floors,action);
  document.querySelectorAll(".building-chip").forEach(button=>{
    const active=button.dataset.building===building.id; button.classList.toggle("is-active",active); button.setAttribute("aria-pressed",String(active));
  });
}

function renderFloorControls() {
  const building=buildingById(state.buildingId);
  $("#floor-building-name").textContent=building.name;
  $("#floor-title").textContent=`${state.floor}-й этаж`;
  const buttons=$("#floor-buttons"); buttons.replaceChildren();
  building.floors.forEach(floor=>{
    const button=document.createElement("button"); button.type="button"; button.className=`floor-tab${floor===state.floor?" is-active":""}`; button.textContent=String(floor);
    button.addEventListener("click",()=>openFloor(building.id,floor)); buttons.append(button);
  });
  const list=$("#floor-locations"); list.replaceChildren();
  const floorLocations=locationsOnFloor(building.id,state.floor);
  const visible=[...floorLocations].sort((a,b)=>a.id.localeCompare(b.id,"ru",{numeric:true})).slice(0,20);
  if (!visible.length) {
    const item=document.createElement("p"); item.className="empty-floor"; item.textContent="Для этого этажа пока нет подтверждённых помещений."; list.append(item);
  } else {
    visible.forEach(location=>{
      const button=document.createElement("button"); button.type="button"; button.className="location-row";
      const number=document.createElement("span"); number.className="location-number"; number.textContent=location.mapLabel??location.id;
      const content=document.createElement("span");
      const title=document.createElement("strong"); title.textContent=location.name;
      const meta=document.createElement("small"); meta.textContent=location.note;
      content.append(title,meta); button.append(number,content); button.addEventListener("click",()=>selectDestination(location)); list.append(button);
    });
  }
}

function renderFloor() {
  renderFloorControls();
  renderFloorMap(floorSvg,{buildingId:state.buildingId,floor:state.floor,route:state.route,destinationId:state.destination?.id,originId:state.origin?.id});
}

function openFloor(buildingId,floor) {
  state.view="floor"; state.buildingId=buildingId; state.floor=Number(floor); state.route=null;
  floorView.classList.remove("is-route-mode");
  routeJourney.hidden=true;
  campusView.hidden=true; floorView.hidden=false;
  $("#breadcrumb-current").textContent=`${buildingById(buildingId).name} · ${floor}-й этаж`;
  renderFloor();
  window.scrollTo({top:0,behavior:"smooth"});
}

function showCampus() {
  state.view="campus"; campusView.hidden=false; floorView.hidden=true; state.route=null;
  floorView.classList.remove("is-route-mode");
  routeJourney.hidden=true;
  routeSheet.classList.remove("is-open"); routeSheet.hidden=true; $("#route-result").hidden=true;
  requestAnimationFrame(()=>state.mapController?.resize());
  window.scrollTo({top:0,behavior:"smooth"});
}

function sortedOrigins(destination=state.destination) {
  return [...originLocations].sort((a,b)=>{
    const scoreA=(a.buildingId===destination.buildingId?2:0)+(a.floor===destination.floor?1:0);
    const scoreB=(b.buildingId===destination.buildingId?2:0)+(b.floor===destination.floor?1:0);
    return scoreB-scoreA || a.name.localeCompare(b.name,"ru",{numeric:true});
  });
}

function originMatches(query) {
  const value=normalize(query);
  const candidates=sortedOrigins();
  if (!value) return candidates.slice(0,8);
  return candidates.filter(location=>matches(value,location)).slice(0,8);
}

function setOriginPickerOpen(open) {
  originResults.hidden=!open;
  originInput.setAttribute("aria-expanded",String(open));
}

function selectOrigin(location,{focus=true}={}) {
  state.origin=location;
  originInput.value=location.name;
  originInput.dataset.locationId=location.id;
  originError.hidden=true;
  setOriginPickerOpen(false);
  if (focus) originInput.focus();
}

function renderOriginResults(query=originInput.value) {
  originResults.replaceChildren();
  const results=originMatches(query);
  if (!results.length) {
    const empty=document.createElement("div"); empty.className="origin-empty"; empty.textContent="Точка не найдена. Проверьте номер или название.";
    originResults.append(empty); setOriginPickerOpen(true); return;
  }
  results.forEach(location=>{
    const button=document.createElement("button"); button.type="button"; button.className="origin-result"; button.setAttribute("role","option");
    const title=document.createElement("strong"); title.textContent=location.name;
    const meta=document.createElement("span"); meta.textContent=metaFor(location);
    button.append(title,meta); button.addEventListener("click",()=>selectOrigin(location)); originResults.append(button);
  });
  setOriginPickerOpen(true);
}

function resetOriginPicker() {
  state.origin=null;
  originInput.value="";
  delete originInput.dataset.locationId;
  originError.hidden=true;
  originResults.replaceChildren();
  setOriginPickerOpen(false);
}

function resolveOrigin() {
  const value=normalize(originInput.value);
  if (!value) return null;
  if (state.origin && originInput.dataset.locationId===state.origin.id && normalize(state.origin.name)===value) return state.origin;
  const exact=originLocations.find(location=>normalize(location.id)===value || normalize(location.name)===value);
  if (exact) { selectOrigin(exact,{focus:false}); return exact; }
  const candidates=originMatches(value);
  if (candidates.length===1) { selectOrigin(candidates[0],{focus:false}); return candidates[0]; }
  return null;
}

function selectDestination(location) {
  state.destination=location; state.route=null; state.origin=null;
  search.value=location.name; searchResults.hidden=true;
  $("#destination-name").textContent=location.name;
  $("#destination-meta").textContent=metaFor(location);
  resetOriginPicker();
  floorView.classList.remove("is-route-mode");
  routeSheet.hidden=false; routeSheet.classList.add("is-open");
  $("#route-result").hidden=true;
  routeJourney.hidden=true;
  if (location.buildingId && location.floor) openFloor(location.buildingId,location.floor);
  originInput.focus();
}

function showRouteStage(stage,index) {
  const {buildingId,floor}=stage;
  state.view="floor"; state.buildingId=buildingId; state.floor=Number(floor);
  campusView.hidden=true; floorView.hidden=false;
  $("#breadcrumb-current").textContent=`${buildingById(buildingId).name} · ${floor}-й этаж`;
  renderFloor();
  journeyCards.querySelectorAll(".journey-card").forEach((card,cardIndex)=>{
    const active=cardIndex===index; card.classList.toggle("is-active",active); card.setAttribute("aria-pressed",String(active));
  });
  document.querySelector(".floor-canvas-card")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function renderJourney() {
  journeyCards.replaceChildren(); journeySteps.replaceChildren();
  const stages=state.route?.stages??[];
  if (state.route?.status!=="ready" || !stages.length) { routeJourney.hidden=true; floorView.classList.remove("is-route-mode"); return; }
  floorView.classList.add("is-route-mode");
  $("#journey-meta").textContent=`${stages.length} ${stageWord(stages.length)} · около ${state.route.estimatedMinutes} мин`;
  $("#journey-origin-name").textContent=state.origin.name;
  $("#journey-origin-meta").textContent=metaFor(state.origin);
  $("#journey-destination-name").textContent=state.destination.name;
  $("#journey-destination-meta").textContent=metaFor(state.destination);
  state.route.steps.forEach((step,index)=>{
    const item=document.createElement("li");
    const number=document.createElement("span"); number.className="journey-step-number"; number.setAttribute("aria-hidden","true"); number.textContent=String(index+1);
    const copy=document.createElement("span"); copy.textContent=step;
    item.append(number,copy); journeySteps.append(item);
  });
  stages.forEach((stage,index)=>{
    const card=document.createElement("button"); card.type="button"; card.className=`journey-card is-${stage.kind}${index===0?" is-active":""}`; card.setAttribute("aria-pressed",String(index===0));
    card.addEventListener("click",()=>showRouteStage(stage,index));
    const cardHead=document.createElement("span"); cardHead.className="journey-card-head";
    const step=document.createElement("small"); step.textContent=`Этап ${index+1}`;
    const type=document.createElement("b"); type.textContent=stage.kind==="vertical"?"Смена этажа":stage.kind==="transition"?"Переход между корпусами":"Участок по этажу";
    cardHead.append(step,type);
    const visual=document.createElement("span"); visual.className="stage-visual";
    if (stage.kind==="vertical") {
      visual.innerHTML=`<span class="stage-node"><b>${stage.fromFloor}</b><small>этаж</small></span><i aria-hidden="true">${stage.toFloor>stage.fromFloor?"↑":"↓"}</i><span class="stage-node"><b>${stage.toFloor}</b><small>этаж</small></span>`;
    } else if (stage.kind==="transition") {
      const from=buildingById(stage.fromBuildingId); const to=buildingById(stage.toBuildingId);
      visual.innerHTML=`<span class="stage-node"><b>${from.short}</b><small>${stage.fromFloor} этаж</small></span><i aria-hidden="true">→</i><span class="stage-node"><b>${to.short}</b><small>${stage.toFloor} этаж</small></span>`;
    } else {
      const building=buildingById(stage.buildingId);
      visual.innerHTML=`<span class="stage-node is-wide"><b>${building.short} корпус</b><small>${stage.floor}-й этаж</small></span><i aria-hidden="true">→</i><span class="stage-pin">${stage.role==="finish"?"Б":"A"}</span>`;
    }
    const title=document.createElement("strong"); title.className="journey-card-title"; title.textContent=stage.title;
    const summary=document.createElement("span"); summary.className="journey-card-summary"; summary.textContent=stage.summary;
    const detail=document.createElement("span"); detail.className="journey-card-detail"; detail.textContent=stage.detail??"Нажмите, чтобы открыть план этого участка.";
    const action=document.createElement("span"); action.className="journey-card-action"; action.textContent="Показать на плане →";
    card.append(cardHead,visual,title,summary,detail,action); journeyCards.append(card);
  });
  routeJourney.hidden=false;
}

function renderRouteResult() {
  const result=$("#route-result"); result.hidden=false; routeSteps.replaceChildren();
  state.route.steps.forEach(step=>{ const item=document.createElement("li"); item.textContent=step; routeSteps.append(item); });
  const title=$("#route-result-title");
  title.textContent=state.route.status==="ready"?"Маршрут построен":state.route.status==="same"?"Вы уже на месте":"Нужна проверка данных";
  $("#route-result-meta").textContent=state.route.status==="ready"?`Кратчайший путь · около ${state.route.estimatedMinutes} мин`:"";
  const firstStage=state.route.status==="ready"?state.route.stages?.find(stage=>stage.buildingId&&stage.floor):null;
  const focusedLocation=firstStage??state.destination;
  if (focusedLocation?.buildingId && focusedLocation?.floor) {
    state.view="floor";
    state.buildingId=focusedLocation.buildingId;
    state.floor=Number(focusedLocation.floor);
    campusView.hidden=true;
    floorView.hidden=false;
    $("#breadcrumb-current").textContent=`${buildingById(state.buildingId).name} · ${state.floor}-й этаж`;
    renderFloor();
  }
  renderJourney();
  if (state.route.status==="ready") {
    closeRouteSheet();
    requestAnimationFrame(()=>routeJourney.scrollIntoView({behavior:"smooth",block:"start"}));
  }
}

function buildSelectedRoute() {
  const origin=resolveOrigin();
  if (!origin) {
    originError.hidden=false;
    renderOriginResults();
    originInput.focus();
    return;
  }
  state.origin=origin;
  state.route=buildRoute(origin,state.destination);
  renderRouteResult();
}

function closeRouteSheet() {
  routeSheet.classList.remove("is-open"); routeSheet.hidden=true; setOriginPickerOpen(false);
}

function openRouteEditor() {
  routeSheet.hidden=false;
  requestAnimationFrame(()=>routeSheet.classList.add("is-open"));
  $("#route-result").hidden=true;
  originInput.focus();
}

function renderFallbackMap() {
  const map=$("#campus-map"); map.classList.add("map-fallback");
  map.innerHTML=`<div class="fallback-campus" role="img" aria-label="Схема трёх корпусов кампуса"><button data-building="c1"><b>1</b><span>Корпус 1</span></button><button data-building="c3"><b>3</b><span>Корпус 3</span></button><button data-building="c2"><b>2</b><span>Корпус 2</span></button></div>`;
  map.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>selectBuilding(button.dataset.building)));
}

function registerWebMcp() {
  const context=document.modelContext;
  if (!context?.registerTool) return;
  const register=tool=>Promise.resolve(context.registerTool(tool)).catch(()=>{});
  register({
    name:"search_campus_locations",title:"Найти помещение",
    description:"Найти аудитории и объекты внутри кампуса по номеру или названию.",
    inputSchema:{type:"object",properties:{query:{type:"string",minLength:1}},required:["query"],additionalProperties:false},
    annotations:{readOnlyHint:true,untrustedContentHint:false},
    execute({query}) { if(typeof query!=="string"||!query.trim()) throw new Error("query must be a non-empty string"); return allSearchable.filter(item=>matches(query,item)).slice(0,10).map(item=>({id:item.id,name:item.name,location:metaFor(item)})); },
  });
  register({
    name:"build_indoor_route",title:"Построить маршрут",
    description:"Выбрать начальную и конечную точки и показать маршрут в интерфейсе.",
    inputSchema:{type:"object",properties:{originId:{type:"string"},destinationId:{type:"string"}},required:["originId","destinationId"],additionalProperties:false},
    annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute({originId,destinationId}) {
      const origin=originLocations.find(item=>item.id===originId); const destination=locationById(destinationId);
      if(!origin||!destination) throw new Error("Unknown originId or destinationId");
      state.destination=destination; state.origin=origin; state.route=buildRoute(origin,destination); search.value=destination.name;
      $("#destination-name").textContent=destination.name; $("#destination-meta").textContent=metaFor(destination);
      resetOriginPicker(); selectOrigin(origin,{focus:false});
      routeSheet.hidden=false; routeSheet.classList.add("is-open"); renderRouteResult();
      return {status:state.route.status,kind:state.route.kind??null,estimatedMinutes:state.route.estimatedMinutes??null,steps:state.route.steps,stages:state.route.stages?.map(stage=>({kind:stage.kind,title:stage.title,summary:stage.summary}))??[]};
    },
  });
}

async function init() {
  renderBuildingPanel();
  buildings.forEach(building=>{
    const button=document.createElement("button"); button.type="button"; button.className="building-chip"; button.dataset.building=building.id; button.innerHTML=`<b>${building.short}</b><span>${building.name}<small>${building.floors.length} этажей</small></span>`;
    button.addEventListener("click",()=>selectBuilding(building.id)); $("#building-chips").append(button);
  });
  renderBuildingPanel();
  search.addEventListener("input",()=>renderSearchResults(search.value));
  search.addEventListener("keydown",event=>{ if(event.key==="Escape") searchResults.hidden=true; });
  originInput.addEventListener("input",()=>{
    state.origin=null; state.route=null; delete originInput.dataset.locationId; originError.hidden=true; $("#route-result").hidden=true;
    routeJourney.hidden=true;
    floorView.classList.remove("is-route-mode");
    if (state.view==="floor") renderFloor();
    renderOriginResults();
  });
  originInput.addEventListener("focus",()=>renderOriginResults());
  originInput.addEventListener("keydown",event=>{
    if (event.key==="Escape") { setOriginPickerOpen(false); return; }
    if (event.key==="ArrowDown") { event.preventDefault(); originResults.querySelector("button")?.focus(); return; }
    if (event.key==="Enter") { event.preventDefault(); buildSelectedRoute(); }
  });
  originResults.addEventListener("keydown",event=>{
    const buttons=[...originResults.querySelectorAll("button")]; const index=buttons.indexOf(document.activeElement);
    if (event.key==="ArrowDown") { event.preventDefault(); buttons[(index+1)%buttons.length]?.focus(); }
    if (event.key==="ArrowUp") { event.preventDefault(); (index<=0?originInput:buttons[index-1])?.focus(); }
    if (event.key==="Escape") { setOriginPickerOpen(false); originInput.focus(); }
  });
  document.addEventListener("click",event=>{ if(!event.target.closest(".search-shell")) searchResults.hidden=true; });
  document.addEventListener("click",event=>{ if(!event.target.closest(".origin-combobox")) setOriginPickerOpen(false); });
  $("#back-to-campus").addEventListener("click",showCampus);
  $("#brand-home").addEventListener("click",showCampus);
  $("#route-build").addEventListener("click",buildSelectedRoute);
  $("#route-close").addEventListener("click",closeRouteSheet);
  $("#route-edit").addEventListener("click",openRouteEditor);
  $("#search-clear").addEventListener("click",()=>{ search.value=""; search.focus(); searchResults.hidden=true; });
  document.querySelectorAll("[data-facility]").forEach(button=>button.addEventListener("click",()=>selectDestination(sharedFacilities.find(item=>item.id===button.dataset.facility))));
  try {
    state.mapController=await createCampusMap($("#campus-map"),selectBuilding);
    state.mapController.select(state.buildingId);
  } catch (error) { renderFallbackMap(); }
  registerWebMcp();
}

init();
