/**
 * Normalised free displacement of a linear second-order system.
 *
 * The initial conditions are x(0) = 1 and x'(0) = 0. Keeping all three
 * damping regimes explicit prevents critically and over-damped suspension
 * traces from being rendered as oscillations.
 */
export function secondOrderFreeResponse(time: number, naturalAngularFrequency: number, dampingRatio: number): number {
  const t = Math.max(0, Number.isFinite(time) ? time : 0)
  const omega = Math.max(1e-9, Number.isFinite(naturalAngularFrequency) ? naturalAngularFrequency : 1e-9)
  const zeta = Math.max(0, Number.isFinite(dampingRatio) ? dampingRatio : 0)

  if (Math.abs(zeta - 1) < 1e-4) return (1 + omega * t) * Math.exp(-omega * t)

  if (zeta < 1) {
    const root = Math.sqrt(1 - zeta ** 2)
    const dampedFrequency = omega * root
    return Math.exp(-zeta * omega * t)
      * (Math.cos(dampedFrequency * t) + zeta / root * Math.sin(dampedFrequency * t))
  }

  const root = Math.sqrt(zeta ** 2 - 1)
  const slowRoot = -omega * (zeta - root)
  const fastRoot = -omega * (zeta + root)
  return (-fastRoot * Math.exp(slowRoot * t) + slowRoot * Math.exp(fastRoot * t))
    / (slowRoot - fastRoot)
}

/** Time after which the normalised response stays within the 2% band. */
export function settlingTimeTwoPercent(naturalAngularFrequency: number, dampingRatio: number): number {
  const omega = Math.max(1e-9, Number.isFinite(naturalAngularFrequency) ? naturalAngularFrequency : 1e-9)
  const zeta = Math.max(0, Number.isFinite(dampingRatio) ? dampingRatio : 0)
  if (zeta === 0) return Number.POSITIVE_INFINITY

  if (zeta < 1 - 1e-4) {
    return -Math.log(0.02 * Math.sqrt(1 - zeta ** 2)) / (zeta * omega)
  }

  // Critical and over-damped free responses are positive and monotonic. A
  // bounded bisection is more accurate than applying the under-damped 4/zetaω
  // approximation outside its valid regime.
  let low = 0
  let high = 1 / omega
  while (secondOrderFreeResponse(high, omega, zeta) > 0.02 && high < 1e6 / omega) high *= 2
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = (low + high) / 2
    if (secondOrderFreeResponse(middle, omega, zeta) > 0.02) low = middle
    else high = middle
  }
  return high
}
