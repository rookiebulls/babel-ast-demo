import { minus } from './minus.js'

export default function add(a, b) {
  return a + b + minus(a, b)
}
