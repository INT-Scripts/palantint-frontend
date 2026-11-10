import assert from "node:assert/strict";
import { test } from "node:test";
import { isLegacyCampusPage, legacyCampusHref, type LegacyTarget } from "./legacyCampus.ts";

const resolver = (target: LegacyTarget | null, seen: string[] = []) => async (query: URLSearchParams) => { seen.push(String(query)); return target; };

test("only the retired pages are redirected", () => {
    assert.ok(isLegacyCampusPage("/palantint/apartments"));
    assert.ok(isLegacyCampusPage("/palantint/foyer/"));
    assert.ok(!isLegacyCampusPage("/palantint/campus"));
    assert.ok(!isLegacyCampusPage("/apartments"));
});

test("old parameters are translated by the server into building, level and feature", async () => {
    const seen: string[] = [];
    const href = await legacyCampusHref("/palantint/apartments", new URLSearchParams("bldg=U7&floor=2&room=7210"), resolver({ building: "1360", level: 2, feature: "plan:U7_2:room:7210" }, seen));
    assert.deepEqual(seen, ["building=U7&floor=2&room=7210"]);
    assert.equal(href, "/palantint/campus?building=1360&level=2&feature=plan%3AU7_2%3Aroom%3A7210");
});

test("the Foyer page opens the Foyer building", async () => {
    const seen: string[] = [];
    assert.equal(await legacyCampusHref("/palantint/foyer", new URLSearchParams(), resolver({ building: "1356", level: null, feature: null }, seen)), "/palantint/campus?building=1356");
    assert.deepEqual(seen, ["building=Foyer"]);
});

test("a room the server cannot place is kept for the map to resolve", async () => {
    assert.equal(await legacyCampusHref("/palantint/apartments", new URLSearchParams("room=6123"), resolver({ building: "U6", level: null, feature: null })), "/palantint/campus?building=U6&room=6123");
    assert.equal(await legacyCampusHref("/palantint/apartments", new URLSearchParams("bldg=U5&room=5101"), () => Promise.reject(new Error("offline"))), "/palantint/campus?building=U5&room=5101");
});

test("the apartments page without parameters opens the campus", async () => {
    const seen: string[] = [];
    assert.equal(await legacyCampusHref("/palantint/apartments", new URLSearchParams(), resolver(null, seen)), "/palantint/campus");
    assert.deepEqual(seen, []);
});
