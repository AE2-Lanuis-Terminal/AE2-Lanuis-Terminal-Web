/**
 * Mock 静态数据：库存 / 可合成目录 / CPU 任务 / 样板，形状对齐 `/api/v1`。
 * 在手写样例基础上批量生成，便于测分页、滚动与筛选。
 */
import type { CraftJob, Item, Pattern, PatternProvider } from './types.ts'

export const MOCK_VERSION = '0.1.0-mock'

function item(partial: Omit<Item, 'iconUrl' | 'key' | 'amountPerUnit' | 'kind'> & { id: string }): Item {
  const [ns, ...rest] = partial.id.split(':')
  const path = rest.join(':')
  return {
    ...partial,
    key: `item:${partial.id}`,
    kind: 'item',
    amountPerUnit: 1,
    iconUrl: `/api/v1/icons/item/${ns}/${path}`,
  }
}

function fluid(partial: Omit<Item, 'iconUrl' | 'key' | 'amountPerUnit' | 'craftable' | 'kind'> & { id: string; craftable?: boolean }): Item {
  const [ns, ...rest] = partial.id.split(':')
  const path = rest.join(':')
  return {
    craftable: false,
    ...partial,
    key: `fluid:${partial.id}`,
    kind: 'fluid',
    amountPerUnit: 1000,
    iconUrl: `/api/v1/icons/fluid/${ns}/${path}`,
  }
}

/** 预留类型样例：非 item/fluid，供「其他」筛选联调 */
function other(partial: Omit<Item, 'iconUrl' | 'key' | 'amountPerUnit' | 'kind'> & { id: string }): Item {
  return {
    ...partial,
    key: `other:${partial.id}`,
    kind: 'other',
    amountPerUnit: 1,
    iconUrl: '',
  }
}

/** 确定性伪随机，避免每次刷新数量乱跳 */
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function amountFor(i: number, kind: 'item' | 'fluid'): string {
  const r = seeded(i + (kind === 'fluid' ? 1000 : 0))
  if (kind === 'fluid') {
    // 0.1B ~ 250B（mB）
    return String(Math.max(100, Math.floor(r * 250_000)))
  }
  if (r < 0.08) return '0'
  if (r < 0.25) return String(Math.floor(1 + r * 64))
  if (r < 0.55) return String(Math.floor(64 + r * 4096))
  if (r < 0.85) return String(Math.floor(4096 + r * 100_000))
  return String(Math.floor(100_000 + r * 2_000_000))
}

const VANILLA_ITEMS: { id: string; name: string }[] = [
  { id: 'minecraft:cobblestone', name: 'Cobblestone' },
  { id: 'minecraft:stone', name: 'Stone' },
  { id: 'minecraft:dirt', name: 'Dirt' },
  { id: 'minecraft:sand', name: 'Sand' },
  { id: 'minecraft:gravel', name: 'Gravel' },
  { id: 'minecraft:oak_log', name: 'Oak Log' },
  { id: 'minecraft:spruce_log', name: 'Spruce Log' },
  { id: 'minecraft:birch_log', name: 'Birch Log' },
  { id: 'minecraft:iron_ingot', name: 'Iron Ingot' },
  { id: 'minecraft:gold_ingot', name: 'Gold Ingot' },
  { id: 'minecraft:copper_ingot', name: 'Copper Ingot' },
  { id: 'minecraft:netherite_ingot', name: 'Netherite Ingot' },
  { id: 'minecraft:diamond', name: 'Diamond' },
  { id: 'minecraft:emerald', name: 'Emerald' },
  { id: 'minecraft:coal', name: 'Coal' },
  { id: 'minecraft:charcoal', name: 'Charcoal' },
  { id: 'minecraft:redstone', name: 'Redstone Dust' },
  { id: 'minecraft:lapis_lazuli', name: 'Lapis Lazuli' },
  { id: 'minecraft:quartz', name: 'Nether Quartz' },
  { id: 'minecraft:amethyst_shard', name: 'Amethyst Shard' },
  { id: 'minecraft:glass', name: 'Glass' },
  { id: 'minecraft:obsidian', name: 'Obsidian' },
  { id: 'minecraft:ender_pearl', name: 'Ender Pearl' },
  { id: 'minecraft:blaze_rod', name: 'Blaze Rod' },
  { id: 'minecraft:ghast_tear', name: 'Ghast Tear' },
  { id: 'minecraft:slime_ball', name: 'Slimeball' },
  { id: 'minecraft:string', name: 'String' },
  { id: 'minecraft:feather', name: 'Feather' },
  { id: 'minecraft:bone', name: 'Bone' },
  { id: 'minecraft:gunpowder', name: 'Gunpowder' },
  { id: 'minecraft:sugar', name: 'Sugar' },
  { id: 'minecraft:paper', name: 'Paper' },
  { id: 'minecraft:book', name: 'Book' },
  { id: 'minecraft:stick', name: 'Stick' },
  { id: 'minecraft:bowl', name: 'Bowl' },
  { id: 'minecraft:brick', name: 'Brick' },
  { id: 'minecraft:clay_ball', name: 'Clay Ball' },
  { id: 'minecraft:wheat', name: 'Wheat' },
  { id: 'minecraft:carrot', name: 'Carrot' },
  { id: 'minecraft:potato', name: 'Potato' },
  { id: 'minecraft:apple', name: 'Apple' },
  { id: 'minecraft:bread', name: 'Bread' },
  { id: 'minecraft:cooked_beef', name: 'Steak' },
  { id: 'minecraft:arrow', name: 'Arrow' },
  { id: 'minecraft:torch', name: 'Torch' },
  { id: 'minecraft:chest', name: 'Chest' },
  { id: 'minecraft:hopper', name: 'Hopper' },
  { id: 'minecraft:piston', name: 'Piston' },
  { id: 'minecraft:observer', name: 'Observer' },
  { id: 'minecraft:dispenser', name: 'Dispenser' },
]

const AE2_ITEMS: { id: string; name: string }[] = [
  { id: 'ae2:fluix_crystal', name: 'Fluix Crystal' },
  { id: 'ae2:certus_quartz_crystal', name: 'Certus Quartz Crystal' },
  { id: 'ae2:charged_certus_quartz_crystal', name: 'Charged Certus Quartz Crystal' },
  { id: 'ae2:silicon', name: 'Silicon' },
  { id: 'ae2:logic_processor', name: 'Logic Processor' },
  { id: 'ae2:calculation_processor', name: 'Calculation Processor' },
  { id: 'ae2:engineering_processor', name: 'Engineering Processor' },
  { id: 'ae2:fluix_dust', name: 'Fluix Dust' },
  { id: 'ae2:certus_quartz_dust', name: 'Certus Quartz Dust' },
  { id: 'ae2:sky_stone_block', name: 'Sky Stone' },
  { id: 'ae2:smooth_sky_stone_block', name: 'Smooth Sky Stone' },
  { id: 'ae2:quartz_glass', name: 'Quartz Glass' },
  { id: 'ae2:fluix_glass_cable', name: 'Fluix Glass Cable' },
  { id: 'ae2:fluix_smart_cable', name: 'Fluix Smart Cable' },
  { id: 'ae2:storage_bus', name: 'ME Storage Bus' },
  { id: 'ae2:import_bus', name: 'ME Import Bus' },
  { id: 'ae2:export_bus', name: 'ME Export Bus' },
  { id: 'ae2:interface', name: 'ME Interface' },
  { id: 'ae2:pattern_provider', name: 'ME Pattern Provider' },
  { id: 'ae2:crafting_unit', name: 'Crafting Unit' },
  { id: 'ae2:cell_component_1k', name: '1k ME Storage Component' },
  { id: 'ae2:cell_component_4k', name: '4k ME Storage Component' },
  { id: 'ae2:cell_component_16k', name: '16k ME Storage Component' },
  { id: 'ae2:cell_component_64k', name: '64k ME Storage Component' },
  { id: 'ae2:item_storage_cell_1k', name: '1k ME Item Storage Cell' },
  { id: 'ae2:item_storage_cell_4k', name: '4k ME Item Storage Cell' },
  { id: 'ae2:fluid_storage_cell_1k', name: '1k ME Fluid Storage Cell' },
  { id: 'ae2:fluid_storage_cell_4k', name: '4k ME Fluid Storage Cell' },
  { id: 'ae2:wireless_terminal', name: 'Wireless Terminal' },
  { id: 'ae2:wireless_crafting_terminal', name: 'Wireless Crafting Terminal' },
]

const COLORED_ITEMS: { id: string; name: string }[] = [
  { id: 'gtceu:lv_energy_hatch', name: '4安§7LV§r能源仓' },
  { id: 'gtceu:mv_energy_hatch', name: '4安§bMV§r能源仓' },
  { id: 'gtceu:hv_energy_hatch', name: '4安§6HV§r能源仓' },
  { id: 'gtceu:ev_energy_hatch', name: '4安§5EV§r能源仓' },
  { id: 'gtceu:tin_ingot', name: '§7锡锭' },
  { id: 'gtceu:steel_ingot', name: '§8钢锭' },
  { id: 'gtceu:aluminium_ingot', name: '§b铝锭' },
  { id: 'gtceu:titanium_ingot', name: '§d钛锭' },
  { id: 'gtceu:tungsten_ingot', name: '§e钨锭' },
  { id: 'gtceu:platinum_ingot', name: '§3铂锭' },
]

const FLUIDS: { id: string; name: string }[] = [
  { id: 'minecraft:water', name: 'Water' },
  { id: 'minecraft:lava', name: 'Lava' },
  { id: 'minecraft:milk', name: 'Milk' },
  { id: 'ae2:crystal_resonance_generator_fuel', name: 'Crystal Resonance Fuel' },
  { id: 'gtceu:steam', name: 'Steam' },
  { id: 'gtceu:oxygen', name: 'Oxygen' },
  { id: 'gtceu:hydrogen', name: 'Hydrogen' },
  { id: 'gtceu:nitrogen', name: 'Nitrogen' },
  { id: 'gtceu:chlorine', name: 'Chlorine' },
  { id: 'gtceu:lubricant', name: 'Lubricant' },
  { id: 'gtceu:sulfuric_acid', name: 'Sulfuric Acid' },
  { id: 'gtceu:hydrochloric_acid', name: 'Hydrochloric Acid' },
  { id: 'gtceu:nitric_acid', name: 'Nitric Acid' },
  { id: 'gtceu:molten_iron', name: 'Molten Iron' },
  { id: 'gtceu:molten_gold', name: 'Molten Gold' },
  { id: 'gtceu:molten_copper', name: 'Molten Copper' },
  { id: 'gtceu:molten_tin', name: 'Molten Tin' },
  { id: 'gtceu:molten_steel', name: 'Molten Steel' },
  { id: 'gtceu:molten_aluminium', name: 'Molten Aluminium' },
  { id: 'gtceu:molten_titanium', name: 'Molten Titanium' },
  { id: 'mekanism:ethylene', name: 'Ethylene' },
  { id: 'mekanism:hydrogen', name: 'Liquid Hydrogen' },
  { id: 'mekanism:oxygen', name: 'Liquid Oxygen' },
  { id: 'mekanism:steam', name: 'Superheated Steam' },
  { id: 'mekanism:brine', name: 'Brine' },
  { id: 'mekanism:lithium', name: 'Lithium' },
  { id: 'mekanism:heavy_water', name: 'Heavy Water' },
  { id: 'create:honey', name: 'Honey' },
  { id: 'create:chocolate', name: 'Chocolate' },
  { id: 'create:tea', name: 'Builders Tea' },
]

function buildSeedItems(): Item[] {
  const rows: Item[] = []
  let i = 0
  for (const row of [...VANILLA_ITEMS, ...AE2_ITEMS, ...COLORED_ITEMS]) {
    const amt = amountFor(i, 'item')
    rows.push(
      item({
        id: row.id,
        displayName: row.name,
        amount: amt,
        craftable: seeded(i + 7) > 0.45 || amt === '0',
      }),
    )
    i += 1
  }
  // 批量填充：保证分页有多页
  for (let n = 1; n <= 120; n += 1) {
    const tier = ['lv', 'mv', 'hv', 'ev', 'iv'][n % 5]
    const mat = ['iron', 'copper', 'tin', 'bronze', 'steel', 'aluminium', 'titanium', 'tungsten'][n % 8]
    const form = ['ingot', 'dust', 'plate', 'rod', 'gear', 'nugget', 'wire', 'foil'][n % 8]
    const id = `gtceu:${mat}_${form}_${n}`
    const amt = amountFor(i, 'item')
    rows.push(
      item({
        id,
        displayName: `${mat} ${form} #${n}`.replace(/\b\w/g, (c) => c.toUpperCase()),
        amount: amt,
        craftable: seeded(i + 3) > 0.55 || amt === '0',
      }),
    )
    // 带颜色名样例穿插
    if (n % 17 === 0) {
      i += 1
      rows.push(
        item({
          id: `gtceu:${tier}_circuit_${n}`,
          displayName: `§e${tier.toUpperCase()}§r Circuit §7#${n}`,
          amount: amountFor(i, 'item'),
          craftable: true,
        }),
      )
    }
    i += 1
  }
  return rows
}

function buildSeedFluids(): Item[] {
  const rows: Item[] = []
  let i = 0
  for (const row of FLUIDS) {
    rows.push(
      fluid({
        id: row.id,
        displayName: row.name,
        amount: amountFor(i, 'fluid'),
        craftable: seeded(i + 11) > 0.82,
      }),
    )
    i += 1
  }
  for (let n = 1; n <= 40; n += 1) {
    const mat = ['iron', 'gold', 'copper', 'tin', 'lead', 'silver', 'nickel', 'zinc'][n % 8]
    rows.push(
      fluid({
        id: `gtceu:molten_${mat}_${n}`,
        displayName: `Molten ${mat} #${n}`.replace(/\b\w/g, (c) => c.toUpperCase()),
        amount: amountFor(i, 'fluid'),
        craftable: n % 9 === 0,
      }),
    )
    i += 1
  }
  return rows
}

const SEED_ITEMS = buildSeedItems()
const SEED_FLUIDS = buildSeedFluids()
const SEED_OTHERS: Item[] = [
  other({
    id: 'ae2lanuis:sample_matter',
    displayName: 'Sample Matter',
    amount: '128000',
    craftable: false,
  }),
  other({
    id: 'ae2lanuis:craftable_essence',
    displayName: 'Craftable Essence',
    amount: '0',
    craftable: true,
  }),
]

/** 去重：同 id 保留先出现的手写/种子行 */
function dedupeById(list: Item[]): Item[] {
  const seen = new Set<string>()
  const out: Item[] = []
  for (const it of list) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    out.push(it)
  }
  return out
}

export const mockItems: Item[] = dedupeById([...SEED_ITEMS, ...SEED_FLUIDS, ...SEED_OTHERS])

/** 目录含零库存可合成项 */
export const mockCatalog: Item[] = mockItems.filter((i) => i.craftable)

function patternItem(id: string, name: string, amount = '1'): Item {
  return item({ id, displayName: name, amount, craftable: true })
}

/** 假供应器：2～3 组，便于 Patterns Tab 分组联调 */
const PROVIDER_A: PatternProvider = {
  id: 'pp-overworld-main',
  name: 'Molecular Assembler',
  pos: { x: 64, y: 72, z: -12, dimension: 'minecraft:overworld' },
  priority: 1,
  targets: [
    {
      name: 'Molecular Assembler',
      blockId: 'ae2:molecular_assembler',
      side: 'north',
      pos: { x: 64, y: 72, z: -13, dimension: 'minecraft:overworld' },
    },
  ],
}
const PROVIDER_B: PatternProvider = {
  id: 'pp-overworld-auto',
  name: 'Auto-craft Bay',
  pos: { x: 70, y: 72, z: -8, dimension: 'minecraft:overworld' },
  priority: 2,
  targets: [
    {
      name: 'Inscriber',
      blockId: 'ae2:inscriber',
      side: 'east',
      pos: { x: 71, y: 72, z: -8, dimension: 'minecraft:overworld' },
    },
  ],
}
const PROVIDER_C: PatternProvider = {
  id: 'pp-nether-forge',
  name: 'Blast Furnace Line',
  pos: { x: 12, y: 80, z: 40, dimension: 'minecraft:the_nether' },
  priority: 3,
  targets: [
    {
      name: 'Blast Furnace',
      blockId: 'minecraft:blast_furnace',
      side: 'south',
      pos: { x: 12, y: 80, z: 41, dimension: 'minecraft:the_nether' },
    },
  ],
}

function withProvider(fingerprint: string, provider: PatternProvider, rest: Omit<Pattern, 'id' | 'provider'>): Pattern {
  return { ...rest, id: `${fingerprint}@${provider.id}`, provider }
}

/** 假样板：覆盖各 mode + 多供应器分组 */
export const mockPatterns: Pattern[] = [
  withProvider('fp-fluix', PROVIDER_A, {
    name: 'Fluix Crystal',
    mode: 'crafting',
    slotIndex: 0,
    encoder: 'Lanuis',
    recipeId: 'ae2:misc/fluixcrystal',
    craftingShape: 'shapeless',
    primaryOutput: patternItem('ae2:fluix_crystal', 'Fluix Crystal', '2'),
    outputs: [patternItem('ae2:fluix_crystal', 'Fluix Crystal', '2')],
    inputs: [
      {
        item: patternItem('ae2:certus_quartz_crystal', 'Certus Quartz Crystal', '1'),
        multiplier: '1',
        alternatives: [patternItem('ae2:charged_certus_quartz_crystal', 'Charged Certus Quartz Crystal', '1')],
      },
      { item: patternItem('minecraft:quartz', 'Nether Quartz', '1'), multiplier: '1' },
      { item: patternItem('minecraft:redstone', 'Redstone Dust', '1'), multiplier: '1' },
    ],
    substitute: true,
    substituteFluids: false,
    definition: patternItem('ae2:crafting_pattern', 'Crafting Pattern', '1'),
  }),
  withProvider('fp-silicon', PROVIDER_A, {
    name: 'Advanced Circuit MV',
    mode: 'processing',
    slotIndex: 1,
    encoder: 'Steve',
    primaryOutput: patternItem('ae2:silicon', 'Silicon', '1'),
    outputs: [patternItem('ae2:silicon', 'Silicon', '1')],
    inputs: [{ item: patternItem('ae2:certus_quartz_dust', 'Certus Quartz Dust', '1'), multiplier: '1' }],
    substitute: false,
    substituteFluids: false,
    definition: patternItem('ae2:processing_pattern', 'Processing Pattern', '1'),
  }),
  withProvider('fp-logic', PROVIDER_B, {
    name: 'Logic Processor',
    mode: 'processing',
    slotIndex: 2,
    encoder: 'Alex',
    primaryOutput: patternItem('ae2:logic_processor', 'Logic Processor', '1'),
    outputs: [patternItem('ae2:logic_processor', 'Logic Processor', '1')],
    inputs: [
      { item: patternItem('ae2:printed_logic_processor', 'Printed Logic Circuit', '1'), multiplier: '1' },
      { item: patternItem('ae2:printed_silicon', 'Printed Silicon', '1'), multiplier: '1' },
      { item: patternItem('minecraft:redstone', 'Redstone Dust', '1'), multiplier: '1' },
    ],
    substitute: false,
    substituteFluids: false,
    definition: patternItem('ae2:processing_pattern', 'Processing Pattern', '1'),
  }),
  withProvider('fp-stone', PROVIDER_B, {
    name: 'Stone Bricks',
    mode: 'stonecutting',
    slotIndex: 0,
    recipeId: 'minecraft:stone_bricks',
    primaryOutput: patternItem('minecraft:stone_bricks', 'Stone Bricks', '1'),
    outputs: [patternItem('minecraft:stone_bricks', 'Stone Bricks', '1')],
    inputs: [{ item: patternItem('minecraft:stone', 'Stone', '1'), multiplier: '1' }],
    substitute: false,
    substituteFluids: false,
    definition: patternItem('ae2:stonecutting_pattern', 'Stonecutting Pattern', '1'),
  }),
  withProvider('fp-smooth-sky', PROVIDER_B, {
    name: 'Smooth Sky Stone',
    mode: 'other',
    slotIndex: 3,
    craftingShape: 'shaped',
    recipeId: 'ae2:decorative/smooth_sky_stone_block',
    encoder: 'Lanuis',
    primaryOutput: patternItem('ae2:smooth_sky_stone_block', 'Smooth Sky Stone', '1'),
    outputs: [patternItem('ae2:smooth_sky_stone_block', 'Smooth Sky Stone', '1')],
    inputs: [{ item: patternItem('ae2:sky_stone_block', 'Sky Stone', '1'), multiplier: '1' }],
    substitute: false,
    substituteFluids: false,
    definition: patternItem('ae2:crafting_pattern', 'Crafting Pattern', '1'),
  }),
  withProvider('fp-netherite', PROVIDER_C, {
    name: 'Netherite Ingot',
    mode: 'smithing',
    slotIndex: 0,
    encoder: 'Alex',
    primaryOutput: patternItem('minecraft:netherite_ingot', 'Netherite Ingot', '1'),
    outputs: [patternItem('minecraft:netherite_ingot', 'Netherite Ingot', '1')],
    inputs: [
      { item: patternItem('minecraft:netherite_scrap', 'Netherite Scrap', '4'), multiplier: '4' },
      { item: patternItem('minecraft:gold_ingot', 'Gold Ingot', '4'), multiplier: '4' },
    ],
    substitute: false,
    substituteFluids: false,
    definition: patternItem('ae2:smithing_table_pattern', 'Smithing Table Pattern', '1'),
  }),
]

export const mockJobs: CraftJob[] = [
  {
    cpuName: 'Crafting CPU #1',
    busy: true,
    status: 'crafting',
    detail: 'ae2:fluix_crystal x64',
    progress: '24',
    totalItems: '64',
    progressPercent: 37.5,
    crafted: '24',
    requested: '64',
    elapsedNanos: '125000000000',
    output: {
      key: 'item:ae2:fluix_crystal',
      id: 'ae2:fluix_crystal',
      displayName: 'Fluix Crystal',
      amount: '64',
      craftable: true,
      iconUrl: '/api/v1/icons/item/ae2/fluix_crystal',
    },
    entries: [
      {
        item: {
          key: 'item:ae2:fluix_crystal',
          id: 'ae2:fluix_crystal',
          displayName: 'Fluix Crystal',
          amount: '40',
          craftable: true,
          iconUrl: '/api/v1/icons/item/ae2/fluix_crystal',
        },
        stored: '8',
        active: '16',
        pending: '16',
      },
      {
        item: {
          key: 'item:ae2:certus_quartz_crystal',
          id: 'ae2:certus_quartz_crystal',
          displayName: 'Certus Quartz Crystal',
          amount: '32',
          craftable: true,
          iconUrl: '/api/v1/icons/item/ae2/certus_quartz_crystal',
        },
        stored: '12',
        active: '8',
        pending: '12',
      },
      {
        item: {
          key: 'item:minecraft:redstone',
          id: 'minecraft:redstone',
          displayName: 'Redstone',
          amount: '20',
          craftable: false,
          iconUrl: '/api/v1/icons/item/minecraft/redstone',
        },
        stored: '20',
        active: '0',
        pending: '0',
      },
    ],
  },
  {
    cpuName: 'Crafting CPU #2',
    busy: true,
    status: 'crafting',
    detail: 'gtceu:steel_ingot x256',
    progress: '80',
    totalItems: '256',
    progressPercent: 31.25,
    crafted: '80',
    requested: '256',
    elapsedNanos: '480000000000',
    output: {
      key: 'item:gtceu:steel_ingot',
      id: 'gtceu:steel_ingot',
      displayName: 'Steel Ingot',
      amount: '256',
      craftable: true,
      iconUrl: '/api/v1/icons/item/gtceu/steel_ingot',
    },
    entries: [
      {
        item: {
          key: 'item:gtceu:steel_ingot',
          id: 'gtceu:steel_ingot',
          displayName: 'Steel Ingot',
          amount: '176',
          craftable: true,
          iconUrl: '/api/v1/icons/item/gtceu/steel_ingot',
        },
        stored: '16',
        active: '32',
        pending: '128',
      },
      {
        item: {
          key: 'item:minecraft:iron_ingot',
          id: 'minecraft:iron_ingot',
          displayName: 'Iron Ingot',
          amount: '64',
          craftable: false,
          iconUrl: '/api/v1/icons/item/minecraft/iron_ingot',
        },
        stored: '48',
        active: '16',
        pending: '0',
      },
    ],
  },
  {
    cpuName: 'Crafting CPU #3',
    busy: false,
    status: 'idle',
  },
  {
    cpuName: 'Crafting CPU #4',
    busy: false,
    status: 'idle',
  },
  {
    cpuName: 'Crafting CPU #5',
    busy: true,
    status: 'crafting',
    detail: 'minecraft:redstone x1024',
    progress: '512',
    totalItems: '1024',
    progressPercent: 50,
    crafted: '512',
    requested: '1024',
    elapsedNanos: '90000000000',
    output: {
      key: 'item:minecraft:redstone',
      id: 'minecraft:redstone',
      displayName: 'Redstone',
      amount: '1024',
      craftable: true,
      iconUrl: '/api/v1/icons/item/minecraft/redstone',
    },
    entries: [
      {
        item: {
          key: 'item:minecraft:redstone',
          id: 'minecraft:redstone',
          displayName: 'Redstone',
          amount: '512',
          craftable: true,
          iconUrl: '/api/v1/icons/item/minecraft/redstone',
        },
        stored: '64',
        active: '128',
        pending: '320',
      },
    ],
  },
]
