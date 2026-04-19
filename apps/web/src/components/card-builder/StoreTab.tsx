'use client'

import { useState } from 'react'
import type { JSX } from 'react'
import type { CardStoreProduct, PartialCardFields } from '@dotly/types'
import { getAccessToken } from '@/lib/auth/client'
import { apiPost } from '@/lib/api'

interface StoreTabProps {
  cardId: string
  fields: PartialCardFields
  onProductsChange: (products: CardStoreProduct[] | undefined) => void
}

export function StoreTab({ cardId, fields, onProductsChange }: StoreTabProps): JSX.Element {
  const products = Array.isArray(fields.products) ? fields.products.slice(0, 6) : []
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  function updateProducts(nextProducts: CardStoreProduct[]) {
    onProductsChange(nextProducts.length > 0 ? nextProducts : undefined)
  }

  async function uploadProductImage(index: number, file: File) {
    const resolvedType = file.type || 'image/webp'
    if (!resolvedType.startsWith('image/')) {
      throw new Error('Only image uploads are supported for store products.')
    }

    setUploadingIndex(index)
    try {
      const token = await getAccessToken()
      const uploadFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const { uploadUrl, publicUrl } = await apiPost<{ uploadUrl: string; publicUrl: string }>(
        `/cards/${cardId}/upload-url`,
        { filename: uploadFilename, contentType: resolvedType, fileSizeBytes: file.size },
        token,
      )
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': resolvedType },
      })
      if (!res.ok) throw new Error('Upload failed')

      const next = [...products]
      next[index] = { ...next[index]!, imageUrl: publicUrl }
      updateProducts(next)
    } finally {
      setUploadingIndex(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white/70 p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Store surface
        </p>
        <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900">
          Build a lightweight storefront
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Add up to 6 products for your dedicated store page. Use this for packaged digital goods or
          simple physical products.
        </p>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white/70 p-5 space-y-4">
        {products.length === 0 && (
          <p className="text-sm text-slate-500">
            No products yet. Add your first store item to publish a simple store.
          </p>
        )}

        {products.map((product, index) => (
          <div
            key={product.id || index}
            className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={product.name}
                onChange={(e) => {
                  const next = [...products]
                  next[index] = { ...product, name: e.target.value.slice(0, 160) }
                  updateProducts(next)
                }}
                placeholder="Product name"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
              <input
                type="text"
                value={product.priceUsdt}
                onChange={(e) => {
                  const next = [...products]
                  next[index] = { ...product, priceUsdt: e.target.value.slice(0, 32) }
                  updateProducts(next)
                }}
                placeholder="Price"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <input
              type="text"
              value={product.imageUrl ?? ''}
              onChange={(e) => {
                const next = [...products]
                next[index] = { ...product, imageUrl: e.target.value.slice(0, 500) }
                updateProducts(next)
              }}
              placeholder="Product image URL (uploaded Dotly asset recommended)"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    void uploadProductImage(index, file)
                    e.currentTarget.value = ''
                  }}
                />
                {uploadingIndex === index ? 'Uploading image…' : 'Upload image'}
              </label>
              {product.imageUrl && (
                <span className="text-xs text-slate-400">Uploaded image ready</span>
              )}
            </div>
            <textarea
              rows={3}
              value={product.description ?? ''}
              onChange={(e) => {
                const next = [...products]
                next[index] = { ...product, description: e.target.value.slice(0, 400) }
                updateProducts(next)
              }}
              placeholder="What the buyer gets"
              className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                value={product.variantLabel ?? ''}
                onChange={(e) => {
                  const next = [...products]
                  next[index] = { ...product, variantLabel: e.target.value.slice(0, 80) }
                  updateProducts(next)
                }}
                placeholder="Variant label"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
              <input
                type="number"
                min="0"
                value={product.inventoryCount ?? ''}
                onChange={(e) => {
                  const next = [...products]
                  next[index] = {
                    ...product,
                    inventoryCount: e.target.value === '' ? undefined : Number(e.target.value),
                  }
                  updateProducts(next)
                }}
                placeholder="Inventory"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
              <input
                type="text"
                value={product.shippingNote ?? ''}
                onChange={(e) => {
                  const next = [...products]
                  next[index] = { ...product, shippingNote: e.target.value.slice(0, 120) }
                  updateProducts(next)
                }}
                placeholder="Shipping / delivery note"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={!!product.highlighted}
                  onChange={(e) => {
                    const next = products.map((item, itemIndex) => ({
                      ...item,
                      highlighted: itemIndex === index ? e.target.checked : false,
                    }))
                    updateProducts(next)
                  }}
                />
                Feature this product
              </label>
              <button
                type="button"
                onClick={() =>
                  updateProducts(products.filter((_, itemIndex) => itemIndex !== index))
                }
                className="text-sm font-semibold text-red-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {products.length < 6 && (
          <button
            type="button"
            onClick={() =>
              updateProducts([
                ...products,
                {
                  id: `product-${Date.now().toString(36)}`,
                  name: '',
                  priceUsdt: '',
                },
              ])
            }
            className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Add store product
          </button>
        )}
      </div>
    </div>
  )
}
