// Packed snapshots with node's zlib (src/core/packedSnapshot.js has the rule): for the MCP server
// and the posting tools. packBody/unpackData wrap an API call's request and response.

import zlib from 'node:zlib';
import { packSnapshots, unpackSnapshots } from '../src/core/packedSnapshot.js';

export const gzipToBase64 = text => zlib.gzipSync(text).toString('base64');
export const gunzipFromBase64 = b64 => zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');

export const pack = (events, over) => packSnapshots(events, gzipToBase64, over);
export const unpack = events => unpackSnapshots(events, gunzipFromBase64);

// A request body with its big snapshots gzipped
export async function packBody(body) {
  return body?.events ? { ...body, events: await pack(body.events) } : body;
}
// A response with its snapshots unpacked
export async function unpackData(data) {
  if (data && Array.isArray(data.events)) data.events = await unpack(data.events);
  return data;
}
