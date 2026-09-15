import { allSearchable, buildingById, getFloorPlan, locationById } from "./campus-data.js";
import { createCampusMap } from "./campus-map.js";
import { renderFloorMap } from "./floor-map.js";
import { buildRoute } from "./router.js";

const SEARCH_PLACEHOLDER="Аудитория, столовая, КПП…";
const RECENT_KEY="campussy-recent-searches";
const recommendationIds=["main-entrance","canteen","buffet","checkpoint","cofix","library","gym"];
const recommendationIcons={"main-entrance":"Вход",canteen:"☕",buffet:"🥪",checkpoint:"КПП",cofix:"CF",library:"Б",gym:"СП"};

const state={
  view:"campus",buildingId:"c3",floor:3,destination:null,origin:null,route:null,mapController:null,
  selectedLocation:null,pendingOrigin:null,activeStage:0,buildingOpenTimer:null,zoom:1,
};

const $=selector=>document.querySelector(selector);
const campusView=$("#campus-view");
const floorView=$("#floor-view");
const floorSvg=$("#floor-map");
const floorCanvas=$(".floor-canvas");
const search=$("#global-search");
const searchResults=$("#search-results");
const routeSheet=$("#route-sheet");
const locationSheet=$("#location-sheet");
const sheetBackdrop=$("#sheet-backdrop");
const originInput=$("#origin-input");
const originResults=$("#origin-results");
const originError=$("#origin-error");
const routeSteps=$("#route-steps");
const routeJourney=$("#route-journey");
const routeDetails=$("#route-details");
const journeyCards=$("#journey-cards");
const journeySteps=$("#journey-steps");

const originLocations=allSearchable.filter(location=>location.verified&&(location.buildingId||location.graphNode));

function metaFor(location) {
  if (location.graphNode) return location.zone;
  if (location.buildingId) return `${buildingById(location.buildingId).name} · ${location.floor}-й этаж`;
  return location.zone??"Общий объект кампуса";
}

function normalize(value) {
  return String(value??"").toLocaleLowerCase("ru-RU").replaceAll("ё","е").trim();
}

const searchIndex=new Map(allSearchable.map(location=>[location.id,normalize(`${location.id} ${location.name} ${location.aliases??""} ${location.note??""} ${location.zone??""}`)]));
function matches(query,location) { return searchIndex.get(location.id)?.includes(normalize(query))??false; }

function stageWord(count) {
  const lastTwo=count%100; const last=count%10;
  if (lastTwo>=11&&lastTwo<=14) return "этапов";
  if (last===1) return "этап";
  if (last>=2&&last<=4) return "этапа";
  return "этапов";
}

function readRecentIds() {
  try {
    const parsed=JSON.parse(localStorage.getItem(RECENT_KEY)??"[]");
    return Array.isArray(parsed)?parsed.filter(id=>locationById(id)).slice(0,5):[];
  } catch { return []; }
}

function rememberLocation(location) {
  try {
    const ids=[location.id,...readRecentIds().filter(id=>id!==location.id)].slice(0,5);
    localStorage.setItem(RECENT_KEY,JSON.stringify(ids));
  } catch { /* История поиска необязательна. */ }
}

function createSearchButton(location,{recommended=false}={}) {
  const button=document.createElement("button");
  button.type="button"; button.className=recommended?"recommendation-card":"search-result";
  if (recommended) {
    const icon=document.createElement("span"); icon.className="recommendation-icon"; icon.textContent=recommendationIcons[location.id]??"•";
    const title=document.createElement("strong"); title.textContent=location.id==="checkpoint"?"Проходная":location.name.replace(" · Проходная","");
    button.append(icon,title);
  } else {
    const title=document.createElement("strong"); title.textContent=location.name;
    const meta=document.createElement("span"); meta.textContent=metaFor(location);
    button.append(title,meta);
  }
  button.addEventListener("click",()=>chooseSearchResult(location));
  return button;
}

function appendSearchSection(title,items,{grid=false}={}) {
  if (!items.length) return;
  const section=document.createElement("section"); section.className="search-section";
  const heading=document.createElement("h2"); heading.textContent=title;
  const content=document.createElement("div"); content.className=grid?"recommendation-grid":"search-section-list";
  items.forEach(item=>content.append(createSearchButton(item,{recommended:grid})));
  section.append(heading,content); searchResults.append(section);
}

function renderSearchResults(query=search.value) {
  searchResults.replaceChildren();
  const value=query.trim();
  if (value) {
    const results=allSearchable.filter(location=>matches(value,location)).slice(0,12);
    if (!results.length) {
      const empty=document.createElement("div"); empty.className="search-empty";
      empty.textContent="Ничего не найдено. Проверьте номер аудитории или название объекта.";
      searchResults.append(empty);
    } else appendSearchSection("Результаты",results);
  } else {
    const recommended=recommendationIds.map(locationById).filter(Boolean);
    const recent=readRecentIds().map(locationById).filter(Boolean);
    appendSearchSection("Рекомендации",recommended,{grid:true});
    appendSearchSection(recent.length?"Недавние поиски":"Популярные аудитории",recent.length?recent:[locationById("3303"),locationById("1502"),locationById("2418")].filter(Boolean));
  }
  searchResults.hidden=false;
}

function chooseSearchResult(location) {
  rememberLocation(location);
  searchResults.hidden=true;
  search.value=location.name;
  if (state.pendingOrigin) {
    const origin=state.pendingOrigin; state.pendingOrigin=null; search.placeholder=SEARCH_PLACEHOLDER;
    startRoute(origin,location);
    return;
  }
  openLocationActions(location,{navigate:!!location.buildingId});
}

function selectBuilding(buildingId) {
  window.clearTimeout(state.buildingOpenTimer);
  state.buildingId=buildingId;
  state.mapController?.select(buildingId);
  const building=buildingById(buildingId);
  $("#map-orientation-label").textContent=`${building.name} · ориентация по схеме этажа`;
  state.buildingOpenTimer=window.setTimeout(()=>openFloor(buildingId,building.defaultFloor),430);
}

function updateFloorHeading() {
  const activeStage=state.route?.stages?.[state.activeStage];
  if (activeStage?.kind==="outdoor") {
    $("#floor-building-name").textContent="Территория кампуса";
    $("#floor-title").textContent=activeStage.summary;
    return;
  }
  const building=buildingById(state.buildingId);
  $("#floor-building-name").textContent=building.name;
  $("#floor-title").textContent=`${state.floor}-й этаж`;
}

function renderFloorControls() {
  const building=buildingById(state.buildingId); updateFloorHeading();
  const buttons=$("#floor-buttons"); buttons.replaceChildren();
  const activeStage=state.route?.stages?.[state.activeStage];
  buttons.hidden=activeStage?.kind==="outdoor";
  if (activeStage?.kind==="outdoor") return;
  building.floors.forEach(floor=>{
    const button=document.createElement("button"); button.type="button";
    button.className=`floor-tab${floor===state.floor?" is-active":""}`; button.textContent=String(floor);
    button.setAttribute("aria-label",`${floor}-й этаж`); button.setAttribute("aria-pressed",String(floor===state.floor));
    button.addEventListener("click",()=>{
      const stageIndex=state.route?.stages?.findIndex(stage=>stage.buildingId===building.id&&Number(stage.floor)===floor)??-1;
      if (stageIndex>=0) showRouteStage(state.route.stages[stageIndex],stageIndex);
      else openFloor(building.id,floor);
    });
    buttons.append(button);
  });
}

function renderFloor({center=true}={}) {
  const activeStage=state.route?.stages?.[state.activeStage];
  renderFloorControls();
  $("#floor-map-title").textContent=activeStage?.title??"План этажа";
  $("#plan-source").textContent=activeStage?.kind==="outdoor"?"Схема пути: КПП → главный вход → внутренний двор → корпус 3":getFloorPlan(state.buildingId,state.floor).source;
  $("#floor-map-subtitle").textContent=activeStage?.kind==="outdoor"?"Главный вход — отдельный общий блок":"Нажмите на помещение · + для увеличения";
  renderFloorMap(floorSvg,{
    buildingId:state.buildingId,floor:state.floor,route:state.route,destinationId:state.destination?.id,
    originId:state.origin?.id,onLocationClick:location=>openLocationActions(location,{navigate:false}),stage:activeStage,
  });
  if (center) setMapZoom(1);
}

function setMapZoom(value) {
  state.zoom=Math.max(1,Math.min(3,value));
  floorCanvas.classList.toggle("is-zoomed",state.zoom>1);
  floorSvg.style.width=(state.zoom*100)+"%";
  $("#map-zoom-out").disabled=state.zoom===1;
  $("#map-zoom-in").disabled=state.zoom===3;
  if(state.zoom===1){floorCanvas.scrollLeft=0;floorCanvas.scrollTop=0;}
}

function clearRoute() {
  state.route=null;state.activeStage=0;routeJourney.hidden=true;
  document.body.classList.remove("route-active"); $("#route-dock").hidden=true;routeDetails.close();
  $("#next-step-card").hidden=true;floorView.classList.remove("is-route-mode");
}

function openFloor(buildingId,floor,{keepRoute=false}={}) {
  window.clearTimeout(state.buildingOpenTimer);
  state.view="floor"; state.buildingId=buildingId; state.floor=Number(floor);
  if (!keepRoute) {
    clearRoute();
  }
  campusView.hidden=true; floorView.hidden=false; renderFloor();
  window.scrollTo({top:0,behavior:"smooth"});
}

function showCampus() {
  window.clearTimeout(state.buildingOpenTimer);
  state.view="campus"; state.buildingId="c3"; state.floor=1;clearRoute();state.pendingOrigin=null;search.placeholder=SEARCH_PLACEHOLDER;
  campusView.hidden=false; floorView.hidden=true; floorView.classList.remove("is-route-mode"); routeJourney.hidden=true;
  closeRouteSheet(); closeLocationSheet();
  $("#map-orientation-label").textContent="Вид на корпус 3 · направление на юг";
  requestAnimationFrame(()=>{ state.mapController?.resize(); state.mapController?.overview(); });
  window.scrollTo({top:0,behavior:"smooth"});
}

function sortedOrigins(destination=state.destination) {
  return [...originLocations].sort((a,b)=>{
    const scoreA=(a.buildingId===destination?.buildingId?2:0)+(a.floor===destination?.floor?1:0);
    const scoreB=(b.buildingId===destination?.buildingId?2:0)+(b.floor===destination?.floor?1:0);
    return scoreB-scoreA||a.name.localeCompare(b.name,"ru",{numeric:true});
  });
}

function originMatches(query) {
  const value=normalize(query); const candidates=sortedOrigins();
  if (!value) return candidates.slice(0,8);
  return candidates.filter(location=>matches(value,location)).slice(0,8);
}

function setOriginPickerOpen(open) {
  originResults.hidden=!open; originInput.setAttribute("aria-expanded",String(open));
}

function selectOrigin(location,{focus=true}={}) {
  state.origin=location; originInput.value=location.name; originInput.dataset.locationId=location.id;
  originError.hidden=true; setOriginPickerOpen(false); if (focus) originInput.focus();
}

function renderOriginResults(query=originInput.value) {
  originResults.replaceChildren(); const results=originMatches(query);
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
  state.origin=null; originInput.value=""; delete originInput.dataset.locationId;
  originError.hidden=true; originResults.replaceChildren(); setOriginPickerOpen(false);
}

function resolveOrigin() {
  const value=normalize(originInput.value); if (!value) return null;
  if (state.origin&&originInput.dataset.locationId===state.origin.id&&normalize(state.origin.name)===value) return state.origin;
  const exact=originLocations.find(location=>normalize(location.id)===value||normalize(location.name)===value);
  if (exact) { selectOrigin(exact,{focus:false}); return exact; }
  const candidates=originMatches(value); if (candidates.length===1) { selectOrigin(candidates[0],{focus:false}); return candidates[0]; }
  return null;
}

function updateBackdrop() {
  sheetBackdrop.hidden=routeSheet.hidden&&locationSheet.hidden;
}

function openLocationActions(location,{navigate=false}={}) {
  state.selectedLocation=location; rememberLocation(location);
  if (navigate&&location.buildingId&&location.floor) openFloor(location.buildingId,location.floor);
  $("#location-sheet-title").textContent=location.name;
  $("#location-sheet-meta").textContent=metaFor(location);
  $("#location-sheet-note").textContent=!location.verified?"Точное расположение этого помещения ещё не отмечено на плане.":location.note??"Выберите, как использовать эту точку в маршруте.";
  const unavailable=((!location.buildingId||!location.floor)&&!location.graphNode)||!location.verified;
  $("#route-from-location").disabled=unavailable; $("#route-to-location").disabled=unavailable;
  locationSheet.hidden=false; requestAnimationFrame(()=>locationSheet.classList.add("is-open")); updateBackdrop();
}

function closeLocationSheet() {
  locationSheet.classList.remove("is-open"); locationSheet.hidden=true; updateBackdrop();
}

function openRouteSheet() {
  routeSheet.hidden=false; requestAnimationFrame(()=>routeSheet.classList.add("is-open")); updateBackdrop();
}

function closeRouteSheet() {
  routeSheet.classList.remove("is-open"); routeSheet.hidden=true; setOriginPickerOpen(false); updateBackdrop();
}

function selectDestination(location) {
  state.destination=location; clearRoute(); state.pendingOrigin=null; search.placeholder=SEARCH_PLACEHOLDER;
  search.value=location.name; searchResults.hidden=true;
  $("#destination-name").textContent=location.name; $("#destination-meta").textContent=metaFor(location);
  resetOriginPicker(); floorView.classList.remove("is-route-mode"); routeJourney.hidden=true;
  if (location.buildingId&&location.floor) openFloor(location.buildingId,location.floor);
  $("#route-result").hidden=true; openRouteSheet(); originInput.focus();
}

function beginRouteFromSelected() {
  const location=state.selectedLocation; if (!location) return;
  closeLocationSheet(); state.pendingOrigin=location; state.origin=location;
  search.value=""; search.placeholder=`Куда пройти от ${location.name}?`; renderSearchResults(""); search.focus();
}

function beginRouteToSelected() {
  const location=state.selectedLocation; if (!location) return;
  closeLocationSheet(); selectDestination(location);
}

function stageVisualMarkup(stage) {
  if (stage.kind==="outdoor") {
    const from=stage.fromLabel; const to=stage.toLabel;
    return `<span class="stage-node"><b>${from}</b><small>улица</small></span><i aria-hidden="true">→</i><span class="stage-node"><b>${to}</b><small>кампус</small></span>`;
  }
  if (stage.kind==="vertical") {
    const direction=stage.toFloor>stage.fromFloor?"↑":"↓";
    return `<span class="stage-node"><b>${stage.fromFloor}</b><small>этаж</small></span><i aria-hidden="true">${direction}</i><span class="stage-node"><b>${stage.toFloor}</b><small>этаж</small></span>`;
  }
  if (stage.kind==="transition") {
    const from=buildingById(stage.fromBuildingId); const to=buildingById(stage.toBuildingId);
    return `<span class="stage-node"><b>${from.short}</b><small>${stage.fromFloor} этаж</small></span><i aria-hidden="true">→</i><span class="stage-node"><b>${to.short}</b><small>${stage.toFloor} этаж</small></span>`;
  }
  const building=buildingById(stage.buildingId);
  return `<span class="stage-node is-wide"><b>${building.id==="entry"?"Главный вход":building.short+" корпус"}</b><small>${stage.floor}-й этаж</small></span><i aria-hidden="true">→</i><span class="stage-pin">${stage.role==="finish"?"Б":"A"}</span>`;
}

function renderCurrentStage() {
  const stages=state.route?.stages??[]; const stage=stages[state.activeStage]; if (!stage) return;
  $("#current-step-index").textContent=`Шаг ${state.activeStage+1} из ${stages.length}`;
  $("#current-step-title").textContent=stage.summary;
  $("#current-step-detail").textContent=stage.detail??stage.title;
  const stageIcon=current=>current.kind==="vertical"?(current.toFloor>current.fromFloor?"↑":"↓"):current.kind==="transition"?"⇄":current.kind==="outdoor"?"⌖":"→";
  $("#current-step-icon").textContent=stageIcon(stage);
  $("#route-progress").max=stages.length; $("#route-progress").value=state.activeStage+1;
  $("#route-source-note").textContent=$("#plan-source").textContent;
  $("#route-prev").disabled=state.activeStage===0; $("#route-next").disabled=false;
  $("#route-next").textContent=state.activeStage===stages.length-1?"Завершить":"Далее →";
  const next=stages[state.activeStage+1]; const nextCard=$("#next-step-card");
  nextCard.hidden=!next;
  if (next) {
    $("#next-step-icon").textContent=stageIcon(next);
    $("#next-step-title").textContent=next.summary;
    $("#next-step-detail").textContent=next.title;
    nextCard.className=`next-step-card is-${next.kind}`;
  }
  journeyCards.querySelectorAll(".journey-card").forEach((card,index)=>{
    const active=index===state.activeStage; card.classList.toggle("is-active",active); card.setAttribute("aria-pressed",String(active));
  });
}

function showRouteStage(stage,index,{scroll=true}={}) {
  if (!stage) return;
  routeDetails.close();
  state.activeStage=index; state.view="floor"; state.buildingId=stage.buildingId; state.floor=Number(stage.floor);
  campusView.hidden=true; floorView.hidden=false; renderFloor(); renderCurrentStage();
  if (scroll) floorCanvas.scrollTo({top:0,left:0,behavior:"instant"});
}

function renderJourney() {
  journeyCards.replaceChildren(); journeySteps.replaceChildren();
  const stages=state.route?.stages??[];
  if (state.route?.status!=="ready"||!stages.length) { routeJourney.hidden=true; $("#next-step-card").hidden=true; floorView.classList.remove("is-route-mode"); return; }
  floorView.classList.add("is-route-mode"); document.body.classList.add("route-active"); $("#route-dock").hidden=false; routeDetails.close();
  $("#route-journey-title").textContent=`Маршрут: ${state.destination.name}`;
  $("#journey-meta").textContent=`${stages.length} ${stageWord(stages.length)} · ~${state.route.estimatedMinutes} мин`;
  $("#journey-origin-name").textContent=state.origin.name; $("#journey-origin-meta").textContent=metaFor(state.origin);
  $("#journey-destination-name").textContent=state.destination.name; $("#journey-destination-meta").textContent=metaFor(state.destination);
  state.route.steps.forEach((step,index)=>{
    const item=document.createElement("li");
    const number=document.createElement("span"); number.className="journey-step-number"; number.setAttribute("aria-hidden","true"); number.textContent=String(index+1);
    const copy=document.createElement("span"); copy.textContent=step; item.append(number,copy); journeySteps.append(item);
  });
  stages.forEach((stage,index)=>{
    const card=document.createElement("button"); card.type="button"; card.className=`journey-card is-${stage.kind}${index===state.activeStage?" is-active":""}`;
    card.setAttribute("aria-pressed",String(index===state.activeStage)); card.addEventListener("click",()=>showRouteStage(stage,index));
    const head=document.createElement("span"); head.className="journey-card-head";
    const step=document.createElement("small"); step.textContent=`Шаг ${index+1}`;
    const type=document.createElement("b"); type.textContent=stage.kind==="vertical"?"Этаж":stage.kind==="transition"?"Корпус":stage.kind==="outdoor"?"Улица":"По этажу";
    head.append(step,type);
    const visual=document.createElement("span"); visual.className="stage-visual"; visual.innerHTML=stageVisualMarkup(stage);
    const title=document.createElement("strong"); title.className="journey-card-title"; title.textContent=stage.summary;
    const detail=document.createElement("span"); detail.className="journey-card-detail"; detail.textContent=stage.detail??stage.title;
    card.append(head,visual,title,detail); journeyCards.append(card);
  });
  routeJourney.hidden=false; renderCurrentStage();
}

function renderRouteResult() {
  const result=$("#route-result"); result.hidden=false; routeSteps.replaceChildren();
  state.route.steps.forEach(step=>{ const item=document.createElement("li"); item.textContent=step; routeSteps.append(item); });
  $("#route-result-title").textContent=state.route.status==="ready"?"Маршрут построен":state.route.status==="same"?"Вы уже на месте":"Нужна проверка данных";
  $("#route-result-meta").textContent=state.route.status==="ready"?`По схеме · примерно ${state.route.estimatedMinutes} мин`:"";
  if (state.route.status==="ready") {
    state.activeStage=0; const first=state.route.stages[0];
    state.view="floor"; state.buildingId=first.buildingId; state.floor=Number(first.floor);
    campusView.hidden=true; floorView.hidden=false; renderFloor(); renderJourney(); closeRouteSheet();
    search.blur(); originInput.blur(); searchResults.hidden=true;
    window.scrollTo({top:0,behavior:"instant"});
  } else {
    renderJourney();
    if(state.view==="floor")renderFloor();
    openRouteSheet();
  }
}

function startRoute(origin,destination) {
  window.clearTimeout(state.buildingOpenTimer);
  clearRoute();state.origin=origin; state.destination=destination; state.route=buildRoute(origin,destination);
  search.value=destination.name; search.placeholder=SEARCH_PLACEHOLDER;
  $("#destination-name").textContent=destination.name; $("#destination-meta").textContent=metaFor(destination);
  originInput.value=origin.name; originInput.dataset.locationId=origin.id; renderRouteResult();
}

function buildSelectedRoute() {
  const origin=resolveOrigin();
  if (!origin) { originError.hidden=false; renderOriginResults(); originInput.focus(); return; }
  startRoute(origin,state.destination);
}

function openRouteEditor() {
  $("#route-result").hidden=true; openRouteSheet(); originInput.focus();
}

function renderFallbackMap() {
  const map=$("#campus-map"); map.classList.add("map-fallback");
  map.innerHTML='<div class="fallback-campus" aria-label="Схема кампуса"><button data-building="c1"><b>1</b><span>Корпус 1</span></button><button data-building="c3"><b>3</b><span>Корпус 3</span></button><button data-building="c2"><b>2</b><span>Корпус 2</span></button><button data-location="checkpoint"><b>КПП</b><span>Проходная</span></button></div>';
  map.querySelectorAll("[data-building]").forEach(button=>button.addEventListener("click",()=>selectBuilding(button.dataset.building)));
  map.querySelector("[data-location]")?.addEventListener("click",()=>openLocationActions(locationById("checkpoint"),{navigate:false}));
}

function registerWebMcp() {
  const context=document.modelContext; if (!context?.registerTool) return;
  const register=tool=>Promise.resolve(context.registerTool(tool)).catch(()=>{});
  register({
    name:"search_campus_locations",title:"Найти помещение",description:"Найти аудитории и объекты внутри кампуса по номеру или названию.",
    inputSchema:{type:"object",properties:{query:{type:"string",minLength:1}},required:["query"],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},
    execute({query}) { if(typeof query!=="string"||!query.trim()) throw new Error("query must be a non-empty string"); return allSearchable.filter(item=>matches(query,item)).slice(0,10).map(item=>({id:item.id,name:item.name,location:metaFor(item)})); },
  });
  register({
    name:"build_indoor_route",title:"Построить маршрут",description:"Выбрать начальную и конечную точки и показать маршрут в интерфейсе.",
    inputSchema:{type:"object",properties:{originId:{type:"string"},destinationId:{type:"string"}},required:["originId","destinationId"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute({originId,destinationId}) {
      const origin=originLocations.find(item=>item.id===originId); const destination=locationById(destinationId);
      if(!origin||!destination) throw new Error("Unknown originId or destinationId"); startRoute(origin,destination);
      return {status:state.route.status,kind:state.route.kind??null,estimatedMinutes:state.route.estimatedMinutes??null,steps:state.route.steps,stages:state.route.stages?.map(stage=>({kind:stage.kind,title:stage.title,summary:stage.summary}))??[]};
    },
  });
}

async function init() {
  $("#map-zoom-in").addEventListener("click",()=>setMapZoom(state.zoom+.5));
  $("#map-zoom-out").addEventListener("click",()=>setMapZoom(state.zoom-.5));
  $("#map-fit").addEventListener("click",()=>setMapZoom(1));
  search.placeholder=SEARCH_PLACEHOLDER;
  search.addEventListener("input",()=>renderSearchResults(search.value));
  search.addEventListener("focus",()=>renderSearchResults(search.value));
  search.addEventListener("keydown",event=>{ if(event.key==="Escape") searchResults.hidden=true; });
  originInput.addEventListener("input",()=>{
    state.origin=null; clearRoute(); delete originInput.dataset.locationId; originError.hidden=true; $("#route-result").hidden=true;
    routeJourney.hidden=true; floorView.classList.remove("is-route-mode"); if (state.view==="floor") renderFloor(); renderOriginResults();
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
  $("#route-details-toggle").addEventListener("click",()=>routeDetails.showModal());
  $("#route-details-close").addEventListener("click",()=>routeDetails.close());
  document.addEventListener("click",event=>{ if(!event.target.closest(".search-shell")) searchResults.hidden=true; });
  document.addEventListener("click",event=>{ if(!event.target.closest(".origin-combobox")) setOriginPickerOpen(false); });
  $("#back-to-campus").addEventListener("click",showCampus); $("#brand-home").addEventListener("click",showCampus);
  $("#route-exit").addEventListener("click",showCampus);
  $("#route-build").addEventListener("click",buildSelectedRoute); $("#route-close").addEventListener("click",closeRouteSheet);
  $("#route-edit").addEventListener("click",openRouteEditor); $("#route-prev").addEventListener("click",()=>showRouteStage(state.route?.stages?.[state.activeStage-1],state.activeStage-1));
  $("#route-next").addEventListener("click",()=>{if(state.activeStage===state.route.stages.length-1)showCampus();else showRouteStage(state.route.stages[state.activeStage+1],state.activeStage+1);});
  $("#next-step-card").addEventListener("click",()=>showRouteStage(state.route.stages[state.activeStage+1],state.activeStage+1));
  document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeLocationSheet();closeRouteSheet();}});
  $("#location-close").addEventListener("click",closeLocationSheet);
  $("#route-from-location").addEventListener("click",event=>{ event.stopPropagation(); beginRouteFromSelected(); });
  $("#route-to-location").addEventListener("click",beginRouteToSelected);
  sheetBackdrop.addEventListener("click",()=>{ if(!locationSheet.hidden) closeLocationSheet(); else closeRouteSheet(); });
  $("#search-clear").addEventListener("click",()=>{ search.value=""; search.focus(); renderSearchResults(""); });
  try {
    state.mapController=await createCampusMap($("#campus-map"),selectBuilding,(id="checkpoint")=>openLocationActions(locationById(id),{navigate:false}));
  } catch { renderFallbackMap(); }
  registerWebMcp();
}

init();
