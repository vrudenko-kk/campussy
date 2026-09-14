import { buildingById } from "./campus-data.js";

const detailedCorridor = [[550,555],[760,555],[1030,555],[1280,555],[1470,545]];

function nearestIndex(point,nodes=detailedCorridor) {
  return nodes.reduce((best,node,index) => Math.abs(node[0]-point[0]) < Math.abs(nodes[best][0]-point[0]) ? index : best,0);
}

function sameFloorPoints(origin,destination) {
  if (!origin.point || !origin.door || !destination.point || !destination.door) return null;
  const fromIndex = nearestIndex(origin.door);
  const toIndex = nearestIndex(destination.door);
  const direction = fromIndex <= toIndex ? 1 : -1;
  const points = [origin.point,origin.door];
  for (let index=fromIndex;;index+=direction) {
    points.push(detailedCorridor[index]);
    if (index === toIndex) break;
  }
  points.push(destination.door,destination.point);
  return points;
}

function sameFloorInstructions(origin,destination) {
  const direction = destination.door?.[0] > origin.door?.[0] ? "направо" : destination.door?.[0] < origin.door?.[0] ? "налево" : "прямо";
  return [
    `Выйдите из точки «${origin.name}» в основной коридор.`,
    `Двигайтесь по коридору ${direction}.`,
    `Следуйте до указателя «${destination.name}».`,
  ];
}

export function buildRoute(origin,destination) {
  if (!origin || !destination) return { status:"empty",steps:[],points:null };
  if (origin.id === destination.id) return { status:"same",steps:["Вы уже находитесь в выбранной точке."],points:null };
  if (!destination.verified) return {
    status:"unverified", points:null,
    steps:[`Для «${destination.name}» известна общая зона, но точное положение на плане ещё не подтверждено.`],
  };

  const sameBuilding = origin.buildingId && origin.buildingId === destination.buildingId;
  const sameFloor = sameBuilding && origin.floor === destination.floor;
  if (sameFloor) {
    const points = sameFloorPoints(origin,destination);
    return {
      status:"ready",kind:"same-floor",points,
      steps: points ? sameFloorInstructions(origin,destination) : [
        `Выйдите из «${origin.name}» в коридор.`,
        `Следуйте по указателям до «${destination.name}».`,
      ],
    };
  }

  if (sameBuilding) {
    const building = buildingById(origin.buildingId);
    return {
      status:"ready",kind:"cross-floor",points:null,
      steps:[
        `Выйдите из «${origin.name}» к лестнице или лифту.`,
        `Поднимитесь или спуститесь на ${destination.floor}-й этаж ${building.name.toLowerCase()}.`,
        `На этаже следуйте к «${destination.name}».`,
      ],
    };
  }

  return {
    status:"ready",kind:"cross-building",points:null,
    steps:[
      origin.buildingId ? `Спуститесь на 1-й этаж ${buildingById(origin.buildingId).name.toLowerCase()}.` : `Выйдите в общий холл кампуса.`,
      `Перейдите в ${buildingById(destination.buildingId)?.name.toLowerCase() ?? "нужный корпус"} через внутренний переход.`,
      `Поднимитесь на ${destination.floor}-й этаж.`,
      `Следуйте к «${destination.name}».`,
    ],
  };
}
