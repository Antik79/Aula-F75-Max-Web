import { useState } from 'react'
import { toast } from 'sonner'
import { Save, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RGB_MODES } from '@/lib/device/labels'
import { lightingSettingsEqual, type LightingSettings } from '@/lib/lighting/settings'
import type { LightingProfile } from '@/lib/lighting/profiles'
import { useLightingProfiles } from '@/hooks/useLightingProfiles'

const RAINBOW = 'linear-gradient(135deg, #ff4d4d, #ffb84d, #e8ff4d, #4dff88, #4dc3ff, #9a4dff, #ff4dd2)'

function Swatch({ settings }: { settings: LightingSettings }) {
  const off = settings.mode === 0
  return (
    <span
      aria-hidden
      className="size-3.5 shrink-0 rounded-sm border border-border"
      style={{ background: off ? 'transparent' : settings.colorful ? RAINBOW : settings.color }}
    />
  )
}

interface ProfilesPanelProps {
  current: LightingSettings
  onLoad: (settings: LightingSettings) => void
}

/**
 * Saved lighting looks, stored in this browser. The keyboard has no profile
 * slots, so loading one simply re-sends its settings.
 */
export function ProfilesPanel({ current, onLoad }: ProfilesPanelProps) {
  const { profiles, add, update, rename, remove, restore } = useLightingProfiles()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const save = () => {
    const name = newName.trim() || RGB_MODES.find((m) => m.id === current.mode)?.title || 'Untitled'
    add(name, current)
    setNewName('')
    toast.success(`Saved “${name}”`)
  }

  const handleDelete = (profile: LightingProfile) => {
    const index = profiles.findIndex((p) => p.id === profile.id)
    remove(profile.id)
    toast(`Deleted “${profile.name}”`, {
      action: { label: 'Undo', onClick: () => restore(profile, index) },
    })
  }

  return (
    <div className="space-y-3">
      <Label className="font-mono text-xs text-muted-foreground uppercase">Profiles</Label>

      {profiles.length === 0 ? (
        <p className="text-xs text-muted-foreground">No saved profiles yet.</p>
      ) : (
        <ul className="space-y-1">
          {profiles.map((profile) => {
            const active = lightingSettingsEqual(profile.settings, current)
            const modeTitle = RGB_MODES.find((m) => m.id === profile.settings.mode)?.title ?? `Mode ${profile.settings.mode}`
            return (
              <li
                key={profile.id}
                className={`group flex items-center gap-1 rounded-md border pr-1 transition-colors ${
                  active ? 'border-live bg-live/10' : 'border-border bg-card hover:border-muted-foreground/40'
                }`}
              >
                {editingId === profile.id ? (
                  <form
                    className="flex-1 p-1"
                    onSubmit={(e) => {
                      e.preventDefault()
                      setEditingId(null)
                    }}
                  >
                    <Input
                      autoFocus
                      defaultValue={profile.name}
                      aria-label="Profile name"
                      className="h-7 text-xs"
                      onBlur={(e) => {
                        rename(profile.id, e.target.value)
                        setEditingId(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') rename(profile.id, e.currentTarget.value)
                        if (e.key === 'Escape') {
                          // Reset first so the blur fired on unmount renames to the old name.
                          e.currentTarget.value = profile.name
                          setEditingId(null)
                        }
                      }}
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => onLoad(profile.settings)}
                    onDoubleClick={() => setEditingId(profile.id)}
                    title="Click to apply · double-click to rename"
                    className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left"
                  >
                    <Swatch settings={profile.settings} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-foreground">{profile.name}</span>
                      <span className="block truncate font-mono text-[0.65rem] text-muted-foreground">{modeTitle}</span>
                    </span>
                  </button>
                )}
                {editingId !== profile.id && (
                  <div className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    {!active && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Overwrite “${profile.name}” with current settings`}
                        title="Overwrite with current settings"
                        onClick={() => {
                          update(profile.id, current)
                          toast.success(`Updated “${profile.name}”`)
                        }}
                      >
                        <Save />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete “${profile.name}”`}
                      title="Delete"
                      onClick={() => handleDelete(profile)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name current look"
          aria-label="New profile name"
          className="h-8 text-xs"
          maxLength={40}
        />
        <Button type="submit" variant="outline" size="sm">
          Save
        </Button>
      </form>
    </div>
  )
}
