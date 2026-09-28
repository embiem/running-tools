/**
 * Hand-picked follow-along YouTube workouts for runners, in three groups:
 * warm-ups before a run, stretching / yoga after one, and strength sessions.
 *
 * Selection criteria (September 2026): made for runners specifically, led by
 * someone with a coaching or physiotherapy background or a channel whose
 * audience is known for warm reception rather than for raw view counts, a
 * follow-along format (you do it with the video, not after watching it), and,
 * where available, an independent editorial recommendation. Each entry's
 * `why` says which of these it meets. Durations are the ones the video's own
 * title or description states; `minutes` is left out where neither does.
 *
 * Only the video id is stored: the embed loads nothing from YouTube until the
 * viewer presses play (see YouTubeEmbed.svelte). Titles and channel names are
 * the videos' own (the videos are in English); the group copy and each `why`
 * come from the message catalog (messages/{locale}.json, keys `yt_*`).
 */

import type { Message } from './i18n.svelte'
import { m } from '../paraglide/messages.js'

export type VideoCategory = 'warm-up' | 'stretch' | 'strength'

export interface YouTubeWorkout {
  /** The 11-character YouTube video id. */
  id: string
  title: string
  /** Channel name, when it could be confirmed. */
  channel?: string
  category: VideoCategory
  /** Length in minutes, when the video states it. */
  minutes?: number
  /** One line on why it made the list. */
  why: Message
}

export interface VideoGroup {
  category: VideoCategory
  title: Message
  blurb: Message
}

export const VIDEO_GROUPS: VideoGroup[] = [
  {
    category: 'warm-up',
    title: m.yt_group_warm_up_title,
    blurb: m.yt_group_warm_up_blurb,
  },
  {
    category: 'stretch',
    title: m.yt_group_stretch_title,
    blurb: m.yt_group_stretch_blurb,
  },
  {
    category: 'strength',
    title: m.yt_group_strength_title,
    blurb: m.yt_group_strength_blurb,
  },
]

export const YOUTUBE_WORKOUTS: YouTubeWorkout[] = [
  {
    id: 'QzmsKIdsgko',
    title: 'The Best 5 Minute Run Warm Up for Beginners',
    channel: 'The Run Experience',
    category: 'warm-up',
    minutes: 5,
    why: m.yt_why_QzmsKIdsgko,
  },
  {
    id: 'MKuZOwYukho',
    title: 'Yoga For Runners: 7 Minute Pre-Run Yoga',
    channel: 'Yoga With Adriene',
    category: 'warm-up',
    minutes: 7,
    why: m.yt_why_MKuZOwYukho,
  },
  {
    id: '3WUtJxLv-wI',
    title: '5 Minute Warm-Up You NEED before EVERY RUN',
    category: 'warm-up',
    minutes: 5,
    why: m.yt_why_3WUtJxLv_wI,
  },
  {
    id: 'BylKeXx0fbc',
    title: 'Yoga For Runners | 10 Minute Post Run Stretch',
    channel: 'Live Free Warrior',
    category: 'stretch',
    minutes: 10,
    why: m.yt_why_BylKeXx0fbc,
  },
  {
    id: '0hTllAb4XGg',
    title: 'Runner’s Yoga',
    channel: 'Yoga With Adriene',
    category: 'stretch',
    why: m.yt_why_0hTllAb4XGg,
  },
  {
    id: 'FbmLx-PahO4',
    title: '10 Min. Post-Run Stretch | Simple Cool Down after Running',
    channel: 'Mady Morrison',
    category: 'stretch',
    minutes: 10,
    why: m.yt_why_FbmLx_PahO4,
  },
  {
    id: 'pe9v9uiUujQ',
    title: '25 Minute Strength Workout for Runners (to Run Pain Free)',
    channel: 'Dr. Duane Scotti · Spark Healthy Runner',
    category: 'strength',
    minutes: 25,
    why: m.yt_why_pe9v9uiUujQ,
  },
  {
    id: '6LB__vPvaaE',
    title: '20 Minute Leg Strength Workout for Runners',
    channel: 'Runna',
    category: 'strength',
    minutes: 20,
    why: m.yt_why_6LB__vPvaaE,
  },
  {
    id: 'rZpMnnN4s_o',
    title: 'Strength Training for Runners — Follow Along with Aaliyah Earvin',
    channel: 'REI · Deeply Moving with Elena Cheung',
    category: 'strength',
    minutes: 20,
    why: m.yt_why_rZpMnnN4s_o,
  },
]

export function videosIn(category: VideoCategory): YouTubeWorkout[] {
  return YOUTUBE_WORKOUTS.filter((v) => v.category === category)
}
