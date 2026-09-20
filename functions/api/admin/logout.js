import { cookie, json } from "../../_lib/session.js";

export async function onRequestPost({ request }) {
  return json({ ok: true }, 200, { "set-cookie": cookie("", 0, new URL(request.url).protocol === "https:") });
}
