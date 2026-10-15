import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { checkForUpdate, type AvailableUpdate } from '@/lib/tauri'

const TOAST_ID = 'app-update'

/**
 * Checks for a newer desktop release once on startup and, if there is one,
 * shows a persistent toast that downloads, installs and relaunches the app.
 *
 * Renders nothing. Check failures (offline, no published release) are logged
 * and otherwise ignored.
 */
export function UpdateNotifier() {
  const checked = useRef(false)

  useEffect(() => {
    if (checked.current) return
    checked.current = true

    checkForUpdate()
      .then((update) => {
        if (update) notifyUpdate(update)
      })
      .catch((cause: unknown) => {
        console.warn('Update check failed', cause)
      })
  }, [])

  return null
}

function notifyUpdate(update: AvailableUpdate) {
  toast(`Version ${update.version} is available`, {
    id: TOAST_ID,
    duration: Infinity,
    action: {
      label: 'Update now',
      onClick: () => {
        void installUpdate(update)
      },
    },
    cancel: {
      label: 'Later',
      onClick: () => {},
    },
  })
}

async function installUpdate(update: AvailableUpdate) {
  toast.loading('Downloading update…', { id: TOAST_ID, duration: Infinity })

  try {
    await update.install((downloaded, total) => {
      const label = total
        ? `Downloading update… ${Math.round((downloaded / total) * 100)}%`
        : 'Downloading update…'
      toast.loading(label, { id: TOAST_ID, duration: Infinity })
    })
    toast.loading('Restarting…', { id: TOAST_ID, duration: Infinity })
  } catch (cause: unknown) {
    toast.error('Update failed', {
      id: TOAST_ID,
      duration: Infinity,
      description: cause instanceof Error ? cause.message : String(cause),
    })
  }
}
