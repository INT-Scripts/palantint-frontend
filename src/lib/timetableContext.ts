export const localDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const localTime = (date: Date) =>
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export const parseLocalDate = (value: string | null): Date | null => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return localDate(date) === value ? date : null;
};

export const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function startOfWeek(date: Date) {
    const start = new Date(date);
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    start.setHours(0, 0, 0, 0);
    return start;
}

export function timetableHref(context: {
    students?: string[];
    room?: string | null;
    week?: Date;
    day?: Date;
    start?: Date;
    end?: Date;
}) {
    const params = new URLSearchParams();
    if (context.students?.length) params.set("students", context.students.join(","));
    if (context.room) params.set("room", context.room);
    if (context.week) params.set("week", localDate(startOfWeek(context.week)));
    if (context.day) params.set("day", localDate(context.day));
    if (context.start) params.set("start", localTime(context.start));
    if (context.end) params.set("end", localTime(context.end));
    const query = params.toString();
    return `/palantint/timetable${query ? `?${query}` : ""}`;
}
