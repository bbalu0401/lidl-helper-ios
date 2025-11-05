import OpenAI from "openai"
import { supabase } from "./supabaseClient"

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // frontenden is használható
})

// 🔹 Fájl feltöltés Supabase Storage-be
export async function uploadFileToStorage(file, bucket = 'uploads') {
  const fileName = `${Date.now()}-${file.name}`
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file)
  if (error) throw error
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName)
  return urlData.publicUrl
}

// 🔹 OCR + AI elemzés
export async function extractDataWithOpenAI(fileUrl, jsonSchema) {
  const prompt = `
  A következő képről strukturált adatot kérek a megadott JSON schema alapján:
  ${JSON.stringify(jsonSchema, null, 2)}
  Válasz kizárólag JSON formátumban legyen!
  Kép: ${fileUrl}
  `

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Te egy OCR és adatkinyerő asszisztens vagy." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1
  })

  try {
    const text = response.choices[0].message.content
    const json = JSON.parse(text)
    return { status: "success", output: json }
  } catch (err) {
    console.error("Parse error:", err)
    return { status: "error", output: null }
  }
}

// 🔹 Szöveges LLM hívás
export async function invokeLLM(prompt) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  })
  return response.choices[0].message.content
}

// 🔹 Kép generálás (pl. borítóhoz)
export async function generateImage(prompt) {
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024"
  })
  return response.data[0].url
}
