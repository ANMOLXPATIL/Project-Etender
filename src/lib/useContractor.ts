import { useCallback, useEffect, useRef, useState } from 'react'
import { getContractor, subscribeToContractor } from './api'
import type { ContractorDetail } from '../types'

export function useContractor(id: string | undefined, includePrivate = false) {
  const [contractor, setContractor] = useState<ContractorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING')
  const requestSequence = useRef(0)
  const reload = useCallback(async () => {
    if (!id) return null
    const request = ++requestSequence.current
    setError('')
    try {
      const fresh = await getContractor(id, includePrivate)
      if (request === requestSequence.current) {
        setContractor(fresh)
        return fresh
      }
      return null
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to load this contractor.'
      if (request === requestSequence.current) setError(message)
      return null
    } finally {
      if (request === requestSequence.current) setLoading(false)
    }
  }, [id, includePrivate])

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError('No contractor was selected.')
      return
    }
    setLoading(true)
    void reload()
    let unsubscribe = () => {}
    try {
      setRealtimeStatus('CONNECTING')
      unsubscribe = subscribeToContractor(id, () => { void reload() }, setRealtimeStatus)
    } catch (caught) {
      setRealtimeStatus('CHANNEL_ERROR')
      setError(caught instanceof Error ? caught.message : 'Unable to subscribe to updates.')
    }
    return () => {
      requestSequence.current += 1
      unsubscribe()
    }
  }, [id, includePrivate, reload])

  return { contractor, loading, error, reload, realtimeStatus }
}
