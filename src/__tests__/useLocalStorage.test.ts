import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../hooks/useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('returns stored value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored-value'))
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    expect(result.current[0]).toBe('stored-value')
  })

  it('updates both state and localStorage on setValue', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))

    act(() => {
      result.current[1]('new-value')
    })

    expect(result.current[0]).toBe('new-value')
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe('new-value')
  })

  it('works with object values', () => {
    const initial = { color: '#fff', size: 10 }
    const { result } = renderHook(() => useLocalStorage('test-obj', initial))

    expect(result.current[0]).toEqual(initial)

    const updated = { color: '#000', size: 20 }
    act(() => {
      result.current[1](updated)
    })

    expect(result.current[0]).toEqual(updated)
    expect(JSON.parse(localStorage.getItem('test-obj')!)).toEqual(updated)
  })

  it('handles malformed JSON in localStorage gracefully', () => {
    localStorage.setItem('test-key', 'not-valid-json')
    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'))
    expect(result.current[0]).toBe('fallback')
  })
})
