import { cartaParts } from "../../src/partials/dynamic.mjs";
import { overlay } from "../_lib/overlay.js";

export const onRequestGet = (ctx) => overlay(ctx, "/carta/", "carta", cartaParts);
