/**
 * @license lucide-solid v0.563.0 - ISC
 *
 * Solid v2-compatible Lucide icon generated from lucide-solid's official iconNode data.
 */

import { createLucideIcon, type IconNode } from "../create-lucide-icon.tsx";

const iconNode = [['path', {
  d: 'M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z',
  key: '1lbycx'
}], ['polyline', {
  points: '15,9 18,9 18,11',
  key: '1pm9c0'
}], ['path', {
  d: 'M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2',
  key: '15i455'
}], ['line', {
  x1: '6',
  x2: '7',
  y1: '10',
  y2: '10',
  key: '1e2scm'
}]] as const satisfies IconNode;

const Mailbox = createLucideIcon("mailbox", iconNode);

export default Mailbox;
