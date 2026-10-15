import { useState, useEffect } from 'react';
import type { Product } from '../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
  productToEdit: Product | null;
  isDarkMode: boolean;
}

export function ProductModal({ isOpen, onClose, onSave, productToEdit }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Suplementos');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('0');
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('3');

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name); setCategory(productToEdit.category); setPrice(String(productToEdit.price));
      setCost(String(productToEdit.cost)); setStock(String(productToEdit.stock)); setMinStock(String(productToEdit.min_stock));
    } else {
      setName(''); setCategory('Suplementos'); setPrice(''); setCost('0'); setStock('0'); setMinStock('3');
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    onSave({ name: name.trim(), category, price: parseFloat(price), cost: parseFloat(cost) || 0, stock: parseInt(stock) || 0, min_stock: parseInt(minStock) || 3 });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-3">
        <h4 className="font-bold text-white text-sm">{productToEdit ? 'Editar' : 'Novo'} Produto</h4>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do produto" className="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100">
          <option value="Suplementos">Suplementos</option><option value="Bebidas">Bebidas</option><option value="Acessórios">Acessórios</option><option value="Vestuário">Vestuário</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input required min="0.01" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Preço venda" className="text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" />
          <input min="0" type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Custo" className="text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input min="0" step="1" type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Estoque" className="text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" />
          <input min="0" step="1" type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="Estoque mín." className="text-xs rounded-xl px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-100" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-400">Cancelar</button>
          <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950">Salvar</button>
        </div>
      </form>
    </div>
  );
}
