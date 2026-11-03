export type NetworkNode = {id: string; name: string; group: "student" | "club" | "class_group"; apartment?: string | null; room?: string | null; map?: {feature?: string | null; building?: number | null; level?: number | null} | null};
export type NetworkEdge = {id: string; source: string; target: string; label: string; kind: "membership" | "relationship" | "class_group"; confidence?: string; origin?: string; derived?: boolean; location_id?: string; directed?: boolean; color?: string};
export type NetworkData = {nodes: NetworkNode[]; links: NetworkEdge[]};
export function indexNetwork(data: NetworkData) {
    const nodes = new Map(data.nodes.map(node => [node.id, node]));
    const neighbors = new Map<string, NetworkEdge[]>();
    for (const edge of data.links) {
        if (!nodes.has(edge.source) || !nodes.has(edge.target)) continue;
        if (!neighbors.has(edge.source)) neighbors.set(edge.source, []);
        if (!neighbors.has(edge.target)) neighbors.set(edge.target, []);
        neighbors.get(edge.source)!.push(edge);
        neighbors.get(edge.target)!.push(edge);
    }
    return {nodes, neighbors};
}
export function shortestConnection(index: ReturnType<typeof indexNetwork>, from: string, to: string, kind: string = "all") {
    if (!index.nodes.has(from) || !index.nodes.has(to)) return null;
    const previous = new Map<string, {node: string; edge: NetworkEdge}>();
    const seen = new Set([from]);
    const queue = [from];
    for (let i = 0; i < queue.length && !seen.has(to); i++) {
        const id = queue[i];
        for (const edge of index.neighbors.get(id) || []) {
            if (kind !== "all" && edge.kind !== kind) continue;
            if (edge.directed && edge.source !== id) continue;
            const next = edge.source === id ? edge.target : edge.source;
            if (seen.has(next)) continue;
            previous.set(next, {node: id, edge}); seen.add(next); queue.push(next);
        }
    }
    if (!seen.has(to)) return null;
    const nodes = [to], edges: NetworkEdge[] = [];
    while (nodes[0] !== from) { const step = previous.get(nodes[0])!; nodes.unshift(step.node); edges.unshift(step.edge); }
    return {nodes: nodes.map(id => index.nodes.get(id)!), edges};
}
export const networkName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Concentric rings keep labels apart without limiting the number of nodes. */
export function networkLayout(nodes: NetworkNode[], path = false) {
    const positions = new Map<string, {x:number;y:number}>();
    let ring = 1, slot = 0;
    nodes.forEach((node,i) => {
        if (path) { positions.set(node.id,{x:i*200,y:i%2?60:-60}); return; }
        if (!i) {positions.set(node.id,{x:0,y:0});return;}
        const capacity = Math.floor(2*Math.PI*ring*230/170);
        const angle = slot/capacity*Math.PI*2-Math.PI/2;
        positions.set(node.id,{x:Math.cos(angle)*ring*230,y:Math.sin(angle)*ring*230});
        slot++; if (slot===capacity) {ring++;slot=0;}
    });
    return positions;
}
