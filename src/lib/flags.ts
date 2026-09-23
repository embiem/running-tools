/**
 * Advice flag shared by the tool engines.
 *
 * The drink mix engine declared this shape first; the taper planner needs the
 * same thing, so it lives here as one declaration (type only, no logic) rather
 * than one engine importing a type from another engine.
 */
export interface Flag {
  level: 'warn' | 'info'
  message: string
}
