import { onCleanup } from 'solid-js'

export default function useDelay() {
  let timer: ReturnType<typeof setTimeout> | null = null
  const clearDelay = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const delayInvoke = (callback: VoidFunction, delay: number) => {
    clearDelay()

    if (delay === 0) {
      callback()
    } else {
      timer = setTimeout(() => {
        callback()
      }, delay * 1000)
    }
  }

  onCleanup(clearDelay)
  return delayInvoke
}
