import { useEffect, useRef, useState } from "react"

export function useDismissibleDisclosure() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      setIsOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  return { isOpen, setIsOpen, containerRef, triggerRef }
}
