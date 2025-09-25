export function shortAddr(addr?: string, n = 6) {
  if (!addr) return ''
  return addr.slice(0, 2 + n) + '…' + addr.slice(-n)
}
