import { supabase } from './supabaseClient'

// 🔹 DAILY INFO
export const DailyInfo = {
  async getAll() {
    const { data, error } = await supabase.from('daily_info').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  async insert(entry) {
    const { data, error } = await supabase.from('daily_info').insert(entry).select().single()
    if (error) throw error
    return data
  },
  async update(id, changes) {
    const { data, error } = await supabase.from('daily_info').update(changes).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async delete(id) {
    const { error } = await supabase.from('daily_info').delete().eq('id', id)
    if (error) throw error
  }
}

// 🔹 MISSING PRODUCT
export const MissingProduct = {
  async getAll() {
    const { data, error } = await supabase.from('missing_product').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  async insert(product) {
    const { data, error } = await supabase.from('missing_product').insert(product).select().single()
    if (error) throw error
    return data
  },
  async update(id, changes) {
    const { data, error } = await supabase.from('missing_product').update(changes).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async delete(id) {
    const { error } = await supabase.from('missing_product').delete().eq('id', id)
    if (error) throw error
  }
}

// 🔹 RETURN ITEMS / DOCUMENTS
export const ReturnItem = {
  async update(id, changes) {
    const { data, error } = await supabase.from('return_item').update(changes).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async delete(id) {
    const { error } = await supabase.from('return_item').delete().eq('id', id)
    if (error) throw error
  }
}

export const ReturnDocument = {
  async insert(doc) {
    const { data, error } = await supabase.from('return_document').insert(doc).select().single()
    if (error) throw error
    return data
  },
  async delete(id) {
    const { error } = await supabase.from('return_document').delete().eq('id', id)
    if (error) throw error
  }
}

// 🔹 EMPLOYEE
export const Employee = {
  async getAll() {
    const { data, error } = await supabase.from('employee').select('*').order('name')
    if (error) throw error
    return data
  }
}
