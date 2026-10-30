import { useEffect, useState } from 'react'
import { getDevOptions, isLocationCheckSkipped, subscribeDevOptions } from './devSettings.js'

/** Live dev options. skipLocationCheck is only true while dev mode (?dev=1) is on. */
export function useDevOptions() {
  const read = () => ({ ...getDevOptions(), skipLocationCheck: isLocationCheckSkipped() })
  const [options, setOptions] = useState(read)
  useEffect(() => subscribeDevOptions(() => setOptions(read())), [])
  return options
}
