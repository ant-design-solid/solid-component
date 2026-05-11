import { createRoot } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import createPosition from './createPosition'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const withRoot = async <T>(run: () => Promise<T> | T) =>
  new Promise<T>((resolve, reject) => {
    createRoot(dispose => {
      try {
        Promise.resolve(run()).then(
          value => {
            dispose()
            resolve(value)
          },
          error => {
            dispose()
            reject(error)
          },
        )
      } catch (error) {
        dispose()
        reject(error)
      }
    })
  })

describe('createPosition', () => {
  it('returns updated for the winning reposition call', async () => {
    await withRoot(async () => {
      const popup = document.createElement('div')
      document.body.appendChild(popup)

      vi.spyOn(popup, 'getBoundingClientRect').mockReturnValue({
        x: 20,
        y: 10,
        width: 40,
        height: 30,
        top: 10,
        left: 20,
        right: 60,
        bottom: 40,
        toJSON: () => ({}),
      } as DOMRect)

      let isOpen = false
      let popupElement: HTMLElement | undefined
      let targetValue: HTMLElement | [number, number] | undefined

      const [position, reposition] = createPosition(
        () => isOpen,
        () => popupElement,
        () => targetValue,
        () => 'top',
        () => ({ top: { points: ['bl', 'tl'] } }),
      )

      await Promise.resolve()

      isOpen = true
      popupElement = popup
      targetValue = [100, 120]

      await expect(reposition()).resolves.toBe('updated')
      expect(position().ready).toBe(true)
    })
  })

  it('returns superseded for an earlier reposition call', async () => {
    await withRoot(async () => {
      const popup = document.createElement('div')
      document.body.appendChild(popup)

      vi.spyOn(popup, 'getBoundingClientRect').mockReturnValue({
        x: 20,
        y: 10,
        width: 40,
        height: 30,
        top: 10,
        left: 20,
        right: 60,
        bottom: 40,
        toJSON: () => ({}),
      } as DOMRect)

      let isOpen = false
      let popupElement: HTMLElement | undefined
      let targetValue: HTMLElement | [number, number] | undefined

      const [, reposition] = createPosition(
        () => isOpen,
        () => popupElement,
        () => targetValue,
        () => 'top',
        () => ({ top: { points: ['bl', 'tl'] } }),
      )

      await Promise.resolve()

      isOpen = true
      popupElement = popup
      targetValue = [100, 120]

      const first = reposition()
      const second = reposition()

      await expect(first).resolves.toBe('superseded')
      await expect(second).resolves.toBe('updated')
    })
  })

  it('returns skipped when popup or target is unavailable', async () => {
    await withRoot(async () => {
      const [, repositionWithoutPopup] = createPosition(
        () => true,
        () => undefined,
        () => [100, 120],
        () => 'top',
        () => ({ top: { points: ['bl', 'tl'] } }),
      )

      const popup = document.createElement('div')
      document.body.appendChild(popup)

      const [, repositionWithoutTarget] = createPosition(
        () => true,
        () => popup,
        () => undefined,
        () => 'top',
        () => ({ top: { points: ['bl', 'tl'] } }),
      )

      await expect(repositionWithoutPopup()).resolves.toBe('skipped')
      await expect(repositionWithoutTarget()).resolves.toBe('skipped')
    })
  })
})

