import { reservasParts } from "../../src/partials/dynamic.mjs";
import { overlay } from "../_lib/overlay.js";
import negocio from "../_lib/negocio.gen.js";

export const onRequestGet = (ctx) => overlay(ctx, "/reservas/", "horarios", (h) => reservasParts(h, negocio.phone));
