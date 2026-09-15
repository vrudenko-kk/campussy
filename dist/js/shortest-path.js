// Independent of campus data, rendering and browser APIs.
// Stable binary heap: equal-cost routes retain deterministic insertion order.
class MinHeap {
  items=[];
  less(a,b){return a.cost<b.cost||(a.cost===b.cost&&a.order<b.order);}
  push(item){
    const a=this.items;let i=a.length;a.push(item);
    while(i){const parent=(i-1)>>1;if(!this.less(item,a[parent]))break;a[i]=a[parent];i=parent;}a[i]=item;
  }
  pop(){
    const a=this.items,first=a[0],last=a.pop();if(!a.length)return first;
    let i=0;
    while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&this.less(a[child+1],a[child]))child++;if(!this.less(a[child],last))break;a[i]=a[child];i=child;}a[i]=last;return first;
  }
  get size(){return this.items.length;}
}

/** Dijkstra, O((V + E) log V); edge weights must be finite, nonnegative. */
export function findShortestPath(graph,start,end,{allowEdge=()=>true}={}){
  if(!graph.nodes.has(start)||!graph.nodes.has(end))return null;
  const distances=new Map([[start,0]]),previous=new Map(),queue=new MinHeap();let order=0,visited=0;
  queue.push({id:start,cost:0,order:order++});
  while(queue.size){
    const current=queue.pop();
    if(current.cost!==distances.get(current.id))continue;
    visited++;
    if(current.id===end)break;
    for(const edge of graph.edges.get(current.id)??[]){
      if(!Number.isFinite(edge.cost)||edge.cost<0)throw new Error(`Invalid edge cost: ${edge.from} → ${edge.to}`);
      if(!allowEdge(edge))continue;
      const candidate=current.cost+edge.cost;
      if(candidate<(distances.get(edge.to)??Infinity)){
        distances.set(edge.to,candidate);previous.set(edge.to,edge);
        queue.push({id:edge.to,cost:candidate,order:order++});
      }
    }
  }
  if(!distances.has(end))return null;
  const edges=[];let cursor=end;
  while(cursor!==start){const edge=previous.get(cursor);if(!edge)return null;edges.push(edge);cursor=edge.from;}
  edges.reverse();return {edges,cost:distances.get(end),visited};
}
