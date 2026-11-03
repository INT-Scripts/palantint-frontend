export type LaundryMachine = {
    machine_nbr: number | string;
    machine_name: string;
    machine_type: string;
    machine_state: number | string;
    machine_price: number | string;
    started_at: string | null;
};
// Touch'n'Pay uses sec; retain sl for older cached exports.
export const isDryer = (machine: LaundryMachine) => ["sec", "sl"].includes(machine.machine_type.toLowerCase());
export const isRunning = (machine: LaundryMachine) => String(machine.machine_state) === "1";
export const machinePrice = (machine: LaundryMachine) => {
    const cents = Number(machine.machine_price);
    return Number.isFinite(cents) ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100) : "Tarif non renseigné";
};
