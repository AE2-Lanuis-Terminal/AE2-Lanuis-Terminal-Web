/**
 * GET/POST /api/v1/encoding/*
 */
import type { Item } from './common'
import type { Pattern } from './patterns'

export type EncodingMode = 'crafting' | 'processing' | 'smithing' | 'stonecutting'

export interface EncodingSlot {
  key?: string
  id?: string
  amount?: string
  index?: number
}

export interface EncodingStatusResponse {
  ok: boolean
  blankPatterns: string
  modes: Partial<Record<EncodingMode, boolean>>
}

export interface EncodingResolveRequest {
  mode: EncodingMode
  inputs?: EncodingSlot[]
  outputs?: EncodingSlot[]
  substitute?: boolean
  substituteFluids?: boolean
  recipeId?: string
}

export interface EncodingResolveResponse {
  ok: boolean
  canEncode: boolean
  recipeId?: string
  craftingShape?: 'shaped' | 'shapeless' | string
  primaryOutput?: Item
  outputs?: Item[]
  warning?: string
}

export interface EncodingStonecuttingOptionsRequest {
  input: EncodingSlot
}

export interface EncodingStonecuttingOption {
  recipeId: string
  output: Item
}

export interface EncodingStonecuttingOptionsResponse {
  ok: boolean
  options: EncodingStonecuttingOption[]
}

export interface EncodingEncodeRequest {
  mode: EncodingMode
  inputs?: EncodingSlot[]
  outputs?: EncodingSlot[]
  substitute?: boolean
  substituteFluids?: boolean
  recipeId?: string
  providerId: string
  slotIndex?: number
}

export interface EncodingEncodeResponse {
  ok: boolean
  providerId: string
  slotIndex: number
  pattern?: Pattern
  message?: string
  code?: string
}
