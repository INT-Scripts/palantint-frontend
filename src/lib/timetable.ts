export type TimetableEvent = {id: string; name: string; start_time: string; end_time: string};
export type DayInterval = {type: "free" | "busy"; start: number; end: number; events: TimetableEvent[]};
export function dayIntervals(day: Date, events: TimetableEvent[]): DayInterval[] {
    const begin = new Date(day); begin.setHours(8,0,0,0);
    const finish = new Date(day); finish.setHours(21,0,0,0);
    const busy = events.flatMap(event => {
        const start = Math.max(begin.getTime(),new Date(event.start_time).getTime());
        const end = Math.min(finish.getTime(),new Date(event.end_time).getTime());
        return Number.isFinite(start) && Number.isFinite(end) && end > start ? [{start:480+(start-begin.getTime())/60000,end:480+(end-begin.getTime())/60000,events:[event]}] : [];
    }).sort((a,b)=>a.start-b.start);
    const merged: typeof busy = [];
    for (const interval of busy) {
        const last=merged[merged.length-1];
        if(last && interval.start<=last.end){last.end=Math.max(last.end,interval.end);last.events.push(...interval.events);}
        else merged.push({...interval});
    }
    const output: DayInterval[]=[];
    let cursor=480;
    for(const interval of merged){if(interval.start>cursor)output.push({type:"free",start:cursor,end:interval.start,events:[]});output.push({type:"busy",...interval});cursor=interval.end;}
    if(cursor<1260)output.push({type:"free",start:cursor,end:1260,events:[]});
    return output;
}
