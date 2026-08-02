export interface LocationRow {
  id: string
  name: string
  parent_id: string | null
  created_at: string
}

export interface BinRow {
  id: string
  number: string
  title: string
  description: string
  tags: string[]
  items: string[]
  photos: string[]
  location_id: string | null
  created_at: string
  updated_at: string
}

export interface ExtractedItemsResponse {
  items: string[]
  usage: {
    input_tokens: number
    output_tokens: number
  }
  estimated_cost_usd: number
}
