import type { Product } from '../lib/api';
import { formatBRL } from '../utils';

interface Props {
  products: Product[];
  isDarkMode: boolean;
  canCreateProduct: boolean;
  canUpdateProduct: boolean;
  canDeleteProduct: boolean;
  canCreateSale: boolean;
  onOpenNewProductModal: () => void;
  onOpenQuickSale: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export function LojaTab({ products, isDarkMode, canCreateProduct, canUpdateProduct, canDeleteProduct, canCreateSale, onOpenNewProductModal, onOpenQuickSale, onEditProduct, onDeleteProduct }: Props) {
  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-sm font-bold">Produtos ({products.length})</h3>
        <div className="flex flex-wrap gap-2">{canCreateSale && <button onClick={onOpenQuickSale} className="px-4 py-2 rounded-xl text-xs font-bold border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">Registrar venda</button>}{canCreateProduct && <button onClick={onOpenNewProductModal} className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950">+ Novo Produto</button>}</div>
      </div>
      <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
        <table className="w-full text-left text-xs">
          <thead className={isDarkMode ? 'bg-slate-900/80' : 'bg-slate-50'}>
            <tr className="text-slate-400 uppercase text-[10px] font-bold">
              <th className="p-3">Nome</th><th className="p-3">Categoria</th><th className="p-3 text-right">Preço</th><th className="p-3 text-center">Estoque</th><th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-bold text-slate-200">{p.name}</td>
                <td className="p-3 text-slate-400">{p.category}</td>
                <td className="p-3 text-right font-bold text-emerald-400">{formatBRL(p.price)}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.stock <= p.min_stock ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{p.stock} un.</span>
                </td>
                <td className="p-3 text-right whitespace-nowrap">{canUpdateProduct && <button onClick={() => onEditProduct(p)} className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 mr-1">Editar</button>}{canDeleteProduct && <button onClick={() => onDeleteProduct(p.id)} className="px-2.5 py-1 rounded-lg text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400">Remover</button>}</td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum produto</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
