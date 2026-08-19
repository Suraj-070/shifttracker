import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Default true — most users are mobile, avoids SSR flash of desktop UI
  const [isMobile, setIsMobile] = React.useState(true)

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    check()
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", check)
    return () => mql.removeEventListener("change", check)
  }, [])

  return isMobile
}
